<template>
  <ion-page>
    <ion-header>
      <app-header
          :title="$t('review.title')"
          :icon="listOutline"
          :showBack="true"
          backRoute="/search"
      />
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Skeleton while loading -->
      <div v-if="loadingProducts">
        <ion-list>
          <ion-item v-for="n in 5" :key="n">
            <ion-thumbnail slot="start">
              <ion-skeleton-text animated style="width: 64px; height: 64px; border-radius: 8px;" />
            </ion-thumbnail>
            <ion-label>
              <h2>
                <ion-skeleton-text animated style="width: 60%; height: 16px;" />
              </h2>
              <p>
                <ion-skeleton-text animated style="width: 40%; height: 14px;" />
              </p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- Product list -->
      <ion-list v-else-if="pendingProducts.length">
        <ion-item
            v-for="product in pendingProducts"
            :key="product.id"
            button
            detail
            @click="openProductModal(product)"
        >
          <ion-thumbnail slot="start">
            <img :src="product.photo_front_url" :alt="$t('review.imageAlt')" />
          </ion-thumbnail>
          <ion-label>
            <h2>{{ product.name }}</h2>
            <p>{{ product.barcode }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- No pending products -->
      <ion-text v-else color="medium">
        {{ $t('review.noPending') }}
      </ion-text>

      <!-- ✅ Product Detail Modal -->
      <ion-modal :is-open="showModal" @didDismiss="closeModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ $t('review.modalTitle') }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeModal">{{ $t('review.close') }}</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <ion-list v-if="selectedProduct">
            <!-- Barcode -->
            <ion-item>
              <ion-label position="stacked">{{ $t('review.barcode') }}</ion-label>
              <ion-input v-model="selectedProduct.barcode" readonly></ion-input>
            </ion-item>

            <!-- Product Name -->
            <ion-item>
              <ion-label position="stacked">{{ $t('review.name') }}</ion-label>
              <ion-input v-model="selectedProduct.name"></ion-input>
            </ion-item>

            <!-- Status -->
            <ion-item>
              <ion-label position="stacked">{{ $t('review.status') }}</ion-label>
              <ion-select v-model="selectedProduct.status" interface="popover">
                <ion-select-option value="Halal">{{ $t('review.statusHalal') }}</ion-select-option>
                <ion-select-option value="Muslim-friendly">{{ $t('review.statusMuslimFriendly') }}</ion-select-option>
                <ion-select-option value="Syubhah">{{ $t('review.statusSyubhah') }}</ion-select-option>
                <ion-select-option value="Haram">{{ $t('review.statusHaram') }}</ion-select-option>
              </ion-select>
            </ion-item>

            <!-- Category -->
            <ion-item>
              <ion-label position="stacked">{{ $t('review.category') }}</ion-label>
              <ion-select v-model="selectedProduct.product_category_id" interface="popover">
                <ion-select-option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </ion-select-option>
              </ion-select>
            </ion-item>

            <!-- Ingredients -->
            <div class="ion-margin-top ion-padding-horizontal">
              <ion-label class="ion-padding-bottom">
                <strong>{{ $t('review.ingredients') }}</strong>
              </ion-label>
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
                  {{ !showAllIngredients ? $t('review.viewMore') : $t('review.viewLess') }}
                </ion-button>
              </div>

              <!-- Color Legend -->
              <div v-if="usedColors.length" class="ion-margin-top ingredient-legend">
                <p><strong>{{ $t('review.colorLegend') }}</strong></p>
                <ion-chip
                    v-for="color in usedColors"
                    :key="color"
                    :class="colorToChipClass(color)"
                >
                  {{ $t(colorLabels[color]) }}
                </ion-chip>
              </div>
            </div>

            <!-- Description -->
            <ion-item>
              <ion-label position="stacked">{{ $t('review.description') }}</ion-label>
              <ion-textarea v-model="selectedProduct.description" auto-grow></ion-textarea>
            </ion-item>

            <!-- Images -->
            <div class="ion-margin-top ion-padding-horizontal">
              <ion-label class="ion-padding-bottom">
                <strong>{{ $t('review.images') }}</strong>
              </ion-label>
              <Swiper
                  :modules="modules"
                  :slides-per-view="1"
                  class="preview-swiper"
              >
                <SwiperSlide v-if="selectedProduct.photo_front_url">
                  <img
                      :src="selectedProduct.photo_front_url"
                      :alt="$t('review.frontImageAlt')"
                      style="width: 100%; cursor: pointer;"
                      @click="openImageModal(0)"
                  />
                </SwiperSlide>
                <SwiperSlide v-if="selectedProduct.photo_back_url">
                  <img
                      :src="selectedProduct.photo_back_url"
                      :alt="$t('review.backImageAlt')"
                      style="width: 100%; cursor: pointer;"
                      @click="openImageModal(1)"
                  />
                </SwiperSlide>
              </Swiper>
            </div>

            <!-- Approve / Reject buttons -->
            <div style="margin-top: 20px; display: flex; gap: 12px;">
              <ion-button expand="block" color="success" @click="approveProduct(selectedProduct)">
                {{ $t('review.approve') }}
              </ion-button>
              <ion-button expand="block" color="danger" @click="rejectProduct(selectedProduct.id)">
                {{ $t('review.reject') }}
              </ion-button>
            </div>
          </ion-list>
        </ion-content>

        <!-- ✅ Fullscreen Image Modal -->
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

            <!-- Swiper Gallery -->
            <Swiper
                v-if="selectedProduct"
                :modules="modules"
                :zoom="true"
                :slides-per-view="1"
                :pagination="{ clickable: true }"
                :initial-slide="activeImageIndex"
                class="fullscreen-swiper"
            >
              <SwiperSlide v-if="selectedProduct.photo_front_url">
                <div class="swiper-zoom-container">
                  <img :src="selectedProduct.photo_front_url" :alt="$t('review.frontImageAlt')" />
                </div>
              </SwiperSlide>
              <SwiperSlide v-if="selectedProduct.photo_back_url">
                <div class="swiper-zoom-container">
                  <img :src="selectedProduct.photo_back_url" :alt="$t('review.backImageAlt')" />
                </div>
              </SwiperSlide>
            </Swiper>
          </ion-content>
        </ion-modal>

      </ion-modal>
    </ion-content>
  </ion-page>
</template>



<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonContent,
  IonList,
  IonItem,
  IonThumbnail,
  IonLabel,
  IonButton,
  IonText,
  IonModal,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
    IonChip
} from '@ionic/vue'

