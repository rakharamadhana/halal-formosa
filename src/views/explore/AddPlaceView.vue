<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/explore" />
        </ion-buttons>
        <ion-title>Add New Place</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Role guard -->
      <ion-card v-if="checkedRole && !isAllowed">
        <ion-card-content>
          You don’t have permission to add places. Please contact an admin.
        </ion-card-content>
      </ion-card>

      <form v-else @submit.prevent="submitPlace" class="form">
        <ion-item>
          <ion-input
              v-model="form.name"
              label="Place Name *"
              label-placement="stacked"
              required
              placeholder="e.g., Taipei Grand Mosque"
          />
        </ion-item>

        <ion-item>
          <ion-select
              v-model="form.type"
              label="Type *"
              label-placement="stacked"
              interface="popover"
              placeholder="Select a type"
              required
          >
            <ion-select-option value="Mosque">Mosque</ion-select-option>
            <ion-select-option value="Prayer Room">Prayer Room</ion-select-option>
            <ion-select-option value="Halal Restaurant">Halal Restaurant</ion-select-option>
            <ion-select-option value="Muslim-friendly Restaurant">Muslim-friendly Restaurant</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Image upload -->
        <ion-item>
          <ion-label>
            Image <ion-text color="danger">*</ion-text>
          </ion-label>
          <ion-buttons slot="end">
            <ion-button @click="takePicture" fill="clear" :disabled="uploading">
              <ion-icon :icon="cameraOutline" />
            </ion-button>
            <ion-button @click="uploadFromGallery" fill="clear" :disabled="uploading">
              <ion-icon :icon="cloudUploadOutline" />
            </ion-button>
          </ion-buttons>
        </ion-item>

        <!-- Preview -->
        <div v-if="imagePreview" class="img-preview-wrap">
          <img :src="imagePreview" alt="Front Preview" class="img-preview" />
        </div>

        <div class="row-2">
          <ion-item>
            <ion-input
                v-model.number="form.lat"
                type="number"
                step="any"
                label="Latitude *"
                label-placement="stacked"
                required
            />
          </ion-item>
          <ion-item>
            <ion-input
                v-model.number="form.lng"
                type="number"
                step="any"
                label="Longitude *"
                label-placement="stacked"
                required
            />
          </ion-item>
        </div>

        <div class="map-wrap">
          <div class="hint">Tap on the map to set coordinates</div>

          <div class="map-holder">
            <!-- Real map is ALWAYS in the DOM -->
            <div id="add-map" :class="{'fade-in': mapReady}"></div>

            <!-- Skeleton overlays while loading -->
            <ion-skeleton-text
                v-if="mapLoading"
                animated
                class="map-skeleton"
            />
          </div>
        </div>

        <ion-button type="submit" expand="block" :disabled="submitting || !isValid">
          <ion-spinner v-if="submitting" name="lines-small" class="mr-2" />
          <span v-else>Save Place</span>
        </ion-button>
      </form>

      <ion-toast
          :is-open="toast.open"
          :message="toast.message"
          :color="toast.color"
          :duration="2200"
          @didDismiss="toast.open = false"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonInput, IonSelect, IonSelectOption,
  IonButton, IonToast, IonSpinner, IonButtons, IonBackButton, IonCard, IonCardContent, IonLabel, IonText, IonIcon
} from '@ionic/vue'
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/plugins/supabaseClient'
import { Loader } from '@googlemaps/js-api-loader'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { cameraOutline, cloudUploadOutline } from 'ionicons/icons'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

/* -------------------- Constants -------------------- */
const MAP_ID = 'a40f1ec0ad0afbbb12694f19'
const MAX_BYTES = 5 * 1024 * 1024 // 5MB
const DEFAULT_CENTER = { lat: 25.0343, lng: 121.5645 }
let clickMarker: google.maps.marker.AdvancedMarkerElement | null = null
let pinEl: any | null = null
const mapLoading = ref(true)  // show skeleton
const mapReady = ref(false)   // reveal map once real map is ready


/* -------------------- Router -------------------- */
const router = useRouter()

