<template>
  <ion-page>
    <ion-header>
      <!-- Native AdMob banner -->
      <div v-if="isNative && !isDonor" id="ad-space-explore" style="height:65px;"></div>
    </ion-header>

    <div
        v-show="viewMode !== 'list'"
        style="position: relative; height: 100%; width: 100%;"
    >

      <div id="map" style="height: 100%; width: 100%;"></div>

      <!-- Map is always present, hidden when loading -->
      <ion-skeleton-text
          v-show="loading"
          animated
          class="map-overlay"
      />

      <!-- Skeleton overlay -->
      <ion-skeleton-text
          v-show="loading"
          animated
          style="height:100%;width:100%;border-radius:0;position:absolute;top:0;left:0;z-index:0;"
      />

      <!-- FAB stays visible -->
      <ion-fab
          v-show="viewMode !== 'list'"
          vertical="bottom"
          horizontal="end"
          slot="fixed"
          :class="['fab-right', fabPosition]"
      >


        <ion-fab-button color="carrot" @click="centerOnUser">
          <ion-icon style="color: var(--ion-color-light)" :icon="navigateCircleOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>


    </div>

    <ion-fab
        v-show="viewMode !== 'list'"
        vertical="bottom"
        horizontal="start"
        slot="fixed"
        class="view-mode-fab"
        :class="fabPosition"
    >

      <!-- Main FAB -->
      <ion-fab-button size="small" color="dark">
        <ion-icon :icon="layersOutline"/>
      </ion-fab-button>

      <!-- FAB List -->
      <ion-fab-list side="top">
        <ion-fab-button
            size="small"
            :color="viewMode === 'map' ? 'carrot' : 'medium'"
            @click="viewMode = 'map'"
        >
          <ion-icon :icon="mapOutline"/>
        </ion-fab-button>

        <ion-fab-button
            size="small"
            :color="viewMode === 'both' ? 'carrot' : 'medium'"
            @click="viewMode = 'both'"
        >
          <ion-icon :icon="gridOutline"/>
        </ion-fab-button>

        <ion-fab-button
            size="small"
            color="medium"
            @click="viewMode = 'list'"
        >
          <ion-icon :icon="listOutline"/>
        </ion-fab-button>
      </ion-fab-list>
    </ion-fab>


    <div
        v-if="viewMode === 'both'"
        class="panel-toggle"
        :class="panelVisible ? 'toggle-open' : 'toggle-collapsed'"
        @click="panelVisible = !panelVisible"
    >
      <ion-icon :icon="panelVisible ? chevronDownOutline : chevronUpOutline"></ion-icon>
    </div>


    <!-- FIXED WRAPPER -->
    <div
        v-show="viewMode !== 'map'"
        class="bottom-panel-wrapper"
        :class="{
    collapsed: viewMode === 'both' && !panelVisible,
    'list-only': viewMode === 'list'
  }"
    >


      <ion-toolbar class="explore-toolbar">

        <!-- INLINE switch (List only) -->
        <div
            v-if="viewMode === 'list'"
            class="view-mode-switch inline"
            :style="{ marginTop: topOffset }"
        >
          <button @click="viewMode = 'map'">🗺️ Map</button>
          <button @click="viewMode = 'both'">🧱 Both</button>
          <button class="active">📋 List</button>
        </div>

        <!-- Search row -->
        <div style="display: flex; align-items: center;">


          <ion-searchbar
              class="search-explore"
              :debounce="1000"
              @ionInput="onSearchInput"
              style="flex-grow: 1; margin-right: 8px;"
              :placeholder="$t('explore.placeholder')"
          ></ion-searchbar>

          <ion-button
              v-if="isContributor"
              @click="goToAddPlace"
              color="carrot"
              size="small"
              style="margin-right: 12px; margin-top: 12px;"
          >
            <ion-icon :icon="addOutline"/>
          </ion-button>
        </div>


        <!-- ✅ Category bar right under search input -->
        <div class="category-bar-wrapper">
          <!-- Real category bar -->
          <div v-show="!loadingCategories" class="category-bar">
            <ion-chip
                v-for="cat in categories"
                :key="cat.id"
                class="category-chip"
                :style="{ '--cat-color': cat.color || 'var(--ion-color-medium)' } as Record<string,string>"
                :class="{ active: activeCategoryId === cat.id }"
                @click="toggleCategory(cat)"
            >

              <!-- If icon is emoji -->
              <span
                  v-if="typeof categoryIconMap[cat.name] === 'string' && categoryIconMap[cat.name].length === 2"
                  style="margin-right:4px;"
              >
        {{ categoryIconMap[cat.name] }}
      </span>
              <!-- If icon is Ionicon -->
              <ion-icon
                  v-else
                  :icon="categoryIconMap[cat.name]"
                  style="margin-right:4px;"
              />
              <ion-label>{{ cat.name }}</ion-label>
            </ion-chip>
          </div>

          <!-- Skeleton placeholder -->
          <div v-if="loadingCategories" class="category-skeletons">
            <ion-skeleton-text animated style="width:150px; height:28px; border-radius:5px; margin-right:8px;"/>
            <ion-skeleton-text animated style="width:150px; height:28px; border-radius:5px; margin-right:8px;"/>
            <ion-skeleton-text animated style="width:150px; height:28px; border-radius:5px; margin-right:8px;"/>
            <ion-skeleton-text animated style="width:150px; height:28px; border-radius:5px;"/>
          </div>
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

                <div
                    style="flex: 1; margin-left: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <h5 class="title-text">{{ place.name }}</h5>
                    <p class="type-text">{{ place.type }}</p>
                    <p class="type-text">👁️ {{ place.view_count || 0 }} views</p>
                  </div>

                  <div v-if="userLocation">
                    📍 {{ formatKm(getDistanceInKm(place.position)) }} km away
                  </div>

                  <!-- 🧭 Details Button -->
                  <ion-button
                      fill="clear"
                      size="small"
                      color="carrot"
                      @click.stop="goToDetail(place.id)"
                      style="align-self: flex-start;"
                  >
                    <ion-icon slot="start" :icon="informationCircleOutline"/>
                    Details
                  </ion-button>
                </div>
              </div>
            </ion-card>
          </template>
        </div>
      </ion-content>
    </div>
  </ion-page>