import {ref, onMounted, computed} from 'vue'
import { supabase } from '@/plugins/supabaseClient'
import { listOutline } from 'ionicons/icons'
import AppHeader from '@/components/AppHeader.vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { reactive } from "vue"
import { Pagination, Zoom } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/zoom'

const categories = ref<{ id:number; name:string }[]>([])
const modules = [Pagination, Zoom]
const pendingProducts = ref<any[]>([])
const showModal = ref(false)
const selectedProduct = ref<any | null>(null)
const showImageModal = ref(false)
const activeImageIndex = ref(0)
const ingredientDictionary = ref<Record<string, string>>({})
const showAllIngredients = ref(false)
const maxVisible = 5
const loadingProducts = ref(true) // new state

// Ingredient entry type
interface IngredientEntry {
  html: string
  highlighted: boolean
}

const highlightedIngredients = computed<IngredientEntry[]>(() => {
  if (!selectedProduct.value || !selectedProduct.value.ingredients) return []

  // 🚫 If status = Halal → just return plain
  if (selectedProduct.value.status === 'Halal') {
    return selectedProduct.value.ingredients
        .split(',')
        .map((p: string): IngredientEntry => ({ html: p.trim(), highlighted: false }))
        .filter((p: IngredientEntry) => p.html.length > 0)
  }

  const parts: string[] = selectedProduct.value.ingredients
      .split(',')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0)

  const sortedKeys: string[] = Object.keys(ingredientDictionary.value)
      .sort((a: string, b: string) => b.length - a.length)

  const processed: IngredientEntry[] = parts.map((part: string): IngredientEntry => {
    const lower = part.toLowerCase()
    const key = sortedKeys.find((k: string) => lower.includes(k.toLowerCase()))
    if (key) {
      const color = ingredientDictionary.value[key]
      return {
        html: `<span style="font-weight:600;color:var(${color});">${part}</span>`,
        highlighted: true
      }
    }
    return { html: part, highlighted: false }
  })

  // ✅ sort so highlighted ones appear first
  processed.sort((a: IngredientEntry, b: IngredientEntry) => Number(b.highlighted) - Number(a.highlighted))

  return processed
})

