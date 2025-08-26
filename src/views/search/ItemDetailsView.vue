<template>
  <ion-page>
    <ion-header>
      <app-header :title="$t('search.details.title')" show-back back-route="/search" :icon="bagOutline" />
    </ion-header>

    <!-- If this page should show ads, include this slot and set meta.adSpaceId above -->
    <div v-if="isNative && showAds" id="ad-space-item-details" style="height:60px;"></div>

    <ion-content>
      <div v-if="loading">
        <ion-skeleton-text animated style="width:100%;height:200px" />
        <ion-skeleton-text animated style="width:70%;height:20px;margin-top:10px" />
      </div>

      <div v-else-if="item">
        <!-- Swiper carousel for images -->
        <Swiper
            v-if="item.photo_front_url || item.photo_back_url"
            :modules="modules"
            :scrollbar="true"
            :slides-per-view="1"
            :pagination="{ clickable: true }"
            class="product-swiper"
        >
          <SwiperSlide v-if="item.photo_front_url">
            <img
                :src="item.photo_front_url"
                alt="Front Image"
                style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;"
                @click="openImageModal(0)"
            />
          </SwiperSlide>
          <SwiperSlide v-if="item.photo_back_url">
            <img
                :src="item.photo_back_url"
                alt="Back Image"
                style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;"
                @click="openImageModal(1)"
            />
          </SwiperSlide>
        </Swiper>

        <!-- Details below the slider -->
        <div style="margin-top: 1rem; padding-top: 0" class="ion-padding">
          <h2 style="margin-bottom: 0;">{{ item.name }}</h2>
          <p style="margin-top: 3px; margin-bottom: 0;"><small>{{ item.barcode }}</small></p>
          <p style="margin-top: 10px">
            <ion-chip :class="statusToChipClass(item.status)">
              {{ $t(`search.status.${item.status}`) }}
            </ion-chip>
          </p>

          <p class="ion-margin-top"><strong><small>{{ $t('search.details.description') }}</small></strong></p>
          <h5 class="ion-no-margin" style="margin-top: 2px">{{ item.description }}</h5>

          <p class="ion-margin-top">
            <strong><small>{{ $t('search.details.ingredients') }}</small></strong>
          </p>

          <ul style="margin:0; padding-left:1.2rem">
            <li v-for="(ing, idx) in visibleIngredients"
                :key="idx"
                v-html="ing.html">
            </li>
          </ul>

          <!-- Toggle button -->
          <div v-if="highlightedIngredients.length > maxVisible" class="ion-margin-top">
            <ion-button
                fill="clear"
                size="small"
                @click="showAllIngredients = !showAllIngredients"
            >
              {{ !showAllIngredients ? $t('search.details.viewMore') : $t('search.details.viewLess') }}
            </ion-button>
          </div>

          <h5 v-else class="ion-no-margin" style="margin-top: 2px">
            {{ item.ingredients }}
          </h5>

          <!-- Color Legend -->
          <div v-if="usedColors.length" class="ion-margin-top ingredient-legend">
            <p><strong>{{ $t('search.details.colorLegend') }}</strong></p>

            <ion-chip
                v-for="color in usedColors"
                :key="color"
                :class="colorToChipClass(color)"
            >
              {{ $t(colorLabels[color]) }}
            </ion-chip>
          </div>

          <ion-button
              v-if="isAdmin && item"
              expand="block"
              color="carrot"
              class="ion-margin-top"
              @click="openEditModal"
          >
            {{ $t('search.details.edit') }}
          </ion-button>

          <!-- 🟠 Admin Edit Modal -->
          <ion-modal :is-open="showEditModal" @didDismiss="closeEditModal">
            <AddProductView
                :edit-product="item!"
                @close="closeEditModal"
            />
          </ion-modal>

          <ion-button
              v-if="item"
              class="ion-margin-top"
              expand="block"
              color="medium"
              @click="goToReport(item.barcode)"
          >
            {{ $t('search.details.report') }}
          </ion-button>
        </div>
      </div>
      <p v-else class="ion-text-center ion-margin-top">❌ {{ $t('search.details.no-item') }}</p>
    </ion-content>

    <!-- 🟢 Fullscreen Image Modal -->
    <ion-modal :is-open="showImageModal" @didDismiss="closeImageModal">
      <ion-content fullscreen>
        <!-- Floating Close Button -->
        <ion-button
            fill="solid"
            color="carrot"
            style="position: absolute; top: 16px; right: 16px; z-index: 9999;"
            @click="closeImageModal"
        >
          ✕
        </ion-button>

        <!-- Swiper Gallery with Zoom -->
        <Swiper
            :modules="[Pagination, Zoom]"
            :zoom="true"
            :slides-per-view="1"
            :pagination="{ clickable: true }"
            :initial-slide="activeImageIndex"
            class="fullscreen-swiper"
        >
          <SwiperSlide v-if="item!.photo_front_url">
            <div class="swiper-zoom-container">
              <img :src="item!.photo_front_url" alt="Front Image" />
            </div>
          </SwiperSlide>
          <SwiperSlide v-if="item!.photo_back_url">
            <div class="swiper-zoom-container">
              <img :src="item!.photo_back_url" alt="Back Image" />
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
  IonContent, IonSkeletonText, IonChip, IonButton, IonHeader, IonModal,
} from '@ionic/vue'
import {onMounted, ref, nextTick, computed} from 'vue'
import { useRoute } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/plugins/supabaseClient'
import {Swiper, SwiperSlide} from "swiper/vue";
import router from "@/router";
import {Pagination, Zoom} from "swiper/modules";
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/zoom'
import AppHeader from "@/components/AppHeader.vue";
import {bagOutline} from "ionicons/icons";
import AddProductView from "@/views/add-product/AddProductView.vue";

