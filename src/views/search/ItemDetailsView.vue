<template>
  <ion-page>
    <ion-header>
      <app-header :title="$t('search.details.title')" show-back back-route="/search" :icon="bagOutline">
        <template #actions>
          <ion-item v-if="canEdit" button @click="editItem" lines="none">
            <ion-icon :icon="createOutline" slot="start" />
            <ion-label>Edit</ion-label>
          </ion-item>

          <ion-item button @click="reportItem" lines="none">
            <ion-icon :icon="alertCircleOutline" slot="start" />
            <ion-label>Report</ion-label>
          </ion-item>
        </template>
      </app-header>
    </ion-header>


    <!-- If this page should show ads, include this slot and set meta.adSpaceId above -->
    <div v-if="isNative && showAds" id="ad-space-item-details" style="height:60px;"></div>

    <ion-content>
      <div v-if="loading">
        <!-- Image carousel skeleton -->
        <ion-skeleton-text
            animated
            style="width: 100%; height: 300px;"
        />

        <div class="ion-padding-horizontal">
          <!-- Title -->
          <ion-skeleton-text
              animated
              style="width: 70%; height: 22px; margin-top: 16px;"
          />
          <!-- Barcode -->
          <ion-skeleton-text
              animated
              style="width: 40%; height: 16px; margin-top: 8px;"
          />

          <!-- Status chip -->
          <ion-skeleton-text
              animated
              style="width: 100%; height: 40px; border-radius: 5px; margin-top: 16px;"
          />

          <!-- Description header + text -->
          <ion-skeleton-text
              animated
              style="width: 50%; height: 16px; margin-top: 20px;"
          />
          <ion-skeleton-text
              animated
              style="width: 90%; height: 14px; margin-top: 8px;"
          />
          <ion-skeleton-text
              animated
              style="width: 85%; height: 14px; margin-top: 4px;"
          />

          <!-- Ingredients header + list -->
          <ion-skeleton-text
              animated
              style="width: 60%; height: 16px; margin-top: 20px;"
          />
          <div style="margin-top: 8px;">
            <ion-skeleton-text
                v-for="n in 4"
                :key="n"
                animated
                style="width: 90%; height: 14px; margin-bottom: 6px;"
            />
          </div>

          <!-- Action buttons -->
          <ion-skeleton-text
              animated
              style="width: 100%; height: 44px; border-radius: 4px; margin-top: 12px;"
          />
        </div>
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

          <!-- Barcode row -->
          <p style="margin-top: 3px; margin-bottom: 0; display: flex; align-items: center; justify-content: space-between;">
            <!-- Left side: barcode -->
            <span style="display: flex; align-items: center; gap: 6px;">
              <ion-icon :icon="barcodeOutline" style="font-size: 18px;" />
              <small>{{ item.barcode }}</small>
            </span>

            <!-- Right side: category -->
            <small>{{ item.product_categories?.name }}</small>
          </p>


          <!-- Status -->
          <p style="margin-top: 10px">
            <ion-chip :class="statusToChipClass(item.status)">
              {{ $t(`search.status.${item.status}`) }}
            </ion-chip>
          </p>

          <!-- Stores where this product is available -->
          <div v-if="item.stores?.length" class="ion-margin-top">
            <p>
              <strong><small>{{ $t('search.details.availableAt') }}</small></strong>
            </p>
            <StoreLogoBar
                :stores="item.stores"
                mode="readonly"
            />

          </div>

          <!-- Description -->
          <p class="ion-margin-top">
            <strong><small>{{ $t('search.details.description') }}</small></strong>
          </p>
          <h5
              class="ion-no-margin"
              style="margin-top: 2px"
              v-html="highlightedDescription"
          ></h5>

          <!-- Ingredients -->
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

          <!-- Color Legend -->
          <div v-if="usedColors.length" class="ion-margin-top ingredient-legend">
            <p><strong><small>{{ $t('search.details.colorLegend') }}</small></strong></p>
            <ion-chip
                v-for="color in usedColors"
                :key="color"
                :class="colorToChipClass(color)"
            >
              {{ $t(colorLabels[color]) }}
            </ion-chip>
          </div>

          <!-- Edit Modal -->
          <ion-modal :is-open="showEditModal" @didDismiss="closeEditModal">
            <AddProductView
                :edit-product="item!"
                @close="closeEditModal"
                @updated="handleProductUpdated"
            />
          </ion-modal>

          <!-- === Discover More Products in Same Category === -->
          <div v-if="relatedProducts.length">
            <div class="card-header-row" style="margin-top: 10px">
              <strong><small>{{ $t('search.details.relatedProducts') }}</small></strong>

            </div>
            <div class="discover-grid">
              <ion-card
                  v-for="p in relatedProducts"
                  :key="p.barcode"
                  class="discover-item"
                  button
                  @click="$router.replace(`/item/${p.barcode}`)"
              >
                <img
                    :src="p.photo_front_url || 'https://placehold.co/200x200'"
                    alt="product"
                    class="discover-img"
                />
                <ion-label class="discover-label">
                  <ion-chip
                      :class="statusToChipClass(p.status)"
                      style="font-size: 14px; margin-bottom: 4px;"
                  >
                    {{ p.status }}
                  </ion-chip>
                  <h3>{{ p.name }}</h3>
                  <p>Added {{ fromNowToTaipei(p.created_at) }}</p>
                </ion-label>
              </ion-card>
            </div>
          </div>

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
            class="image-modal-close-btn"
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
    IonIcon, IonItem, IonLabel, IonCard
} from '@ionic/vue'
import {onMounted, ref, nextTick, computed} from 'vue'
import { useRoute } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/plugins/supabaseClient'
import {Swiper, SwiperSlide} from "swiper/vue";
import {Pagination, Zoom} from "swiper/modules";
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/zoom'
import AppHeader from "@/components/AppHeader.vue";
import {alertCircleOutline, bagOutline, barcodeOutline, createOutline} from "ionicons/icons";
import AddProductView from "@/views/add-product/AddProductView.vue";
import { userRole, setUserRole } from '@/composables/userProfile'

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
import router from "@/router";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";
import StoreLogoBar from "@/components/StoreLogoBar.vue";
import {highlightIngredients} from "@/utils/useIngredientHighlighter";
import { statusToChipClass } from '@/utils/ingredientHelpers'

