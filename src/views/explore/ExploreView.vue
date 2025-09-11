<template>
  <ion-page>
    <ion-header>
      <app-header :title="$t('explore.title')" :icon="compassOutline" :showProfile="true" />
    </ion-header>
    <!-- Native AdMob banner -->
    <div v-if="isNative && !isDonor" id="ad-space-explore" style="height:60px;"></div>

    <!-- Map section -->
    <div style="position: relative; height: 45vh; width: 100%;">
      <!-- Map is always present, hidden when loading -->
      <div id="map" v-show="!loading" style="height: 100%; width: 100%;"></div>

      <!-- Skeleton overlay -->
      <ion-skeleton-text
          v-show="loading"
          animated
          style="height:100%;width:100%;border-radius:0;position:absolute;top:0;left:0;z-index:0;"
      />

      <!-- FAB stays visible -->
      <ion-fab
          vertical="bottom"
          horizontal="end"
          slot="fixed"
          style="position: absolute; bottom: 35px; right: 20px; z-index: 10;"
      >
        <ion-fab-button color="carrot" @click="centerOnUser">
          <ion-icon style="color: var(--ion-color-light)" :icon="navigateCircleOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </div>

    <ion-toolbar class="explore-toolbar">
      <div style="display: flex; ">
        <ion-searchbar
            class="search-explore"
            :debounce="1000"
            @ionInput="onSearchInput"
            style="flex-grow: 1; margin-right: 8px;"
            :placeholder="$t('explore.placeholder')"
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

      <!-- ✅ Category bar right under search input -->
      <div class="category-bar-wrapper">
        <!-- Real category bar -->
        <div v-show="!loadingCategories" class="category-bar">
          <ion-chip
              v-for="cat in categories"
              :key="cat.id"
              :class="['category-chip', activeCategoryId === cat.id ? 'chip-carrot' : 'chip-medium']"
              @click="toggleCategory(cat)"
          >
            <!-- If icon is emoji -->
            <span
                v-if="typeof categoryIcons[cat.name] === 'string' && categoryIcons[cat.name].length === 2"
                style="margin-right:4px;"
            >
        {{ categoryIcons[cat.name] }}
      </span>
            <!-- If icon is Ionicon -->
            <ion-icon
                v-else
                :icon="categoryIcons[cat.name]"
                style="margin-right:4px;"
            />
            <ion-label>{{ cat.name }}</ion-label>
          </ion-chip>
        </div>

        <!-- Skeleton placeholder -->
        <div v-if="loadingCategories" class="category-skeletons">
          <ion-skeleton-text animated style="width:150px; height:28px; border-radius:5px; margin-right:8px;" />
          <ion-skeleton-text animated style="width:150px; height:28px; border-radius:5px; margin-right:8px;" />
          <ion-skeleton-text animated style="width:150px; height:28px; border-radius:5px; margin-right:8px;" />
          <ion-skeleton-text animated style="width:150px; height:28px; border-radius:5px;" />
        </div>
      </div>


    </ion-toolbar>

    <ion-toolbar
        v-if="focusedPlaceId !== null"
        class="toolbar-inline"
    >
      <div class="toolbar-inline-content">
        <span>{{ $t('explore.showingPlace') }}</span>
        <ion-button size="small" fill="outline" @click="focusedPlaceId = null">
          {{ $t('explore.clear') }}
        </ion-button>
      </div>
    </ion-toolbar>

    <!-- Place list scrolls -->
    <ion-content class="ion-padding" style="margin-top:0; --padding-top:0;" ref="contentRef">
      <div class="place-list">
        <!-- ✅ Skeleton list while loading -->
        <template v-if="loadingPlaces">
          <ion-card v-for="n in 3" :key="'skeleton-' + n">
            <div style="display: flex; align-items: center;">
              <!-- Thumbnail skeleton -->
              <ion-skeleton-text
                  animated
                  style="width:115px; height:115px; border-radius:10px;"
              />
              <!-- Text skeletons -->
              <div style="flex:1; margin-left:12px;">
                <ion-skeleton-text
                    animated
                    style="width:70%; height:18px; margin-bottom:8px;"
                />
                <ion-skeleton-text
                    animated
                    style="width:50%; height:14px; margin-bottom:6px;"
                />
                <ion-skeleton-text
                    animated
                    style="width:40%; height:14px;"
                />
              </div>
            </div>
          </ion-card>
        </template>

        <!-- ✅ Real data after loaded -->
        <template v-else>
          <ion-card
              v-for="place in displayedLocations"
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
                  <p class="type-text">{{ place.type }}</p>
                </div>
                <div v-if="userLocation">📍 {{ formatKm(getDistanceInKm(place.position)) }} km away</div>
              </div>
            </div>
          </ion-card>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>