/* -------------------- Role Gate -------------------- */
const isAllowed = ref(false)
const checkedRole = ref(false)

const loadRole = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { checkedRole.value = true; return }
  const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
  if (!error && (data?.role === 'admin' || data?.role === 'contributor')) {
    isAllowed.value = true
  }
  checkedRole.value = true
}

/* -------------------- Form State -------------------- */
const form = ref<{
  name: string
  type: string
  lat: number
  lng: number
  image: string | null
}>({
  name: '',
  type: '',
  lat: DEFAULT_CENTER.lat,
  lng: DEFAULT_CENTER.lng,
  image: null
})

const submitting = ref(false)
const toast = ref<{ open: boolean; message: string; color: string }>({
  open: false,
  message: '',
  color: 'primary'
})

const isValid = computed(() =>
    !!form.value.name &&
    !!form.value.type &&
    form.value.lat !== null &&
    form.value.lng !== null &&
    (!!form.value.image || !!pendingFile.value) // allow deferred file
)

/* -------------------- Image Upload -------------------- */
async function resizeImageFromWebPath(
    webPath: string,
    filename: string,
    maxSize = 1200,     // longest side in px
    quality = 0.8       // JPEG quality 0..1
): Promise<File> {
  const res = await fetch(webPath)
  const blob = await res.blob()

  // Try createImageBitmap first (fast), fallback to HTMLImageElement
  const loadBitmap = async () => {
    try {
      return await createImageBitmap(blob)
    } catch {
      return new Promise<ImageBitmap>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          // draw to canvas to produce a bitmap-like object
          const c = document.createElement('canvas')
          c.width = img.naturalWidth
          c.height = img.naturalHeight
          const ctx = c.getContext('2d')!
          ctx.drawImage(img, 0, 0)
          c.toBlob(b => {
            if (!b) return reject(new Error('toBlob failed'))
            createImageBitmap(b).then(resolve).catch(reject)
          })
        }
        img.onerror = reject
        img.src = URL.createObjectURL(blob)
      })
    }
  }

  const bmp = await loadBitmap()

  // Resize keeping aspect ratio by the longest edge
  const w = bmp.width
  const h = bmp.height
  const scale = Math.min(1, maxSize / Math.max(w, h))
  const outW = Math.round(w * scale)
  const outH = Math.round(h * scale)

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0, outW, outH)

  const outBlob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Compression failed'))), 'image/jpeg', quality)
  )

  return new File([outBlob], filename, { type: 'image/jpeg' })
}

const makeSafeBase = () => {
  const base = form.value.name?.trim()
      .replace(/\s+/g, '-')            // spaces → dash
      .replace(/[^a-zA-Z0-9-_]/g, '')  // strip weird chars
      .toLowerCase()
  return base && base.length ? base : 'place'
}

const imagePreview = ref<string | null>(null)   // preview URL
const pendingFile = ref<File | null>(null)      // hold the chosen file until submit
const uploading = ref(false)

const setPreview = (file: File) => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imagePreview.value = URL.createObjectURL(file)
  pendingFile.value = file
}

const takePicture = async () => {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 85,
      allowEditing: false
    })
    if (!photo.webPath) return
    const safeBase = makeSafeBase()

    try {
      const file = await resizeImageFromWebPath(photo.webPath, `image-${safeBase}.jpg`, 1200, 0.8)
      if (file.size > MAX_BYTES) {
        toast.value = { open: true, message: 'Image still too large after compression.', color: 'danger' }
        return
      }
      setPreview(file)
    } catch (e:any) {
      toast.value = { open: true, message: e?.message || 'Could not process image.', color: 'danger' }
    }
  } catch { /* empty */ }
}

const uploadFromGallery = async () => {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
      quality: 85,
      allowEditing: false
    })
    if (!photo.webPath) return
    const safeBase = makeSafeBase()

    // compress to JPEG here
    const file = await resizeImageFromWebPath(photo.webPath, `image-${safeBase}.jpg`, 1200, 0.8)

    if (file.size > MAX_BYTES) {
      toast.value = { open: true, message: 'Image still too large after compression.', color: 'danger' }
      return
    }
    setPreview(file)
  } catch { /* empty */ }
}