type RelatedProduct = {
  barcode: string
  name: string
  status: string
  photo_front_url?: string | null
  product_category_id: number | null
  created_at: string
}

const item = ref<Product | null>(null)
const showImageModal = ref(false)
const activeImageIndex = ref(0)
const relatedProducts = ref<RelatedProduct[]>([])

const colorPriority: Record<string, number> = {
  "--ion-color-danger": 1,   // haram
  "--ion-color-warning": 2,  // syubhah
  "--ion-color-primary": 3,  // Muslim-friendly
  "--ion-color-success": 4,  // halal (usually not used in highlight)
  "none": 5                  // neutral / unknown
};


// If this page should show ads (set meta accordingly), keep this true and include the slot.
// If you used meta:{noAds:true} you can leave the slot out and keep showAds = false.
const showAds = false // set true only if meta.adSpaceId is configured

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

function fromNowToTaipei(dateString?: string) {
  if (!dateString) return ''
  return dayjs.utc(dateString).tz('Asia/Taipei').fromNow()
}

function getColorFromHtml(html: string): string {
  const match = html.match(/var\((--ion-color-[^)]+)\)/)
  return match ? match[1] : "none"
}


async function fetchRelatedProducts() {
  if (!item.value?.product_category_id) return

  const firstWord = item.value.name.split(" ")[0].toLowerCase()

  // Fetch all products in the same category (or increase limit)
  const { data, error } = await supabase
      .from("products")
      .select("barcode, name, status, photo_front_url, product_category_id, created_at")
      .eq("approved", true)
      .eq("product_category_id", item.value.product_category_id)
      .neq("barcode", item.value.barcode)
      .order("created_at", { ascending: false })
      .limit(100) // ⬅ increase so we don’t cut off variants

  if (!error && data) {
    // All same-category products
    const allCategoryProducts = data

    // Variants with same brand/keyword
    const similar = allCategoryProducts.filter(p =>
        p.name.toLowerCase().includes(firstWord)
    )

    // Fallback: other products in same category
    const others = allCategoryProducts.filter(p =>
        !p.name.toLowerCase().includes(firstWord)
    )

    // Merge: similar first, then others
    const combined = [...similar, ...others].slice(0, 15) // cap display

    // Deduplicate
    relatedProducts.value = Array.from(
        new Map(combined.map(p => [p.barcode, p])).values()
    )
  }
}



