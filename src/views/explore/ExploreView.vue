<template>
  <ion-page>
    <app-header title="Explore" :icon="compassOutline" :showProfile="true" />
    <div v-if="isNative" id="ad-space-explore" style="height:60px;"></div>

    <!-- Web (desktop) AdSense banner -->
    <div v-else id="ad-space-explore" style="margin: 8px 0;">
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="ca-pub-9588373061537955"
           data-ad-slot="2307787840"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
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
            :ref="setCardRef(place.id)"
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
                  @error="onImageError"
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
declare global { interface Window { adsbygoogle: any[] } }

/* ---------------- Imports ---------------- */
import {
  IonPage, IonContent, IonToolbar, IonSearchbar, IonIcon, IonFab, IonFabButton,
  IonCard, IonThumbnail, IonButton, onIonViewWillEnter, onIonViewDidEnter
} from '@ionic/vue'
import { compassOutline, navigateCircleOutline, addOutline } from 'ionicons/icons'
import {ref, computed, nextTick, onMounted} from 'vue'
import type { ComponentPublicInstance, VNodeRef } from 'vue'
import { useRouter } from 'vue-router'
import { Loader } from '@googlemaps/js-api-loader'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { supabase } from '@/plugins/supabaseClient'
import AppHeader from "@/components/AppHeader.vue";

/* ---------------- Types ---------------- */
type LatLng = { lat: number; lng: number }
type Place = {
  id: number
  name: string
  type: string
  position: LatLng
  image?: string | null
}

// Local type for ion-content (no external import needed)
type HTMLIonContentElement = HTMLElement & {
  getScrollElement: () => Promise<HTMLElement>
}

/* ---------------- Constants ---------------- */
const MAP_ID = 'a40f1ec0ad0afbbb12694f19'
const DEFAULT_CENTER: LatLng = { lat: 25.0343, lng: 121.5645 }
const PLACEHOLDER = 'https://placehold.co/200x100'

/* ---------------- State ---------------- */
const router = useRouter()

const isContributor = ref(false)
const userLocation = ref<LatLng | null>(null)

const locations = ref<Place[]>([])
const selectedPlace = ref<Place | null>(null)
const focusedPlaceId = ref<number | null>(null)

const cardRefs = ref<Record<number, Element | ComponentPublicInstance | null>>({})
const contentRef = ref<HTMLIonContentElement | null>(null)

const searchQuery = ref('')
const isNative = ref(Capacitor.isNativePlatform())

/* Google Maps runtime objects */
let mapInstance: google.maps.Map | null = null
let advancedMarkerLib: typeof google.maps.marker | null = null
let infoWindow: google.maps.InfoWindow | null = null
const markerMap = new Map<number, google.maps.marker.AdvancedMarkerElement>()
const userMarker = ref<google.maps.marker.AdvancedMarkerElement | null>(null)

let lastPanTime = 0

/* ---------------- Utilities ---------------- */
const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  version: 'weekly',
  libraries: ['marker']
})

const getDomEl = (node: Element | ComponentPublicInstance | null | undefined) =>
    ((node as ComponentPublicInstance | null)?.$el ?? node) as HTMLElement | null

const formatKm = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '–')