/* -------------------- Map Picker -------------------- */
let map: google.maps.Map | null = null
let advancedMarkerLib: any = null
let mapClickListener: google.maps.MapsEventListener | null = null

const initMap = async () => {
  mapLoading.value = true
  const loader = new Loader({
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    version: 'weekly',
    libraries: ['marker']
  })
  const [{ Map }, markerLib] = await Promise.all([
    loader.importLibrary('maps'),
    loader.importLibrary('marker')
  ])

  // after markerLib is set
  if (!markerLib?.PinElement || !markerLib?.AdvancedMarkerElement) {
    console.error('Advanced markers not available. Check Maps JS API version/libraries.')
  }

  advancedMarkerLib = markerLib

  map = new Map(document.getElementById('add-map') as HTMLElement, {
    center: { lat: form.value.lat, lng: form.value.lng },
    zoom: 14,
    disableDefaultUI: true,
    mapId: MAP_ID,
    gestureHandling: 'greedy'   // 👈 add
  })

  // Build a colored pin (much more visible than a small dot)
  pinEl = new advancedMarkerLib.PinElement({
    background: getComputedStyle(document.documentElement)
        .getPropertyValue('--ion-color-carrot')
        .trim() || '#d8620d',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
    scale: 1.2,
  })

  // Create marker at initial coords
  clickMarker = new advancedMarkerLib.AdvancedMarkerElement({
    map,
    position: { lat: form.value.lat, lng: form.value.lng },
    content: pinEl.element,
    zIndex: 10,
  })

  // Prefer 'idle' (fires once map finishes first render)
  const onReady = () => {
    mapReady.value = true
    // tiny next tick to avoid flicker
    requestAnimationFrame(() => { mapLoading.value = false })
  }

  google.maps.event.addListenerOnce(map, 'idle', onReady);
  google.maps.event.addListenerOnce(map, 'tilesloaded', onReady);

  // Absolute last resort: time out after 3s
  setTimeout(() => {
    if (!mapReady.value) {
      onReady()
      console.warn('Map ready fallback timeout used')
    }
  }, 3000)

  // On click: move pin + animate + update form
  let firstTapDone = false
  mapClickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()

    form.value.lat = lat
    form.value.lng = lng

    if (clickMarker) {
      clickMarker.position = { lat, lng }
    } else {
      // safety: if null for any reason
      clickMarker = new advancedMarkerLib.AdvancedMarkerElement({
        map,
        position: { lat, lng },
        content: pinEl?.element ?? undefined,
        zIndex: 10,
      })
    }

    // optional: pan slightly so user sees the pin move
    map!.panTo({ lat, lng })

    // add a quick "pop" animation for feedback
    if (pinEl?.element) {
      pinEl.element.classList.add('marker-pop')
      setTimeout(() => pinEl.element.classList.remove('marker-pop'), 220)
    }

    if (!firstTapDone) { map!.setZoom(16); firstTapDone = true }
  })
}

/* ------------- Responsive Pin Color --------------- */
let themeObserver: MutationObserver | null = null   // <-- add this
const updatePinColor = () => {
  const carrot = getComputedStyle(document.documentElement)
      .getPropertyValue('--ion-color-carrot').trim() || '#d8620d'
  if (pinEl && advancedMarkerLib?.PinElement) {
    pinEl = new advancedMarkerLib.PinElement({
      background: carrot, borderColor: '#ffffff', glyphColor: '#ffffff', scale: 1.2
    })
    if (clickMarker) clickMarker.content = pinEl.element
  }
}

/* -------------------- Submit -------------------- */
const uploadToSupabase = async (file: File): Promise<string> => {
  uploading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('You must be logged in.')
    const safeBase = makeSafeBase()
    const rand = Math.random().toString(36).slice(2, 8)
    const path = `${user.id}/${safeBase}/${Date.now()}_${rand}.jpg`   // folder per place
    const { error: upErr } = await supabase.storage.from('location-image')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' })
    if (upErr) throw upErr
    const { data: pub } = supabase.storage.from('location-image').getPublicUrl(path)
    if (!pub?.publicUrl) throw new Error('Could not get public URL.')
    return pub.publicUrl
  } finally {
    uploading.value = false
  }
}