<script setup lang="ts">

/* ---------------- Imports ---------------- */
import {
  IonPage, IonContent, IonToolbar, IonSearchbar, IonIcon, IonFab, IonFabButton,
  IonCard, IonThumbnail, IonButton, onIonViewDidEnter, IonHeader, IonLabel, IonChip,
  IonSkeletonText, onIonViewWillEnter
} from '@ionic/vue'
import {
  compassOutline,
  navigateCircleOutline,
  addOutline,
  restaurant, restaurantOutline
} from 'ionicons/icons'
import {ref, computed, nextTick, onMounted, watch} from 'vue'
import type { ComponentPublicInstance, VNodeRef } from 'vue'
import { useRouter } from 'vue-router'
import { Loader } from '@googlemaps/js-api-loader'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { supabase } from '@/plugins/supabaseClient'
import AppHeader from "@/components/AppHeader.vue";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer"
import { Cluster, Renderer } from "@googlemaps/markerclusterer"
import { isDonor } from '@/composables/userProfile'

/* ---------------- Types ---------------- */
type LatLng = { lat: number; lng: number }
type LocationType = { id: number; name: string }

type Place = {
  id: number
  name: string
  position: { lat: number; lng: number }
  image?: string | null
  typeId: number
  type: string
}

type LocationRow = {
  id: number
  name: string
  lat: number
  lng: number
  image?: string | null
  type_id: number
  location_types: { name: string }[]   // ✅ array
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
const loading = ref(true)
const loadingCategories = ref(true)
const loadingPlaces = ref(true)

/* Google Maps runtime objects */
let mapInstance: google.maps.Map | null = null
let advancedMarkerLib: typeof google.maps.marker | null = null
let infoWindow: google.maps.InfoWindow | null = null
const markerMap = new Map<number, google.maps.marker.AdvancedMarkerElement>()
const userMarker = ref<google.maps.marker.AdvancedMarkerElement | null>(null)

const locationTypes = ref<LocationType[]>([])
let clusterer: MarkerClusterer | null = null


const fetchLocationTypes = async () => {
  loadingCategories.value = true
  const { data, error } = await supabase.from('location_types').select('id, name')
  if (!error && data) locationTypes.value = data
  loadingCategories.value = false
}

const categoryIcons: Record<string, any> = {
  "Halal Restaurant": restaurant,
  "Muslim-friendly Restaurant": "🥗",
  "Halal Kitchen": restaurantOutline,
  "Muslim-friendly Environment": "🌿",
  "Mosque": "🕌",
  "Prayer Room": "🙏",
  "Butcher Shop": "🥩",
}

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

const displayedLocations = computed(() => {
  // if one place is focused → only show that
  if (focusedPlaceId.value !== null) {
    return sortedLocations.value.filter(l => l.id === focusedPlaceId.value)
  }
  return sortedLocations.value
})


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

const carrotRippleClusterRenderer: Renderer = {
  render: ({ count, position }: Cluster) => {
    // Color based on count
    let bg = "rgba(255, 159, 64, 1)" // light orange
    if (count > 50) bg = "rgba(255, 87, 34, 1)" // carrot orange
    if (count > 100) bg = "rgba(220, 53, 69, 1)" // red

    const div = document.createElement("div")
    div.style.background = bg
    div.style.color = "white"
    div.style.borderRadius = "50%"
    div.style.display = "flex"
    div.style.alignItems = "center"
    div.style.justifyContent = "center"
    div.style.width = "40px"
    div.style.height = "40px"
    div.style.fontSize = "14px"
    div.style.fontWeight = "bold"
    div.style.boxShadow = "0 0 0 8px rgba(255, 87, 34, 0.5)" // soft ripple glow
    div.style.transition = "transform 0.3s ease"
    div.textContent = String(count)

    // Animate ripple
    div.animate(
        [
          { boxShadow: "0 0 0 0 rgba(255, 87, 34, 0.4)" },
          { boxShadow: "0 0 0 12px rgba(255, 87, 34, 0)" }
        ],
        {
          duration: 1500,
          iterations: Infinity
        }
    )

    return new google.maps.marker.AdvancedMarkerElement({
      position,
      content: div
    })
  },
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
  loadingPlaces.value = true

  const { data, error } = await supabase
      .from('locations')
      .select(`
      id, name, lat, lng, image, type_id,
      location_types(name)
    `)

  if (!error && data) {
    const typedData = data as LocationRow[]

    locations.value = typedData.map((loc) => ({
      id: loc.id,
      name: loc.name,
      position: { lat: loc.lat, lng: loc.lng },
      image: loc.image,
      typeId: loc.type_id,
      type: loc.location_types[0]?.name ?? ''   // ✅ pick first
    }))
  }

  initMarkers()
  loadingPlaces.value = false
}

const categories = computed(() => locationTypes.value)

const activeCategoryId = ref<number|null>(null)

const toggleCategory = (cat: LocationType) => {
  activeCategoryId.value = activeCategoryId.value === cat.id ? null : cat.id
  focusedPlaceId.value = null
  if (infoWindow) infoWindow.close()
}

/* ---------------- Map ---------------- */
const initMap = async () => {
  loading.value = true
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
  loading.value = false
}

const initMarkers = (places: Place[] = locations.value) => {
  if (!mapInstance || !advancedMarkerLib) return

  // clear old markers
  markerMap.forEach(m => m.map = null)
  markerMap.clear()

  // clear previous cluster
  if (clusterer) {
    clusterer.clearMarkers()
    clusterer.setMap(null)
    clusterer = null
  }

  const markerArray: google.maps.marker.AdvancedMarkerElement[] = []

  places.forEach((loc) => {
    const iconHTML = document.createElement('div')
    iconHTML.innerHTML = `<div class="custom-pin"></div><div class="custom-pin-dot"></div>`

    const marker = new advancedMarkerLib!.AdvancedMarkerElement({
      position: loc.position,
      content: iconHTML,
      title: `${loc.type}: ${loc.name}`
    })

    marker.addListener('click', () => {
      if (searchQuery.value && !loc.name.toLowerCase().includes(searchQuery.value.toLowerCase())) {
        searchQuery.value = ''
      }
      selectPlace(loc)
    })

    markerMap.set(loc.id, marker)
    markerArray.push(marker)
  })

  // ✅ only cluster when no filter
  if (!activeCategoryId.value) {
    clusterer = new MarkerClusterer({
      map: mapInstance!,
      markers: markerArray,
      renderer: carrotRippleClusterRenderer,
      algorithm: new SuperClusterAlgorithm({ radius: 80 })
    })
  } else {
    // just put markers on map directly
    markerArray.forEach(m => (m.map = mapInstance!))
  }
}


watch([activeCategoryId, locations, focusedPlaceId], () => {
  let filtered = [...locations.value]

  if (focusedPlaceId.value !== null) {
    // focus mode → only that marker
    filtered = filtered.filter(l => l.id === focusedPlaceId.value)
  } else if (activeCategoryId.value !== null) {
    // filter by type_id
    filtered = filtered.filter(l => l.typeId === activeCategoryId.value)
  }

  initMarkers(filtered)
})




/* ---------------- Interactions ---------------- */
const selectPlace = (place: Place) => {
  focusedPlaceId.value = place.id   // 🔑 triggers watcher
  selectedPlace.value = place
  scrollCardIntoView(place.id)

  if (!mapInstance) return
  mapInstance.panTo(place.position)

  const m = markerMap.get(place.id)
  if (m && infoWindow) {
    infoWindow.setContent(buildInfoHtml(place))
    infoWindow.open(mapInstance, m)
    setTimeout(applyInfoWindowDarkClass, 50)
  }
}


const centerOnUser = async () => {
  try {
    let coords: { latitude: number; longitude: number }

    if (Capacitor.isNativePlatform()) {
      // Native (Android/iOS) → Capacitor Geolocation
      const perm = await Geolocation.checkPermissions()
      if (perm.location !== 'granted') {
        const req = await Geolocation.requestPermissions()
        if (req.location !== 'granted') {
          console.warn('Location permission denied')
          return
        }
      }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
      coords = pos.coords
    } else {
      // Web → use browser navigator.geolocation
      coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            pos => resolve(pos.coords),
            err => reject(err),
            { enableHighAccuracy: true }
        )
      })
    }

    const userLoc: LatLng = { lat: coords.latitude, lng: coords.longitude }
    userLocation.value = userLoc
    mapInstance?.panTo(userLoc)

    if (userMarker.value) {
      userMarker.value.position = userLoc
    } else {
      const dot = document.createElement('div')
      dot.className = 'user-location-dot'
      userMarker.value = new google.maps.marker.AdvancedMarkerElement({
        position: userLoc,
        map: mapInstance!,
        content: dot,
        title: 'You are here'
      })
    }
  } catch (err) {
    console.warn('Could not get location:', err)
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

  focusedPlaceId.value = matched.id   // 🔑 markers also filtered
  selectedPlace.value = matched
  scrollCardIntoView(matched.id)

  mapInstance.panTo(matched.position)
  const marker = markerMap.get(matched.id)
  if (marker && infoWindow) {
    infoWindow.setContent(buildInfoHtml(matched))
    infoWindow.open(mapInstance, marker)
    setTimeout(applyInfoWindowDarkClass, 50)
  }
}