const getDistanceInKm = (locPos: LatLng) => {
  if (!userLocation.value) return Number.POSITIVE_INFINITY
  const R = 6371
  const dLat = (locPos.lat - userLocation.value.lat) * Math.PI / 180
  const dLon = (locPos.lng - userLocation.value.lng) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(userLocation.value.lat * Math.PI / 180) *
      Math.cos(locPos.lat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

const setCardRef = (id: number): VNodeRef =>
    ((el: Element | ComponentPublicInstance | null) => {
      cardRefs.value[id] = el
    }) as VNodeRef

const onImageError = (e: Event) => {
  const img = e.currentTarget as HTMLImageElement | null
  if (!img) return
  img.onerror = null
  img.src = PLACEHOLDER
}

const buildInfoHtml = (p: Place) => `
  <div>
    <strong>${p.name}</strong><br>
    ${p.type}<br>
    <a
      href="https://www.google.com/maps/dir/?api=1&destination=${p.position.lat},${p.position.lng}"
      target="_blank" rel="noopener noreferrer"
      style="color: var(--ion-color-primary); text-decoration: none;"
    >Navigate</a>
  </div>
`

const applyInfoWindowDarkClass = () => {
  const isDark = document.documentElement.classList.contains('ion-palette-dark')
  const iw = document.querySelector('.gm-style-iw-c')
  if (iw) iw.classList.toggle('dark-infowindow', isDark)
}

// Resolve the actual host element from a ref that may be a component or an element
const asIonContentEl = (node: unknown): HTMLIonContentElement | null => {
  if (!node) return null
  const maybeCmp = node as { $el?: Element }
  const host = (maybeCmp && '$el' in maybeCmp && maybeCmp.$el) ? maybeCmp.$el : (node as Element)
  return host as HTMLIonContentElement
}

const scrollCardIntoView = async (id: number) => {
  await nextTick()

  const host = asIonContentEl(contentRef.value)
  if (!host) return

  const scrollEl = await host.getScrollElement()

  const rawNode = cardRefs.value[id]
  if (!rawNode) return
  const cardEl = getDomEl(rawNode)
  if (!cardEl) return

  const cardRect = cardEl.getBoundingClientRect()
  const containerRect = scrollEl.getBoundingClientRect()
  const y = scrollEl.scrollTop + (cardRect.top - containerRect.top) - 12
  scrollEl.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
}

/* ---------------- Roles ---------------- */
const loadRole = async () => {
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

/* ---------------- Data ---------------- */
const fetchLocations = async () => {
  const { data, error } = await supabase
      .from('locations')
      .select('id,name,type,lat,lng,image')
  if (error) { console.error(error); return }

  locations.value = (data ?? []).map((loc) => ({
    id: loc.id,
    name: loc.name,
    type: loc.type,
    position: { lat: loc.lat, lng: loc.lng },
    image: loc.image
  }))

  initMarkers() // after map ready
}

/* ---------------- Map ---------------- */
const initMap = async () => {
  const [{ Map }, marker] = await Promise.all([
    loader.importLibrary('maps'),
    loader.importLibrary('marker')
  ])
  advancedMarkerLib = marker
  mapInstance = new Map(document.getElementById('map') as HTMLElement, {
    center: DEFAULT_CENTER,
    zoom: 14,
    disableDefaultUI: true,
    mapId: MAP_ID,
    clickableIcons: false
  })
  infoWindow = new google.maps.InfoWindow()
}

const initMarkers = () => {
  if (!mapInstance || !advancedMarkerLib) return
  // clear any previous markers if you ever refetch:
  markerMap.forEach(m => m.map = null)
  markerMap.clear()

  locations.value.forEach((loc) => {
    const iconHTML = document.createElement('div')
    iconHTML.innerHTML = `<div class="custom-pin"></div><div class="custom-pin-dot"></div>`

    const marker = new advancedMarkerLib!.AdvancedMarkerElement({
      position: loc.position,
      map: mapInstance!,
      content: iconHTML,
      title: `${loc.type}: ${loc.name}`
    })

    marker.addListener('click', () => {
      if (searchQuery.value && !loc.name.toLowerCase().includes(searchQuery.value.toLowerCase())) {
        searchQuery.value = '' // clear filter so the card exists in the list
      }
      selectPlace(loc)
    })

    markerMap.set(loc.id, marker)
  })
}

/* ---------------- Interactions ---------------- */
const selectPlace = (place: Place) => {
  focusedPlaceId.value = place.id
  selectedPlace.value = place
  scrollCardIntoView(place.id)

  if (!mapInstance) return

  lastPanTime = Date.now()
  mapInstance.panTo(place.position)
  const myPan = lastPanTime

  setTimeout(() => {
    if (myPan !== lastPanTime || !mapInstance) return
    mapInstance.setZoom(15)

    const m = markerMap.get(place.id)
    if (m && infoWindow) {
      infoWindow.setContent(buildInfoHtml(place))
      infoWindow.open(mapInstance, m)
      setTimeout(applyInfoWindowDarkClass, 50)
    }
  }, 400)
}

const centerOnUser = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      const p = await Geolocation.checkPermissions()
      if (p.location !== 'granted') {
        const r = await Geolocation.requestPermissions()
        if (r.location !== 'granted') {
          alert('Location permission is required.')
          return
        }
      }
    }

    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
    const userLoc: LatLng = { lat: position.coords.latitude, lng: position.coords.longitude }
    userLocation.value = userLoc
    mapInstance?.panTo(userLoc)

    const dot = document.createElement('div')
    dot.className = 'user-location-dot'

    if (userMarker.value) {
      userMarker.value.position = userLoc
    } else {
      userMarker.value = new google.maps.marker.AdvancedMarkerElement({
        position: userLoc,
        map: mapInstance!,
        content: dot,
        title: 'You are here'
      })
    }
  } catch (err) {
    console.error(err)
    alert('Could not get location.')
  }
}

const onSearchInput = (event: CustomEvent) => {
  focusedPlaceId.value = null // typing cancels focus mode
  searchQuery.value = (event.detail?.value ?? '') as string
  searchPlace()
}

const searchPlace = () => {
  if (!searchQuery.value.trim() || !mapInstance) return
  const q = searchQuery.value.toLowerCase().trim()
  const matched = locations.value.find(loc => loc.name.toLowerCase().includes(q))
  if (!matched) return

  mapInstance.panTo(matched.position)
  const marker = markerMap.get(matched.id)
  if (marker && infoWindow) {
    infoWindow.setContent(buildInfoHtml(matched))
    infoWindow.open(mapInstance, marker)
    setTimeout(applyInfoWindowDarkClass, 50)
  }
  selectedPlace.value = matched
  scrollCardIntoView(matched.id)
}

/* ---------------- Derived ---------------- */
const sortedLocations = computed(() => {
  // Focused mode: show only the selected place
  if (focusedPlaceId.value != null) {
    const p = locations.value.find(x => x.id === focusedPlaceId.value)
    return p ? [p] : []
  }

  const q = searchQuery.value?.toLowerCase().trim()
  const base = q
      ? [
        ...locations.value.filter(l => l.name.toLowerCase().includes(q)),
        ...locations.value.filter(l => !l.name.toLowerCase().includes(q))
      ]
      : [...locations.value]

  // Distance sort only if we know userLocation
  if (userLocation.value) {
    base.sort((a, b) => getDistanceInKm(a.position) - getDistanceInKm(b.position))
  }
  return base
})

/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  console.log('isNative?', isNative.value); // should be false in browser
  if (!isNative.value) {
    await nextTick();
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
    catch (e) { console.warn('AdSense push error:', e); }
  }
});

onIonViewWillEnter(async () => {
  await initMap()
  await fetchLocations()
  await centerOnUser()
  await loadRole()
})

onIonViewDidEnter(() => (window as any).scheduleBannerUpdate?.());

/* dark mode InfoWindow sync */
const observer = new MutationObserver(applyInfoWindowDarkClass)
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

/* ---------------- Navigation ---------------- */
const goToAddPlace = async () => {
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
  height: 40vh;
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

