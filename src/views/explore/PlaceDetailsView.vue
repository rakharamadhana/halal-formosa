<template>
  <ion-page>
    <ion-header>
      <app-header
          :title="$t('explore.details.title')"
          show-back
          :useRouterBack="true"
          :backRoute="'/explore'"
          :icon="mapOutline"
      >
      <template #actions>
          <ion-item v-if="canEdit" button @click="editItem" lines="none">
            <ion-icon :icon="createOutline" slot="start" />
            <ion-label>Edit</ion-label>
          </ion-item>

          <ion-item button @click="reportItem" lines="none">
            <ion-icon :icon="alertCircleOutline" slot="start" />
            <ion-label>Report</ion-label>
          </ion-item>

          <ion-item button @click="share" lines="none">
            <ion-icon :icon="shareSocialOutline" slot="start" />
            <ion-label>Share</ion-label>
          </ion-item>
        </template>
      </app-header>
    </ion-header>

    <ion-content>
      <div v-if="place">
        <!-- 🖼️ Image carousel (Swiper) -->
        <Swiper
            v-if="place.image"
            :modules="modules"
            :zoom="true"
            :slides-per-view="1"
            :pagination="{ clickable: true }"
            class="place-swiper"
        >
          <SwiperSlide>
            <img
                :src="place.image"
                alt="Place image"
                style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;"
                @click="openImageModal"
            />
          </SwiperSlide>
        </Swiper>

        <!-- 🏷️ Info -->
        <div class="ion-padding-horizontal">
          <h2 class="font-bold text-xl">{{ place.name }}</h2>
          <p class="text-medium">{{ place.type }}</p>

          <!-- 📍 Map Link -->
          <ion-item lines="none">
            <ion-icon :icon="navigateOutline" slot="start" color="carrot" />
            <ion-label>
              <a
                  :href="`https://maps.google.com/?q=${place.lat},${place.lng}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color: var(--ion-color-carrot); text-decoration: none;"
              >
                Open in Google Maps
              </a>
            </ion-label>
          </ion-item>
        </div>
      </div>

      <!-- Skeleton while loading -->
      <div v-else>
        <ion-skeleton-text
            animated
            style="width:100%;height:300px;margin-bottom:12px;"
        />
        <ion-skeleton-text animated style="width:80%;height:20px;margin-bottom:8px;" />
        <ion-skeleton-text animated style="width:60%;height:16px;margin-bottom:8px;" />
      </div>
    </ion-content>

    <!-- 🟢 Fullscreen image modal -->
    <ion-modal :is-open="showImageModal" @didDismiss="closeImageModal">
      <ion-content fullscreen>
        <ion-button
            fill="solid"
            color="carrot"
            class="image-modal-close-btn"
            @click="closeImageModal"
        >
          ✕
        </ion-button>

        <Swiper
            :modules="[Zoom]"
            :zoom="true"
            :slides-per-view="1"
            class="fullscreen-swiper"
        >
          <SwiperSlide>
            <div class="swiper-zoom-container">
              <img :src="place?.image" alt="Place Image" />
            </div>
          </SwiperSlide>
        </Swiper>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonContent,
  IonSkeletonText,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonButton,
} from '@ionic/vue'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/plugins/supabaseClient'
import { Share } from '@capacitor/share'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Pagination, Zoom } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/zoom'
import AppHeader from '@/components/AppHeader.vue'
import {
  alertCircleOutline,
  createOutline,
  mapOutline,
  navigateOutline,
  shareOutline, shareSocialOutline,
} from 'ionicons/icons'

const route = useRoute()
const router = useRouter()
const place = ref<any>(null)
const canEdit = ref(false)
const modules = [Pagination, Zoom]

const showImageModal = ref(false)
function openImageModal() {
  showImageModal.value = true
}
function closeImageModal() {
  showImageModal.value = false
}

onMounted(async () => {
  const { data } = await supabase
      .from('locations')
      .select(`id, name, lat, lng, image, location_types(name)`)
      .eq('id', route.params.id)
      .single()

  if (data) {
    place.value = {
      id: data.id,
      name: data.name,
      image: data.image,
      type: data.location_types?.name ?? 'Halal Location',
      lat: data.lat,
      lng: data.lng,
    }
  }
})

const share = async () => {
  if (!place.value) return
  await Share.share({
    title: place.value.name,
    text: `${place.value.name} (${place.value.type})\n📍 https://maps.google.com/?q=${place.value.lat},${place.value.lng}\n\nShared via Halal Formosa 🕌`,
    dialogTitle: 'Share place',
  })
}

const editItem = () => console.log('Edit clicked')
const reportItem = () => {
  if (!place.value) return
  router.push(`/place/${place.value.id}/report`)
}
</script>

<style>
.place-swiper {
  margin: 0 !important;
  padding: 0 !important;
  width: 100%;
  height: 300px;
  border-radius: 0; /* full edge-to-edge */
}

.fullscreen-swiper,
.fullscreen-swiper .swiper-slide,
.fullscreen-swiper .swiper-zoom-container {
  width: 100%;
  height: 100%;
}

.fullscreen-swiper .swiper-slide {
  display: flex;
  justify-content: center;
  align-items: center;
  background: black;
}

.fullscreen-swiper img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-modal-close-btn {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 60px);
  right: 16px;
  z-index: 9999;
}
</style>
