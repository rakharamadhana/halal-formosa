<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title class="title-large">
          <ion-icon :icon="compassOutline" style="vertical-align: middle;" />
          Explore
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- Map stays fixed -->
    <div id="map"></div>

    <ion-toolbar style="--background: none;">
      <ion-searchbar
          class="search-explore"
          :debounce="1000"
          @ionInput="onSearchInput"
          style="flex-grow: 1;"
          placeholder="Search places (e.g. Mosque)"
      ></ion-searchbar>
    </ion-toolbar>
    <!-- Place list scrolls -->
    <ion-content>
      <div class="place-list">
        <ion-card
            v-for="place in sortedLocations"
            :key="place.name"
            :ref="el => {
              if (!cardRefs.value) cardRefs.value = {}
              cardRefs.value[place.name] = el
            }"
            :class="{ 'active-card': selectedPlace?.name === place.name }"
            @click="selectPlace(place)"
        >
          <div style="display: flex; align-items: center;">
            <ion-thumbnail slot="start" style="width: 115px; height: 115px; border-radius: 10px; overflow: hidden;">
              <img
                  loading="lazy"
                  :src="place.image"
                  alt="thumbnail"
                  style="object-fit: cover; width: 100%; height: 100%; border-radius: 8px;"
              />
            </ion-thumbnail>
            <div style="flex: 1; margin-left: 12px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <h5 class="title-text">{{ place.name }}</h5>
                <p class="type-text">
                  {{ place.type }}
                </p>
              </div>
              <div v-if="userLocation">
                📍 {{ getDistanceInKm(place.position) }} km away
              </div>
            </div>
          </div>
        </ion-card>
      </div>
    </ion-content>

    <ion-fab style="transform: translateY(-580%) translateX(-25%);" vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button color="carrot" @click="centerOnUser">
        <ion-icon style="color: var(--ion-color-light)" :icon="navigateCircleOutline"></ion-icon>
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>


<script setup>
import {
  IonPage,
  IonHeader,
  IonContent,
  IonToolbar,
  IonTitle,
  IonSearchbar,
  IonIcon,
  IonFab,
  IonFabButton,
  IonCard,
  IonThumbnail
} from '@ionic/vue'
import {compassOutline, navigateCircleOutline} from 'ionicons/icons'
import {ref, onMounted, nextTick, computed} from 'vue'
import {
  supabase
} from '@/plugins/supabaseClient' // adjust path if needed

const userLocation = ref(null)

import { Loader } from '@googlemaps/js-api-loader'

const searchQuery = ref('')
let mapInstance = null
let allLocations = []
let advancedMarkerLib = null
const markerMap = new Map()
let infoWindow = null
const selectedPlace = ref(null)

const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  version: 'weekly',
  libraries: ['marker']
})

const cardRefs = ref({})

const getDistanceInKm = (locPos) => {
  if (!userLocation.value) return null

  const R = 6371; // Radius of the earth in km
  const dLat = (locPos.lat - userLocation.value.lat) * Math.PI / 180
  const dLon = (locPos.lng - userLocation.value.lng) * Math.PI / 180
  const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLocation.value.lat * Math.PI / 180) *
      Math.cos(locPos.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  return distance.toFixed(2)
}

// Computed list of locations sorted by distance
const sortedLocations = computed(() => {
  const query = searchQuery.value?.toLowerCase().trim()

  if (!query) {
    return [...locations.value].sort((a, b) => {
      const distA = getDistanceInKm(a.position)
      const distB = getDistanceInKm(b.position)
      return distA - distB
    })
  }

  const matched = locations.value.filter(loc =>
      loc.name.toLowerCase().includes(query)
  )

  const others = locations.value.filter(loc =>
      !loc.name.toLowerCase().includes(query)
  )

  const sortByDistance = (a, b) => {
    const distA = getDistanceInKm(a.position)
    const distB = getDistanceInKm(b.position)
    return distA - distB
  }

  if (userLocation.value) {
    matched.sort(sortByDistance)
    others.sort(sortByDistance)
  }

  return [...matched, ...others]
})

let lastPanTime = 0

const selectPlace = (place) => {
  nextTick(() => {
    cardRefs.value[place.name]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })

  selectedPlace.value = place

  if (!mapInstance || !place?.position) return

  const position = place.position

  lastPanTime = Date.now()
  mapInstance.panTo(position)

  const currentPanTime = lastPanTime

  setTimeout(() => {
    if (currentPanTime !== lastPanTime) return

    mapInstance.setZoom(15) // ✅ animated zoom after pan

    const existingMarker = markerMap.get(place.name.toLowerCase())
    if (existingMarker && infoWindow) {
      infoWindow.setContent(`
        <div>
          <strong>${place.name}</strong><br>
          ${place.type}<br>
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=${position.lat},${position.lng}"
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
  }, 400) // wait for pan animation to finish
}

// Default center (Taipei)
const defaultCenter = { lat: 25.0343, lng: 121.5645 }

const locations = ref([])


const fetchLocations = async () => {
  const { data, error } = await supabase.from('locations').select('*')
  if (error) {
    console.error('Error fetching locations:', error)
    return
  }

  locations.value = data.map(loc => ({
    name: loc.name,
    type: loc.type,
    position: { lat: loc.lat, lng: loc.lng },
    image: loc.image
  }))

  allLocations = locations.value // update allLocations after fetch
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
      if (infoWindow) {
        infoWindow.setContent(`
          <div>
            <strong>${loc.name}</strong><br>
            ${loc.type}<br>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=${loc.position.lat},${loc.position.lng}"
              target="_blank"
              rel="noopener noreferrer"
              style="color: var(--ion-color-primary); text-decoration: none;"
            >
              Navigate
            </a>
          </div>
        `)
        infoWindow.open(mapInstance, markerInstance)
        setTimeout(applyInfoWindowDarkClass, 50)
      }
      selectedPlace.value = loc
    })

    markerMap.set(loc.name.toLowerCase(), markerInstance)
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

const centerOnUser = async () => {
  try {
    const permission = await Geolocation.checkPermissions()
    if (permission.location !== 'granted') {
      const result = await Geolocation.requestPermissions()
      if (result.location !== 'granted') {
        alert('Location permission is required.')
        return
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

    new google.maps.marker.AdvancedMarkerElement({
      position: userLoc,
      map: mapInstance,
      content: dot,
      title: 'You are here'
    })

  } catch (err) {
    console.error(err)
    alert('Could not get location.')
  }
}

const onSearchInput = (event) => {
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

    const existingMarker = markerMap.get(matched.name.toLowerCase())

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
  }
}

onMounted(() => {
  initMap()
  fetchLocations()
  const observer = new MutationObserver(() => {

    // Always reapply on change
    applyInfoWindowDarkClass()
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })

})
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
  height: 53vh;
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