</template>


<script setup lang="ts">

/* ---------------- Imports ---------------- */
import {
  IonPage, IonContent, IonToolbar, IonSearchbar, IonIcon, IonFab, IonFabButton,
  IonCard, IonThumbnail, IonButton, onIonViewDidEnter, IonLabel, IonChip, IonHeader,
  IonSkeletonText, onIonViewWillEnter, IonFabList
} from '@ionic/vue'
import {
  navigateCircleOutline,
  addOutline,
  restaurant, informationCircleOutline, chevronUpOutline, chevronDownOutline, restaurantOutline, leaf, home,
  layersOutline, listOutline, gridOutline, mapOutline
} from 'ionicons/icons'
import {ref, computed, nextTick, onMounted, watch} from 'vue'
import type {ComponentPublicInstance, VNodeRef} from 'vue'
import {useRouter} from 'vue-router'
import mapsLoader from '@/plugins/googleMapsLoader'
import {Capacitor} from '@capacitor/core'
import {Geolocation} from '@capacitor/geolocation'
import {supabase} from '@/plugins/supabaseClient'
import {MarkerClusterer, SuperClusterAlgorithm} from "@googlemaps/markerclusterer"
import {Cluster, Renderer} from "@googlemaps/markerclusterer"

import useSharePlace from '@/composables/useSharePlace'
import {ActivityLogService} from "@/services/ActivityLogService";

import {isDonor} from "@/composables/useSubscriptionStatus";

const ionIconMap: Record<string, any> = {
  restaurant,
  restaurantOutline,
  leaf,
  home
}

/* ---------------- Types ---------------- */
type LatLng = { lat: number; lng: number }
type LocationType = {
  id: number
  name: string
  color: string | null
  emoji: string | null
  icon: string | null
}


type Place = {
  id: number
  name: string
  position: { lat: number; lng: number }
  image?: string | null
  typeId: number | null
  type: string
  view_count?: number
}


