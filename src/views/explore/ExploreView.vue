<template>
  <ion-page>
    <app-header title="Explore" :icon="compassOutline" />

    <!-- Map stays fixed -->
    <div style="position: relative;">
      <!-- Map container -->
      <div id="map"></div>
      <!-- FAB absolutely anchored inside the map container -->
      <ion-fab
          vertical="bottom"
          horizontal="end"
          slot="fixed"
          style="position: absolute; bottom: 20px; right: 20px; z-index: 10;"
      >
        <ion-fab-button color="carrot" @click="centerOnUser">
          <ion-icon style="color: var(--ion-color-light)" :icon="navigateCircleOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </div>

    <ion-toolbar style="--background: none;">
      <div style="display: flex;">
        <ion-searchbar
            class="search-explore"
            :debounce="1000"
            @ionInput="onSearchInput"
            style="flex-grow: 1; margin-right: 8px;"
            placeholder="Search places (e.g. Mosque)"
        ></ion-searchbar>

        <!-- Add Place button, only for contributors/admins -->
        <ion-button
            v-if="isContributor"
            @click="goToAddPlace"
            color="carrot"
            size="small"
            style="margin-right: 12px; margin-top: 12px;"
        >
          <ion-icon :icon="addOutline" />
        </ion-button>
      </div>
    </ion-toolbar>

    <ion-toolbar v-if="focusedPlaceId !== null" style="--background: none;">
      <div style="display:flex; align-items:center; gap:8px; padding:8px 16px;">
        <span>Showing 1 place</span>
        <ion-button size="small" fill="outline" @click="focusedPlaceId = null">Clear</ion-button>
      </div>
    </ion-toolbar>


    <!-- Place list scrolls -->
    <ion-content ref="contentRef">
      <div class="place-list">
        <ion-card
            v-for="place in sortedLocations"
            :key="place.id"
            :ref="el => { if (!cardRefs.value) cardRefs.value = {}; cardRefs.value[place.id] = el }"
            :class="{ 'active-card': selectedPlace?.id === place.id }"
            @click="selectPlace(place)"
        >
          <div style="display: flex; align-items: center;">
            <ion-thumbnail
                slot="start"
                style="width: 115px; height: 115px; border-radius: 10px; overflow: hidden;"
            >
              <img
                  loading="lazy"
                  :src="place.image || 'https://placehold.co/200x100'"
                  alt="thumbnail"
                  style="object-fit: cover; width: 100%; height: 100%; border-radius: 8px;"
                  @error="event => event.target.src = 'https://placehold.co/200x100'"
              />
            </ion-thumbnail>
            <div style="flex: 1; margin-left: 12px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <h5 class="title-text">{{ place.name }}</h5>
                <p class="type-text">
                  {{ place.type }}
                </p>
              </div>
              <div v-if="userLocation">📍 {{ formatKm(getDistanceInKm(place.position)) }} km away</div>
            </div>
          </div>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>


<script setup lang="ts">
import {
  IonPage,
  IonContent,
  IonToolbar,
  IonSearchbar,
  IonIcon,
  IonFab,
  IonFabButton,
  IonCard,
  IonThumbnail,
    IonButton,
    onIonViewWillEnter
} from '@ionic/vue'
import {compassOutline, navigateCircleOutline, addOutline } from 'ionicons/icons'
import {ref, onMounted, nextTick, computed} from 'vue'
import { useRouter } from 'vue-router'

import {
  supabase
} from '@/plugins/supabaseClient'

const userLocation = ref(null)
const isContributor = ref(false)
const router = useRouter()

import type { HTMLIonContentElement } from '@ionic/core/components'
import { Loader } from '@googlemaps/js-api-loader'

const searchQuery = ref('')
let mapInstance = null
let allLocations = []
let advancedMarkerLib = null
const markerMap = new Map<number, any>()
let infoWindow = null
const selectedPlace = ref(null)

const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  version: 'weekly',
  libraries: ['marker']
})

const cardRefs = ref<Record<number, any>>({})

const getDomEl = (node: any) => (node?.$el ?? node) as HTMLElement

const contentRef = ref<any>(null)

const focusedPlaceId = ref<number | null>(null)

const scrollCardIntoView = async (id: number) => {
  await nextTick()
  const el = (contentRef.value?.$el ?? contentRef.value) as HTMLIonContentElement | undefined
  if (!el) return
  const scrollEl = await el.getScrollElement()

  const cardNode = cardRefs.value[id]
  if (!scrollEl || !cardNode) return
  const cardEl = getDomEl(cardNode)

  const cardRect = cardEl.getBoundingClientRect()
  const containerRect = scrollEl.getBoundingClientRect()
  const y = scrollEl.scrollTop + (cardRect.top - containerRect.top) - 12
  scrollEl.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
}