const submitPlace = async () => {
  if (submitting.value) return
  if (!form.value.image && !pendingFile.value) {
    toast.value = { open: true, message: 'Please select an image.', color: 'warning' }
    return
  }

  submitting.value = true
  try {
    if (!form.value.image && pendingFile.value) {
      form.value.image = await uploadToSupabase(pendingFile.value)
    }

    const { data: { user } } = await supabase.auth.getUser()
    const payload: Record<string, any> = {
      name: form.value.name.trim(),
      lat: form.value.lat,
      lng: form.value.lng,
      type: form.value.type,
      image: String(form.value.image || '').trim()
    }
    if (user) payload.created_by = user.id

    const { error } = await supabase.from('locations').insert([payload])
    if (error) throw error

    toast.value = { open: true, message: 'Place saved!', color: 'success' }

    // cleanup preview/file state
    if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
    imagePreview.value = null
    pendingFile.value = null

    setTimeout(() => router.push('/explore'), 400)
  } catch (err: any) {
    toast.value = { open: true, message: err.message || 'Failed to save.', color: 'danger' }
  } finally {
    submitting.value = false
  }
}

/* -------------------- Lifecycle -------------------- */
const centerOnUserOnce = async () => {
  // Native (Android/iOS): use Capacitor plugin
  if (Capacitor.getPlatform() !== 'web') {
    try {
      // Permissions
      const perm = await Geolocation.checkPermissions()
      if (perm.location !== 'granted') {
        await Geolocation.requestPermissions()
      }

      // Get position
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000,
      })
      const { latitude, longitude } = pos.coords
      form.value.lat = latitude
      form.value.lng = longitude
      return
    } catch (err) {
      console.warn('Native geolocation failed, falling back to default', err)
      return
    }
  }

  // Web fallback: use the browser API
  return new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          form.value.lat = latitude
          form.value.lng = longitude
          resolve()
        },
        (err) => {
          console.warn('Web geolocation failed or denied', err)
          resolve()
        },
        { enableHighAccuracy: true, timeout: 5000 }
    )
  })
}

onMounted(async () => {
  await loadRole()

  if (isAllowed.value) {
    try { await centerOnUserOnce() } catch { /* empty */ }
    await initMap()
    updatePinColor()
  } else {
    mapLoading.value = false
  }

  themeObserver = new MutationObserver(updatePinColor)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onBeforeUnmount(() => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  if (mapClickListener) { mapClickListener.remove(); mapClickListener = null }
  if (themeObserver) { themeObserver.disconnect(); themeObserver = null }
  clickMarker = null
  pinEl = null
  map = null
})

</script>

<style scoped>
.form :deep(.ion-invalid) {
  --highlight-color-invalid: var(--ion-color-danger);
}

/* Grid for lat/lng inputs */
.row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

/* Map */
.map-wrap { margin: 12px 0 16px; }
.hint { font-size: 12px; color: var(--ion-color-medium); margin: 4px 0 8px; }

.map-holder {
  position: relative;
  height: 32vh;
  border-radius: 12px;
  overflow: hidden;
}

#add-map {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 180ms ease-out;
}

#add-map.fade-in {
  opacity: 1;
}

.map-skeleton {
  position: absolute;
  inset: 0;              /* cover the map fully */
  border-radius: 12px;
}

/* Image preview */
.img-preview-wrap { padding: 0 16px 16px; }
.img-preview {
  max-width: 100%;
  display: block;
  border-radius: 8px;
}

/* Misc */
.mr-2 { margin-right: 8px; }

/* subtle feedback when the pin moves */
@keyframes pop {
  0%   { transform: translateZ(0) scale(0.85); }
  70%  { transform: translateZ(0) scale(1.08); }
  100% { transform: translateZ(0) scale(1); }
}
.marker-pop {
  animation: pop 220ms ease-out;
}

/* optional: show crosshair cursor on map to hint interactivity */
#add-map { cursor: crosshair; }

</style>