type LocationRow = {
  id: number
  name: string
  lat: number
  lng: number
  image?: string | null
  type_id: number | null
  location_types: { name: string } | null
  view_count?: number
}

// Local type for ion-content (no external import needed)
type HTMLIonContentElement = HTMLElement & {
  getScrollElement: () => Promise<HTMLElement>
}

type FabPosition = 'map' | 'panel-open' | 'panel-collapsed'

type ViewMode = 'map' | 'list' | 'both'

const viewMode = ref<ViewMode>('both')


/* ---------------- Constants ---------------- */
const MAP_ID = 'a40f1ec0ad0afbbb12694f19'
const DEFAULT_CENTER: LatLng = {lat: 25.0343, lng: 121.5645}
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
const panelVisible = ref(false)

/* Google Maps runtime objects */
let mapInstance: google.maps.Map | null = null
let advancedMarkerLib: typeof google.maps.marker | null = null
let infoWindow: google.maps.InfoWindow | null = null
const markerMap = new Map<number, google.maps.marker.AdvancedMarkerElement>()
const userMarker = ref<google.maps.marker.AdvancedMarkerElement | null>(null)
const {sharePlace} = useSharePlace()
const locationTypes = ref<LocationType[]>([])
let clusterer: MarkerClusterer | null = null


const fetchLocationTypes = async () => {
  loadingCategories.value = true

  const {data, error} = await supabase
      .from('location_types')
      .select('id, name, color, emoji, icon')
      .eq('is_active', true)

  if (!error && data) locationTypes.value = data

  loadingCategories.value = false
}


const categoryIconMap = computed<Record<string, any>>(() => {
  const map: Record<string, any> = {}

  for (const t of locationTypes.value) {
    if (t.emoji) {
      map[t.name] = t.emoji
    } else if (t.icon) {
      map[t.name] = ionIconMap[t.icon] ?? restaurant
    }
  }

  return map
})

const topOffset = computed(() => {
  let offset = 12; // base padding

  if (isNative.value && !isDonor.value) {
    offset += 120; // 👈 your AdMob height
  }

  return `${offset}px`;
});

const markerStyles = computed<Record<string, {
  color: string
  emoji?: string
}>>(() => {
  const map: Record<string, any> = {}

  for (const t of locationTypes.value) {
    map[t.name] = {
      color: t.color ?? 'var(--ion-color-carrot)',
      emoji: t.emoji ?? undefined
    }
  }

  return map
})

const fabPosition = computed<FabPosition>(() => {
  if (viewMode.value === 'map') return 'map'
  if (viewMode.value === 'both') {
    return panelVisible.value ? 'panel-open' : 'panel-collapsed'
  }
  return 'map'
})