const loadRole = async () => {            // <-- NEW
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

  if (!error && (data?.role === 'admin' || data?.role === 'contributor')) {
    isContributor.value = true
  }
}

const getDistanceInKm = (locPos) => {
  if (!userLocation.value) return Number.POSITIVE_INFINITY
  const R = 6371
  const dLat = (locPos.lat - userLocation.value.lat) * Math.PI / 180
  const dLon = (locPos.lng - userLocation.value.lng) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
      Math.cos(userLocation.value.lat * Math.PI/180) *
      Math.cos(locPos.lat * Math.PI/180) *
      Math.sin(dLon/2)**2
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) // number
}
const formatKm = (n) => (Number.isFinite(n) ? n.toFixed(2) : '–')

// Computed list of locations sorted by distance
const sortedLocations = computed(() => {
  // If a marker/card is focused, show only that one
  if (focusedPlaceId.value != null) {
    const p = locations.value.find(x => x.id === focusedPlaceId.value)
    return p ? [p] : []
  }

  const query = searchQuery.value?.toLowerCase().trim()
  if (!query) {
    return [...locations.value].sort((a, b) => getDistanceInKm(a.position) - getDistanceInKm(b.position))
  }

  const matched = locations.value.filter(loc => loc.name.toLowerCase().includes(query))
  const others  = locations.value.filter(loc => !loc.name.toLowerCase().includes(query))

  if (userLocation.value) {
    const byDist = (a,b)=> getDistanceInKm(a.position) - getDistanceInKm(b.position)
    matched.sort(byDist); others.sort(byDist)
  }
  return [...matched, ...others]
})


let lastPanTime = 0

const selectPlace = (place) => {
  focusedPlaceId.value = place.id
  selectedPlace.value = place

  // scroll the card into view
  scrollCardIntoView(place.id)

  if (!mapInstance || !place?.position) return

  lastPanTime = Date.now()
  mapInstance.panTo(place.position)
  const currentPanTime = lastPanTime

  setTimeout(() => {
    if (currentPanTime !== lastPanTime) return
    mapInstance.setZoom(15)

    const marker = markerMap.get(place.id)
    if (marker && infoWindow) {
      infoWindow.setContent(`
        <div>
          <strong>${place.name}</strong><br>
          ${place.type}<br>
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=${place.position.lat},${place.position.lng}"
            target="_blank" rel="noopener noreferrer"
            style="color: var(--ion-color-primary); text-decoration: none;"
          >Navigate</a>
        </div>
      `)
      infoWindow.open(mapInstance, marker)
      setTimeout(applyInfoWindowDarkClass, 50)
    }
  }, 400)
}

// Default center (Taipei)
const defaultCenter = { lat: 25.0343, lng: 121.5645 }

const locations = ref([])

const fetchLocations = async () => {
  const { data, error } = await supabase
      .from('locations')
      .select('id,name,type,lat,lng,image')  // ← include id

  if (error) { console.error(error); return }

  locations.value = data.map(loc => ({
    id: loc.id,
    name: loc.name,
    type: loc.type,
    position: { lat: loc.lat, lng: loc.lng },
    image: loc.image
  }))

  allLocations = locations.value
  initMarkers()
}

const initMarkers = () => {
  locations.value.forEach(loc => {
    const iconHTML = document.createElement('div')
    iconHTML.innerHTML = `<div class="custom-pin"></div><div class="custom-pin-dot"></div>`

    const markerInstance = new advancedMarkerLib.AdvancedMarkerElement({
      position: loc.position,
      map: mapInstance,
      content: iconHTML,
      title: `${loc.type}: ${loc.name}`
    })

    markerInstance.addListener('click', () => {
      if (searchQuery.value) searchQuery.value = ''  // clear search if any
      focusedPlaceId.value = loc.id                  // <-- focus
      selectPlace(loc)
    })

    markerMap.set(loc.id, markerInstance)
  })
}


const applyInfoWindowDarkClass = () => {
  const isDark = document.documentElement.classList.contains('ion-palette-dark')
  const iw = document.querySelector('.gm-style-iw-c')
  if (iw) {
    iw.classList.toggle('dark-infowindow', isDark)
  }
}

const initMap = async () => {

  const [{ Map }, marker] = await Promise.all([
    loader.importLibrary('maps'),
    loader.importLibrary('marker')
  ])
  advancedMarkerLib = marker

  mapInstance = new Map(document.getElementById('map'), {
    center: defaultCenter,
    zoom: 14,
    disableDefaultUI: true,
    mapId: 'a40f1ec0ad0afbbb12694f19',
    clickableIcons: false // ✅ Prevent built-in POI InfoWindow
  })

  allLocations = locations.value
  infoWindow = new google.maps.InfoWindow()
}