const visibleIngredients = computed<IngredientEntry[]>(() => {
  return showAllIngredients.value
      ? highlightedIngredients.value
      : highlightedIngredients.value.slice(0, maxVisible)
})

const usedColors = computed<string[]>(() => {
  const set = new Set<string>()
  highlightedIngredients.value.forEach((ing: IngredientEntry) => {
    if (ing.highlighted) {
      const match = ing.html.match(/var\((--ion-color-[^)]+)\)/)
      if (match) set.add(match[1])
    }
  })
  return Array.from(set)
})

const colorLabels: Record<string, string> = {
  '--ion-color-success': 'Halal',
  '--ion-color-primary': 'Muslim-friendly',
  '--ion-color-warning': 'Syubhah',
  '--ion-color-danger': 'Haram'
}

function colorToChipClass(color: string): string {
  switch (color) {
    case '--ion-color-success': return 'chip-success'
    case '--ion-color-primary': return 'chip-primary'
    case '--ion-color-warning': return 'chip-warning'
    case '--ion-color-danger': return 'chip-danger'
    default: return 'chip-medium'
  }
}


async function loadCategories() {
  const { data, error } = await supabase.from("product_categories").select("id, name")
  if (!error && data) categories.value = data
}

function openImageModal(index: number) {
  activeImageIndex.value = index
  showImageModal.value = true
}

function closeImageModal() {
  showImageModal.value = false
}

async function loadPendingProducts() {
  loadingProducts.value = true
  const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('approved', false)
      .order('created_at', { ascending: false })

  if (!error && data) {
    pendingProducts.value = data
  }
  loadingProducts.value = false
}

function openProductModal(product: any) {
  // Create a reactive copy
  selectedProduct.value = reactive({ ...product })
  showModal.value = true
}

function closeModal() {
  selectedProduct.value = null
  showModal.value = false
}


async function approveProduct(product: any) {
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) return

  const { error } = await supabase
      .from("products")
      .update({
        name: product.name,
        status: product.status,
        product_category_id: product.product_category_id,
        ingredients: product.ingredients,
        description: product.description,
        approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq("id", product.id)

  if (!error) {
    loadPendingProducts()
    closeModal()
  }
}

async function rejectProduct(productId: string) {
  const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)

  if (!error) {
    loadPendingProducts()
    closeModal()
  }
}

onMounted( async () => {
  const { data, error } = await supabase
      .from('ingredient_highlights')
      .select('keyword, color')

  if (!error && data) {
    ingredientDictionary.value = Object.fromEntries(
        data.map(h => [h.keyword, h.color])
    )
  }

  await loadPendingProducts()
  await loadCategories()
})
</script>

<style>
.preview-swiper {
  margin-top: 5px;
  width: 100%;
  height: 180px; /* adjust as needed */
}

.preview-swiper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fullscreen-swiper {
  width: 100%;
  height: 100%;
  background: black;
}

.fullscreen-swiper img {
  width: 100%;
  height: auto;
  max-height: 100%;
  object-fit: contain;
}
</style>