const showEditModal = ref(false)
const route = useRoute()
const barcode = route.params.barcode as string

const loading = ref(true)
const isNative = ref(Capacitor.isNativePlatform())
const modules = [Pagination, Zoom];

const showAllIngredients = ref(false)
const maxVisible = 5

const ingredientDictionary = ref<Record<string, string>>({});

import type { Product } from '@/types/Product'

const item = ref<Product | null>(null)
const showImageModal = ref(false)
const activeImageIndex = ref(0)

// If this page should show ads (set meta accordingly), keep this true and include the slot.
// If you used meta:{noAds:true} you can leave the slot out and keep showAds = false.
const showAds = false // set true only if meta.adSpaceId is configured

function openImageModal(index: number) {
  activeImageIndex.value = index
  showImageModal.value = true
}
function closeImageModal() {
  showImageModal.value = false
}

function openEditModal() {
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

function statusToChipClass(status: string): string {
  switch (status) {
    case 'Halal':
      return 'chip-success'
    case 'Muslim-friendly':
      return 'chip-primary'
    case 'Syubhah':
      return 'chip-warning'
    case 'Haram':
      return 'chip-danger'
    default:
      return 'chip-medium'
  }
}

function goToReport(barcode: string) {
  if (!barcode) return
  // if you're closing a modal first, keep the small delay; otherwise you can remove it
  setTimeout(() => {
    router.push({ name: 'report', params: { barcode } })
  }, 300)
}

const visibleIngredients = computed(() => {
  if (!highlightedIngredients.value) return []
  return showAllIngredients.value
      ? highlightedIngredients.value
      : highlightedIngredients.value.slice(0, maxVisible)
})

const highlightedIngredients = computed(() => {
  if (!item.value || !item.value.ingredients) return []

  // 🚫 If product is Halal → return plain ingredients (no highlighting)
  if (item.value.status === 'Halal') {
    return item.value.ingredients
        .split(',')
        .map((p: string) => ({ html: p.trim(), highlighted: false }))
        .filter((p) => p.html.length > 0)
  }

  // ✅ Otherwise, do the highlight logic
  const rawIngredients: string = item.value.ingredients ?? ''
  const parts: string[] = rawIngredients
      .split(',')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0)

  const sortedKeys: string[] = Object.keys(ingredientDictionary.value)
      .sort((a: string, b: string) => b.length - a.length)

  const processed = parts.map((part: string) => {
    const lowerPart = part.toLowerCase()
    let matchedKey: string | null = null

    for (const key of sortedKeys) {
      if (lowerPart.includes(key.toLowerCase())) {
        matchedKey = key
        break
      }
    }

    if (matchedKey) {
      const color = ingredientDictionary.value[matchedKey]
      return {
        html: `<span style="font-weight:600;color:var(${color});">${part}</span>`,
        highlighted: true
      }
    } else {
      return { html: part, highlighted: false }
    }
  })

  processed.sort((a, b) => Number(b.highlighted) - Number(a.highlighted))
  return processed
})


const usedColors = computed(() => {
  if (!highlightedIngredients.value) return []
  // 🚫 Skip if Halal
  if (item.value?.status === 'Halal') return []

  const colorSet = new Set<string>()
  highlightedIngredients.value.forEach(ing => {
    if (ing.highlighted) {
      const match = ing.html.match(/var\((--ion-color-[^)]+)\)/)
      if (match) colorSet.add(match[1])
    }
  })
  return Array.from(colorSet)
})

// Map CSS colors to translation keys
const colorLabels: Record<string, string> = {
  '--ion-color-success': 'search.details.legend.halal',
  '--ion-color-primary': 'search.details.legend.muslimFriendly',
  '--ion-color-warning': 'search.details.legend.syubhah',
  '--ion-color-danger': 'search.details.legend.haram'
}

function colorToChipClass(color: string): string {
  switch (color) {
    case '--ion-color-success':
      return 'chip-success'
    case '--ion-color-primary':
      return 'chip-primary'
    case '--ion-color-warning':
      return 'chip-warning'
    case '--ion-color-danger':
      return 'chip-danger'
    default:
      return 'chip-medium'
  }
}

const isAdmin = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const [{ data: { user } }, prodRes, hlRes] = await Promise.all([
      supabase.auth.getUser(),   // 🟢 check current user
      supabase.from('products')
          .select('*')
          .eq('barcode', barcode)
          .maybeSingle(),
      supabase.from('ingredient_highlights')
          .select('keyword, color')
    ])

    // 🟢 If logged in, check role
    if (user) {
      const { data: roleRow, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()

      if (!roleError && roleRow?.role === 'admin') {
        isAdmin.value = true
      }
    }

    // product
    if (prodRes.error) {
      console.error('Product load error:', prodRes.error)
    } else {
      item.value = prodRes.data
    }

    // highlights
    if (hlRes.error) {
      console.error('Highlights load error:', hlRes.error)
    } else if (hlRes.data) {
      ingredientDictionary.value = Object.fromEntries(
          hlRes.data.map(h => [h.keyword, h.color])
      )
    }
  } finally {
    loading.value = false
    await nextTick()
    ;(window as any).scheduleBannerUpdate?.()
  }
})


</script>

<style>
.product-swiper {
  margin: 0 !important;
  padding: 0 !important;
  width: 100%;
  height: 300px; /* adjust as needed */
  border-radius: 0; /* full edge-to-edge */
}

.ingredient-legend {
  font-size: 14px;
  line-height: 1.6;
}

.ingredient-legend .legend-text {
  margin-left: 8px;
  color: var(--ion-color-medium);
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

.fullscreen-swiper .swiper-zoom-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.fullscreen-swiper img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