import { Geolocation } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'
import AppHeader from "@/components/AppHeader.vue";
const userMarker = ref(null)

const centerOnUser = async () => {
  try {
    const isNative = Capacitor.isNativePlatform()

    if (isNative) {
      const permission = await Geolocation.checkPermissions()
      if (permission.location !== 'granted') {
        const result = await Geolocation.requestPermissions()
        if (result.location !== 'granted') {
          alert('Location permission is required.')
          return
        }
      }
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true
    })

    const userLoc = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    }

    userLocation.value = userLoc
    mapInstance.panTo(userLoc)

    const dot = document.createElement('div')
    dot.className = 'user-location-dot'

    if (userMarker.value) {
      // just move it
      userMarker.value.position = userLoc
    } else {
      // create once
      userMarker.value = new google.maps.marker.AdvancedMarkerElement({
        position: userLoc,
        map: mapInstance,
        content: dot,
        title: 'You are here'
      })
    }

  } catch (err) {
    console.error(err)
    alert('Could not get location.')
  }
}

const onSearchInput = (event) => {
  focusedPlaceId.value = null                    // typing cancels focus
  searchQuery.value = event.detail.value
  searchPlace()
}


const searchPlace = () => {
  if (!searchQuery.value.trim() || !mapInstance) return

  const query = searchQuery.value.toLowerCase().trim()
  const matched = allLocations.find(loc =>
      loc.name.toLowerCase().includes(query)
  )

  if (matched) {
    mapInstance.panTo(matched.position)

    const existingMarker = markerMap.get(matched.id)

    if (existingMarker) {
      infoWindow.setContent(`
        <div>
          <strong>${matched.name}</strong><br>
          ${matched.type}<br>
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=${matched.position.lat},${matched.position.lng}"
            target="_blank"
            rel="noopener noreferrer"
            style="color: var(--ion-color-primary); text-decoration: none;"
          >
            Navigate
          </a>
        </div>
      `)
      infoWindow.open(mapInstance, existingMarker)
      setTimeout(applyInfoWindowDarkClass, 50)

    }

    selectedPlace.value = matched
    scrollCardIntoView(matched.id)
  }
}

onIonViewWillEnter(async () => {
  if (!userLocation.value) {
    await initMap()
    await fetchLocations()
    await centerOnUser()
    await loadRole()
  }
})

onMounted(async () => {
  const observer = new MutationObserver(() => {
    applyInfoWindowDarkClass()
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})

const goToAddPlace = () => {
  router.push('/explore/add')
}
</script>

<style>
.place-list {
  padding: 0 16px 80px; /* padding bottom to prevent being hidden behind tabs */
}

.title-text {
  font-size: 21px;
  margin-top: 3px;
  margin-bottom: 0;
}

.type-text {
  margin-top: 3px;
  color: var(--ion-color-medium);
  font-size: 14px;
  margin-bottom: 3px;
}

.active-card {
  border: 2px solid var(--ion-color-carrot);
}

.place-list {
  padding: 4px;
}

#map {
  margin: 16px 16px 0;
  padding: 10px;
  height: 45vh;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.gm-style {
  font: var(--ion-font-family);
}

/* Default style (light mode) */
.gm-style .gm-style-iw-c {
  color: var(--ion-color-dark);
}

/* Dark mode override */
.gm-style .gm-style-iw-c.dark-infowindow {
  color: var(--ion-color-light);
}

button.gm-ui-hover-effect {
  width: 24px !important;
  height: 24px !important;
}

button.gm-ui-hover-effect > span {
  position: absolute;
  left: 1px;
  top: 1px;
  background: var(--ion-color-medium) !important;
  width: 24px !important;
  height: 24px !important;
  margin: 0 !important;
}

.custom-pin {
  width: 24px;
  height: 24px;
  background: var(--ion-color-carrot);
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  position: relative;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.custom-pin-dot {
  width: 10px;
  height: 10px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 7px;
  left: 7px;
}

.user-location-dot {
  width: 16px;
  height: 16px;
  background: var(--ion-color-carrot); /* Google Blue */
  border-radius: 50%;
  border: 4px solid white;
  box-shadow: 0 0 0 4px rgba(66, 133, 244, 0.3);
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(216, 98, 13, 0.4); }
  100% { box-shadow: 0 0 0 10px rgba(66, 133, 244, 0); }
}

.user-location-dot {
  animation: pulse 1.5s infinite;
}

.search-explore {
  margin-top: 10px;
  margin-left: 5px;
  width: 96%;
  --border-radius: 10px;
  --box-shadow: 0 4px 12px rgba(124, 124, 124, 0.05);
}

</style>