function openImageModal(index: number) {
  activeImageIndex.value = index
  showImageModal.value = true
}
function closeImageModal() {
  showImageModal.value = false
}

const canEdit = computed(() => {
  if (!item.value) return false

  if (['admin', 'contributor'].includes(userRole.value || '')) {
    return true
  }

  return userId.value && item.value.added_by === userId.value
})


const userId = ref<string | null>(null)


function editItem() {
  // Open your edit modal
  showEditModal.value = true
}

function reportItem() {
  if (!item.value) return
  // Navigate to the report page
  router.push({ name: 'report', params: { barcode: item.value.barcode } })
}

function closeEditModal() {
  showEditModal.value = false
}


async function handleProductUpdated() {
  showEditModal.value = false
  const { data, error } = await supabase
      .from('products')
      .select(`
    *,
    product_categories ( id, name ),
    product_stores (
      store_id,
      stores ( id, name, logo_url )
    )
  `)
      .eq('barcode', barcode)
      .maybeSingle()

  if (!error && data) {
    item.value = {
      ...data,
      stores: data.product_stores?.map((ps: any) => ps.stores) || []
    }
  }
}

const visibleIngredients = computed(() => {
  if (!highlightedIngredients.value) return []
  return showAllIngredients.value
      ? highlightedIngredients.value
      : highlightedIngredients.value.slice(0, maxVisible)
})

type HighlightedIngredient = {
  html: string
  highlighted: boolean
}

const highlightedIngredients = computed(() => {
  if (!item.value || !item.value.ingredients) return []

  // 🚫 If product is Halal → no highlighting
  if (item.value.status === "Halal") {
    return item.value.ingredients
        .split(",")
        .map((p: string) => ({ html: p.trim(), highlighted: false }))
        .filter(p => p.html.length > 0)
  }

  // ✅ use the new helper
  return highlightIngredients(
      item.value.ingredients,
      ingredientDictionary.value,
      item.value.status
  ).sort((a: HighlightedIngredient, b: HighlightedIngredient) => {
    const colorA = getColorFromHtml(a.html)
    const colorB = getColorFromHtml(b.html)

    return colorPriority[colorA] - colorPriority[colorB]
  })
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

const highlightedDescription = computed(() => {
  if (!item.value?.description) return ""

  // Words to highlight (lowercase check)
  const keywords: Record<string, string> = {
    "halal": "--ion-color-success",
    "muslim-friendly": "--ion-color-primary",
    "vegan": "--ion-color-primary",
    "syubhah": "--ion-color-warning",
  }

  let text = item.value.description

  // Replace each keyword with a span
  for (const [word, color] of Object.entries(keywords)) {
    const regex = new RegExp(`(${word})`, "gi")
    text = text.replace(
        regex,
        `<span style="font-weight:600; color: var(${color});">$1</span>`
    )
  }

  return text
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

onMounted(async () => {
  loading.value = true
  try {
    const [{ data: { user } }, prodRes, hlRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('products')
          .select(`
        *,
        product_categories ( id, name ),
        product_stores (
          store_id,
          stores ( id, name, logo_url )
        )
      `)
          .eq('barcode', barcode)
          .maybeSingle(),
      supabase.from('ingredient_highlights')
          .select('keyword, color')
    ])

    // role check…
    if (user) {
      userId.value = user.id

      const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()

      setUserRole(roleRow?.role || 'user')
    }

    // product
    if (prodRes.error) {
      console.error('Product load error:', prodRes.error)
    } else {
      item.value = prodRes.data
    }

    if (prodRes.data) {
      item.value = {
        ...prodRes.data,
        stores: prodRes.data.product_stores?.map((ps: any) => ({
          id: ps.stores.id as string,   // 👈 assert UUID string
          name: ps.stores.name,
          logo_url: ps.stores.logo_url ?? undefined,
        })) || []
      }
      await fetchRelatedProducts()
    }

    // highlights…
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

ion-skeleton-text {
  --background: linear-gradient(90deg, #e0e0e0 25%, #f2f2f2 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.image-modal-close-btn {
  position: absolute;
  /* account for safe area + header */
  top: calc(env(safe-area-inset-top, 0px) + var(--ion-safe-area-top, 0px) + 56px);
  right: 16px;
  z-index: 9999;
}
</style>