/* ---------------- Utilities ---------------- */

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
  render: ({count, position}: Cluster) => {
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
          {boxShadow: "0 0 0 0 rgba(255, 87, 34, 0.4)"},
          {boxShadow: "0 0 0 12px rgba(255, 87, 34, 0)"}
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
  <div style="max-width: 230px;">
    <img
      src="${p.image || 'https://placehold.co/200x100'}"
      alt="${p.name}"
      style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;"
      onerror="this.src='https://placehold.co/200x100';"
    />
    <strong style="display:block; font-size: 14px; margin-bottom: 2px;">${p.name}</strong>
    <span style="color: gray; font-size: 13px;">${p.type}</span><br>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
      <a
        href="https://www.google.com/maps/dir/?api=1&destination=${p.position.lat},${p.position.lng}"
        target="_blank" rel="noopener noreferrer"
        style="color: var(--ion-color-carrot); font-weight: 500; text-decoration: none; font-size: 13px;"
      >📍 Navigate</a>

      <button
        class="share-btn"
        data-id="${p.id}"
        style="background:none;border:none;color:var(--ion-color-carrot);font-size:13px;cursor:pointer;"
      >🔗 Share</button>

    </div>
  </div>
`

const createPinElement = (place: Place) => {
  const style =
      markerStyles.value[place.type] ?? {
        color: "var(--ion-color-carrot)"
      }

  const wrapper = document.createElement("div")
  wrapper.className = "pin-wrapper"

  wrapper.innerHTML = `
    <div class="pin">
      <div class="pin-head">
        ${style.emoji ?? ""}
      </div>
      <div class="pin-body" style="background:${style.color}"></div>
    </div>
  `

  return wrapper
}


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
  scrollEl.scrollTo({top: Math.max(0, y), behavior: 'smooth'})
}

/* ---------------- Roles ---------------- */
const loadRole = async () => {
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return
  const {data, error} = await supabase
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

  const {data, error} = await supabase
      .from('locations')
      .select(`
      id, name, lat, lng, image, type_id,
      location_types(name)
    `)

  if (!error && data) {
    //@ts-expect-error LocationRow
    const typedData = data as LocationRow[]

    locations.value = typedData.map((loc) => ({
      id: loc.id,
      name: loc.name,
      position: {lat: loc.lat, lng: loc.lng},
      image: loc.image,
      typeId: loc.type_id,
      type: loc.location_types?.name ?? '',
      view_count: loc.view_count ?? 0
    }))
  }

  initMarkers()
  loadingPlaces.value = false
}

const categories = computed(() => locationTypes.value)

const activeCategoryId = ref<number | null>(null)

const toggleCategory = (cat: LocationType) => {
  ActivityLogService.log("explore_filter_category", {
    category_id: cat.id,
    category_name: cat.name
  });

  activeCategoryId.value = activeCategoryId.value === cat.id ? null : cat.id
  focusedPlaceId.value = null
  if (infoWindow) infoWindow.close()
}

/* ---------------- Map ---------------- */
const initMap = async () => {
  if (mapInstance) return   // guard

  await nextTick()          // wait for Vue render

  const el = document.getElementById('map')
  if (!el) {
    console.warn('[Map] #map not ready yet, retrying...')
    requestAnimationFrame(initMap)
    return
  }

  loading.value = true

  const [{Map}, marker] = await Promise.all([
    mapsLoader.importLibrary('maps'),
    mapsLoader.importLibrary('marker')
  ])

  advancedMarkerLib = marker

  mapInstance = new Map(el, {
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
    const iconHTML = createPinElement(loc)

    const marker = new advancedMarkerLib!.AdvancedMarkerElement({
      position: loc.position,
      content: iconHTML,
      title: `${loc.type}: ${loc.name}`
    })

    marker.addListener('click', () => {
      ActivityLogService.log("explore_marker_click", {
        id: loc.id,
        name: loc.name,
        type: loc.type,
        lat: loc.position.lat,
        lng: loc.position.lng
      });

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
      algorithm: new SuperClusterAlgorithm({radius: 80})
    })
  } else {
    // just put markers on map directly
    markerArray.forEach(m => (m.map = mapInstance!))
  }
}


watch([activeCategoryId, locations], () => {
  let filtered = [...locations.value]
  if (activeCategoryId.value !== null) {
    filtered = filtered.filter(l => l.typeId === activeCategoryId.value)
  }
  initMarkers(filtered)
})

watch([viewMode, panelVisible], async () => {
  await nextTick()
  if (mapInstance) {
    google.maps.event.trigger(mapInstance, 'resize')
  }
})


/* ---------------- Interactions ---------------- */
const selectPlace = (place: Place) => {
  ActivityLogService.log("explore_place_card_click", {
    id: place.id,
    name: place.name,
    type: place.type,
    lat: place.position.lat,
    lng: place.position.lng
  });

  selectedPlace.value = place
  scrollCardIntoView(place.id)

  if (!mapInstance) return

  const currentZoom = mapInstance.getZoom() || 14
  const targetZoom = currentZoom < 16 ? 17 : currentZoom
  mapInstance.panTo(place.position)
  mapInstance.setZoom(targetZoom)

  const m = markerMap.get(place.id)
  if (m && infoWindow) {
    infoWindow.setContent(buildInfoHtml(place))
    infoWindow.open(mapInstance, m)

    setTimeout(() => {
      applyInfoWindowDarkClass()

      const shareBtn = document.querySelector('.share-btn')
      if (shareBtn) {
        shareBtn.addEventListener('click', () => {
          ActivityLogService.log("explore_share_place", {
            id: place.id,
            name: place.name
          });

          sharePlace({
            name: place.name,
            type: place.type,
            imageUrl: place.image || 'https://placehold.co/200x100',
            lat: place.position.lat,
            lng: place.position.lng
          })
        })
      }

      const navigateBtn = document.querySelector('.navigate-btn')
      if (navigateBtn) {
        navigateBtn.addEventListener('click', () => {
          ActivityLogService.log("explore_navigate_click", {
            id: place.id,
            name: place.name
          });
        })
      }
    }, 50)
  }
}

const centerOnUser = async () => {
  await ActivityLogService.log("explore_center_user");

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
      const pos = await Geolocation.getCurrentPosition({enableHighAccuracy: true})
      coords = pos.coords
    } else {
      // Web → use browser navigator.geolocation
      coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            pos => resolve(pos.coords),
            err => reject(err),
            {enableHighAccuracy: true}
        )
      })
    }

    const userLoc: LatLng = {lat: coords.latitude, lng: coords.longitude}
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
  searchQuery.value = (event.detail?.value ?? '') as string

  ActivityLogService.log("explore_search_query", {
    query: searchQuery.value
  });
}

/* ---------------- Derived ---------------- */
const sortedLocations = computed(() => {
  let base = [...locations.value]

  // ✅ filter by category
  if (activeCategoryId.value) {
    base = base.filter(l => l.typeId === activeCategoryId.value)
  }

  // ✅ search (this already works for all matches)
  const q = searchQuery.value?.toLowerCase().trim()
  if (q) {
    base = base.filter(l => l.name.toLowerCase().includes(q))
  }

  // sort by distance if available
  if (userLocation.value) {
    base.sort((a, b) => getDistanceInKm(a.position) - getDistanceInKm(b.position))
  }
  return base
})


/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  await ActivityLogService.log("explore_page_open");

  await initMap();
  await loadRole();
  fetchLocationTypes();
  await fetchLocations();

  await refreshViewCounts();   // 👈 refresh initial view_count

  centerOnUser();
});

let firstEnter = true

onIonViewWillEnter(async () => {
  if (firstEnter) {
    firstEnter = false
    return
  }

  await fetchLocations()
  await nextTick()

  if (mapInstance) {
    google.maps.event.trigger(mapInstance, 'resize')
  }

  const focusId = Number(router.currentRoute.value.query.focus)
  if (focusId) {
    const p = locations.value.find(l => l.id === focusId)
    if (p) selectPlace(p)

    router.replace({query: {}}) // 👈 clear focus param
  }
})


onIonViewDidEnter(async () => {
  await refreshViewCounts();  // 👈 refresh again when user returns
});

async function refreshViewCounts() {
  if (locations.value.length === 0) return;

  const ids = locations.value.map(l => l.id);

  const {data: updated, error} = await supabase
      .from("locations")
      .select("id, view_count")
      .in("id", ids);

  if (!error && updated) {
    for (const u of updated) {
      const loc = locations.value.find(l => l.id === u.id);
      if (loc) loc.view_count = u.view_count;
    }
  }
}


/* dark mode InfoWindow sync */
const observer = new MutationObserver(applyInfoWindowDarkClass)
observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class']})

/* ---------------- Navigation ---------------- */
const goToAddPlace = async () => {
  router.push('/explore/add')
}

const goToDetail = async (id: number) => {

  const place = locations.value.find(p => p.id === id);
  await supabase.rpc("increment_location_view", {loc_id: id});

  ActivityLogService.log("explore_place_detail_open", {
    id,
    name: place?.name || null,
    type: place?.type || null
  });

  router.push(`/place/${id}`);
};

</script>


<style>
:root {
  --explore-top-offset: 0px;
}

/*********************************************
 * MAP SECTION
 *********************************************/
#map {
  margin: 0;
  width: 100%;
  height: 45vh;
  border-radius: 0;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.map-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}


/*********************************************
 * GOOGLE MAPS UI OVERRIDES
 *********************************************/
.gm-style {
  font: var(--ion-font-family);
}

.gm-style .gm-style-iw-c {
  color: var(--ion-color-dark);
}

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

/*********************************************
 * MAP PINS
 *********************************************/
.custom-pin {
  width: 26px;
  height: 26px;
  background: var(--ion-color-carrot);
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  position: relative;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);

  display: flex;
  align-items: center;
  justify-content: center;
}

.pin-emoji {
  transform: rotate(45deg); /* counter-rotate */
  font-size: 14px;
  line-height: 1;
  user-select: none;
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

/*********************************************
 * USER LOCATION DOT
 *********************************************/
.user-location-dot {
  width: 16px;
  height: 16px;
  background: var(--ion-color-carrot);
  border-radius: 50%;
  border: 4px solid white;
  box-shadow: 0 0 0 4px rgba(66, 133, 244, 0.3);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(216, 98, 13, 0.4);
  }
  100% {
    box-shadow: 0 0 0 10px rgba(66, 133, 244, 0);
  }
}

/*********************************************
 * SEARCH BAR + CATEGORY TOOLS
 *********************************************/
.search-explore {
  margin-top: 10px;
  margin-left: 5px;
  width: 96%;
  --border-radius: 10px;
  --box-shadow: 0 4px 12px rgba(124, 124, 124, 0.05);
}

.explore-toolbar {
  --background: var(--ion-background-color);
  border-top-left-radius: 25px;
  border-top-right-radius: 25px;
  overflow: hidden;
  margin-top: -30px;
  z-index: 2;
}

.category-bar-wrapper {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 6px;
}

.category-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 6px;
}

.category-bar::-webkit-scrollbar {
  display: none;
}

.category-skeletons {
  display: flex;
  gap: 8px;
  width: 100%;
}

/* =========================
   CATEGORY CHIP – DEFAULT
========================= */
.category-chip {

  --cat-color: "";
  --base: var(--cat-color);

  --background: transparent;
  --color: var(--base);

  border: 1.5px solid var(--base);
  border-radius: 999px;

  font-weight: 500;
  transition: all 0.2s ease;
}

/* =========================
   ACTIVE CHIP
========================= */
.category-chip.active {
  --background: var(--base);
  --color: #ffffff;

  border-color: var(--base);
}

/* =========================
   OPTIONAL: Hover (desktop)
========================= */
.category-chip:hover {
  filter: brightness(1.1);
}


/*********************************************
 * LIST CARD TYPOGRAPHY
 *********************************************/
.title-text {
  font-size: 21px;
  margin: 3px 0 0;
}

.type-text {
  margin-top: 3px;
  font-size: 14px;
  color: var(--ion-color-medium);
  margin-bottom: 3px;
}

.active-card {
  border: 2px solid var(--ion-color-carrot);
}

/*********************************************
 * GOOGLE-MAPS STYLE PANEL (SLIDING PANEL)
 *********************************************/
.bottom-panel-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;

  height: 55vh;
  background: var(--ion-background-color);

  border-radius: 22px 22px 0 0;
  box-shadow: 0 -5px 18px rgba(0, 0, 0, 0.1);

  display: flex;
  flex-direction: column;

  z-index: 11;
}

/* Hidden (collapsed) */
.bottom-panel-wrapper.collapsed {
  transform: translateY(calc(40vh - 40px));
}

/*********************************************
 * PANEL CONTENT AREA
 *********************************************/
.panel-content {
  height: 100%;
  --padding-top: 0;
  --padding-bottom: 20px;
  overflow-y: auto;
}

/*********************************************
 * PANEL TOGGLE BUTTONS (shared + variants)
 *********************************************/
:root {
  --map-height: 45vh;
  --panel-height: 55vh;
  --toggle-offset-open: -15vh;
  --toggle-offset-collapsed: 35vh;
}

.panel-toggle {
  padding: 6px 14px;
  background: var(--ion-background-color);
  border-radius: 30px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
  color: var(--ion-color-carrot);

  position: fixed;
  left: 50%;
  transform: translate(-50%, 0);
  z-index: 200;
  cursor: pointer;

  transition: transform 0.50s cubic-bezier(.25, .8, .25, 1); /* smoother easing */
}

/* Panel OPEN — on top edge of panel */
.toggle-open {
  transform: translate(
      -50%,
      calc(var(--map-height) + var(--toggle-offset-open))
  );
}


/* Panel COLLAPSED — floating above nav */
.toggle-collapsed {
  transform: translate(
      -50%,
      calc(100vh - var(--toggle-offset-collapsed))
  );
}

/*********************************************
 * TOOLBAR INLINE UTILITY
 *********************************************/
.toolbar-inline {
  --min-height: auto;
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
  padding: 4px 16px;
}

/* FAB when panel is OPEN */
.fab-with-panel {
  position: absolute;
  bottom: 60vh; /* Raises button above panel */
  right: 20px;
  z-index: 15;
  transition: bottom 0.25s ease;
}

/* FAB when panel is CLOSED */
.fab-collapsed {
  position: absolute;
  bottom: 25vh; /* Slightly above collapsed toggle */
  right: 20px;
  z-index: 15;
  transition: bottom 0.50s ease;
}

/* Overall pin */
.pin {
  position: relative;
  width: 34px;
  height: 46px;
}

/* White circle head */
.pin-head {
  width: 25px;
  height: 25px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  position: absolute;
  top: 5px;
  left: 4px;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  z-index: 2;
}

/* Colored body */
.pin-body {
  width: 35px;
  height: 35px;
  position: absolute;
  top: 1px;

  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);

  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.bottom-panel-wrapper.list-only {
  height: 100vh;
  top: 0;
  bottom: auto;
  border-radius: 0;
}


.bottom-panel-wrapper.list-only .explore-toolbar {
  margin-top: 0;
  border-radius: 0;
}


/* =========================
   VIEW MODE SWITCH (BASE)
========================= */
.view-mode-switch {
  display: flex;
  gap: 6px;
}

.view-mode-switch button {
  border: none;
  padding: 6px 10px;
  border-radius: 10px;

  font-size: 13px;
  font-weight: 500;

  background: transparent;
  color: var(--ion-color-medium);
  cursor: pointer;

  transition: all 0.2s ease;
}

.view-mode-switch button.active {
  background: var(--ion-color-carrot);
  color: white;
}

.view-mode-switch button:hover {
  filter: brightness(1.1);
}

/* =========================
   VIEW MODE SWITCH (BASE)
========================= */
.view-mode-switch {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;

  padding: 6px;
  border-radius: 14px;
  background: var(--ion-background-color);

  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  /* animation consistency */
  transition: transform 0.25s ease,
  opacity 0.2s ease;
}

/* =========================
   FLOATING (Map / Both)
========================= */
.view-mode-switch.floating {
  position: absolute;
  top: 1vh;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
}

/* =========================
   INLINE (List)
========================= */
.view-mode-switch.inline {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 8px;

  background: transparent;
  box-shadow: none;
}

.view-mode-switch {
  will-change: transform, opacity;
}

.view-mode-fab {
  bottom: 92px; /* above tab bar */
  left: 12px;
  z-index: 30;
}

/* shrink FAB list spacing */
.view-mode-fab ion-fab-list {
  margin-bottom: 6px;
}

/* shared base */
.fab-right,
.view-mode-fab {
  position: fixed;
  z-index: 30;
  transition: bottom 0.35s cubic-bezier(.25, .8, .25, 1);
}

/* left FAB horizontal offset */
.view-mode-fab {
  left: 12px;
}

/* right FAB offset */
.fab-right {
  right: 20px;
}

/* MAP ONLY */
.fab-right.map,
.view-mode-fab.map {
  bottom: 5vh; /* above tab bar */
}

/* BOTH — panel collapsed */
.fab-right.panel-collapsed,
.view-mode-fab.panel-collapsed {
  bottom: 26vh;
}

/* BOTH — panel open */
.fab-right.panel-open,
.view-mode-fab.panel-open {
  bottom: 62vh;
}

</style>