/* ---------------- Derived ---------------- */
const sortedLocations = computed(() => {
  let base = [...locations.value]

  // ✅ filter by category
  if (activeCategoryId.value) {
    base = base.filter(l => l.typeId === activeCategoryId.value)
  }

  // search
  const q = searchQuery.value?.toLowerCase().trim()
  if (q) {
    base = base.filter(l => l.name.toLowerCase().includes(q))
  }

  // sort by distance if userLocation available
  if (userLocation.value) {
    base.sort((a, b) => getDistanceInKm(a.position) - getDistanceInKm(b.position))
  }
  return base
})


/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  console.log('isNative?', isNative.value)
  if (!isNative.value) await nextTick()

  await initMap()
  await loadRole()
  fetchLocationTypes()
  fetchLocations()
  centerOnUser()
})

onIonViewWillEnter(async () => {
  centerOnUser()
})

onIonViewDidEnter(() => {
  (window as any).scheduleBannerUpdate?.()
})

/* dark mode InfoWindow sync */
const observer = new MutationObserver(applyInfoWindowDarkClass)
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

/* ---------------- Navigation ---------------- */
const goToAddPlace = async () => {
  router.push('/explore/add')
}
</script>


<style>

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

#map {
  margin: 0;                /* remove extra margins */
  width: 100%;              /* full width */
  height: 45vh;             /* take ~60% of screen height */
  border-radius: 0;         /* remove rounding if you want edge-to-edge */
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

.explore-toolbar {
  --background: var(--ion-background-color); /* or your toolbar bg color */
  border-top-left-radius: 25px;
  border-top-right-radius: 25px;
  overflow: hidden; /* ensures child bg doesn’t spill over */
  margin-top: -30px; /* pull it up to overlap the map cleanly */
  z-index: 2;
}

.category-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 6px;

  /* Hide scrollbar */
  scrollbar-width: none;     /* Firefox */
  -ms-overflow-style: none;  /* IE/Edge */
}

.category-bar-wrapper {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 6px;
}

.category-skeletons {
  overflow-x: auto;
  display: flex;
  gap: 8px;
  width: 100%;
}

.category-bar::-webkit-scrollbar {
  display: none;  /* Chrome/Safari */
}

.category-chip {
  font-size: 13px;
  flex-shrink: 0;         /* keep width based on content, don’t shrink */
  width: auto;            /* ✅ ensures chip fits content */
}

/* make toolbar auto height */
.toolbar-inline {
  --min-height: auto;  /* remove Ionic's fixed min height */
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  --background: none;
}

.toolbar-inline-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 16px; /* smaller padding so height = content */
}
</style>

