<template>
  <ion-page>
    <ion-header>
      <app-header :title="$t('search.title')" :icon="gridOutline" :showProfile="true" />
      <ion-toolbar style="padding: 8px;">
        <div style="display: flex; align-items: center; width: 100%; gap: 8px;">
          <!-- Searchbar -->
          <ion-searchbar
              :placeholder="$t('search.placeholder')"
              :debounce="1000"
              @ionInput="handleSearchInput($event)"
              :value="searchQuery"
              class="rounded"
              style="flex: 1;"
          ></ion-searchbar>

          <!-- Scan Button (Styled like FAB but inline) -->
          <ion-button
              @click="startScan"
              v-if="!scanning"
              color="carrot"
              style="
              width: 30px;
              height: 50px;
              min-width: 50px;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              "
          >
            <ion-icon :icon="barcodeOutline" style="font-size: 22px;" />
          </ion-button>
        </div>
      </ion-toolbar>
      <ion-toolbar class="search-toolbar">
        <div class="category-bar">
          <!-- ✅ Skeletons while loading -->
          <template v-if="loadingCategories">
            <ion-skeleton-text
                v-for="n in 4"
                :key="'cat-skeleton-' + n"
                animated
                style="width: 100px; height: 28px; border-radius: 5px; margin-right: 8px;"
            />
          </template>

          <!-- ✅ Real categories -->
          <template v-else>
            <ion-chip
                v-for="cat in categories"
                :key="cat.id"
                :class="['category-chip', activeCategory?.id === cat.id ? 'chip-carrot' : 'chip-medium']"
                @click="toggleCategory(cat)"
            >
              <ion-label>{{ categoryIcons[cat.name] || "📦" }} {{ cat.name }}</ion-label>
            </ion-chip>
          </template>
        </div>
      </ion-toolbar>

    </ion-header>
    <!-- Native (mobile) AdMob banner -->
    <div v-if="isNative && !isDonor" id="ad-space-search" style="height:60px;"></div>

    <ion-content>
      <ion-refresher style="margin-top: 15px;" slot="fixed" @ionRefresh="refreshList">
        <ion-refresher-content
            :pulling-icon="chevronDownCircleOutline"
            :pullingText="$t('search.pullToRefresh')"
            refreshingSpinner="circles"
        >
        </ion-refresher-content>
      </ion-refresher>

      <!-- ✅ Scanner Modal -->
      <ion-modal
          ref="scannerModal"
          :is-open="scanning"
          @didDismiss="handleDismiss"
      >
        <ion-content @click="dismissModal">
          <div id="reader">
            <div class="scan-line"></div>
          </div>
        </ion-content>
      </ion-modal>


      <div>
        <div v-if="!scanning" class="ion-padding" style="padding-top: 5px;">

          <!-- Skeleton loader -->
          <template v-if="loadingProducts && results.length === 0">
            <ion-card v-for="n in 10" :key="'skeleton-' + n" class="product-card">
              <div style="display: flex; align-items: center;">
                <!-- Skeleton Image -->
                <ion-skeleton-text
                    animated
                    style="width: 115px; height: 115px; border-radius: 10px;"
                ></ion-skeleton-text>

                <!-- Skeleton Text & Chip -->
                <div style="flex: 1; margin-left: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <ion-skeleton-text
                        animated
                        style="width: 70%; height: 20px; margin-bottom: 8px;"
                    ></ion-skeleton-text>
                    <ion-skeleton-text
                        animated
                        style="width: 50%; height: 14px;"
                    ></ion-skeleton-text>
                  </div>

                  <!-- Skeleton Chip -->
                  <ion-skeleton-text
                      animated
                      style="width: 80px; height: 28px; border-radius: 12px; margin-top: 12px;"
                  ></ion-skeleton-text>
                </div>
              </div>
            </ion-card>
          </template>

          <!-- Empty state -->
          <template v-else-if="!loadingProducts && results.length === 0">
            <ion-card>
              <ion-card-content>
                <p>😔 {{ $t('search.noProductFound') }} </p>
              </ion-card-content>
            </ion-card>
          </template>

          <!-- Actual product results -->
          <template v-else>
            <ion-card
                class="product-card"
                v-for="product in results"
                :key="product.barcode"
                @click="openDetails(product)"
                :class="getStatusClass(product.status)"
            >
              <div style="display: flex; align-items: center;">
                <!-- Image -->
                <ion-thumbnail slot="start" style="width: 115px; height: 115px; border-radius: 10px; overflow: hidden;">
                  <img
                      loading="lazy"
                      :src="product.photo_front_url || 'https://via.placeholder.com/80.webp'"
                      :alt="product.name"
                      style="object-fit: cover; width: 100%; height: 100%; border-radius: 8px;"
                  />
                </ion-thumbnail>

                <!-- Info block -->
                <div style="flex: 1; margin-left: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <h5 style="margin: 0;">{{ product.name }}</h5>
                    <p style="margin: 4px 0 8px 0; font-size: 13px;">
                      Added {{ fromNowToTaipei(product.created_at) }}
                    </p>
                  </div>

                  <!-- Status -->
                  <ion-chip
                      :class="product.status === 'Halal' ? 'chip-success'
    : product.status === 'Muslim-friendly' ? 'chip-primary'
    : product.status === 'Syubhah' ? 'chip-warning'
    : product.status === 'Haram' ? 'chip-danger'
    : 'chip-medium'"
                      style="align-self: flex-start; border-radius: 12px; font-size: 14px;"
                  >
                    {{ product.status }}
                  </ion-chip>
                </div>
              </div>
            </ion-card>
          </template>
        </div>
      </div>

      <!-- bind the ref so we can disable/enable it -->
      <ion-infinite-scroll
          ref="infiniteScroll"
          @ionInfinite="loadMore"
          threshold="100px"
          :disabled="infiniteDisabled"
      >
        <ion-infinite-scroll-content
            loading-spinner="bubbles"
            loading-text="Loading more products..."
        />
      </ion-infinite-scroll>

      <ion-text color="danger" v-if="errorMsg" class="ion-padding">
        ❌ {{ errorMsg }}
      </ion-text>

      <!-- 🟠 FAB Add Product (only for admins) -->
      <ion-fab v-if="isAuthenticated" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="carrot" @click="goToAddProduct">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <ion-footer >
      <ion-toolbar>
        <ion-text class="product-count" color="medium">
          <small>
            {{ $t('search.showingResults', { count: results.length, total: totalProductsCount }) }}
          </small>
        </ion-text>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">

/* ---------------- Imports ---------------- */
import {
  IonPage, IonHeader, IonContent, IonSearchbar, IonText, IonModal, IonToolbar, IonButton, IonIcon, IonFooter, IonChip,
  IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher, IonRefresherContent,
  IonSkeletonText, IonThumbnail, IonCard, IonCardContent,
  onIonViewDidEnter, modalController, IonLabel, IonFab, IonFabButton
} from '@ionic/vue'
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/plugins/supabaseClient'
import {
  barcodeOutline, chevronDownCircleOutline, gridOutline, addOutline
} from 'ionicons/icons'
import { Capacitor } from '@capacitor/core'
import {
  CapacitorBarcodeScanner, CapacitorBarcodeScannerAndroidScanningLibrary,
  CapacitorBarcodeScannerCameraDirection, CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHintALLOption
} from '@capacitor/barcode-scanner'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
import AppHeader from '@/components/AppHeader.vue'
import { isDonor } from '@/composables/userProfile'

/* ---------------- Day.js ---------------- */
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

/* ---------------- Types ---------------- */
interface Product {
  barcode: string
  name: string
  status: string
  category_id?: number
  product_categories?: { name: string } // fixed
  ingredients?: string
  description?: string
  photo_front_url?: string
  photo_back_url?: string
  created_at?: string
}


/* ---------------- State ---------------- */
const router = useRouter()
const route = useRoute()
const infiniteDisabled = ref(false)
const isAuthenticated = ref(false)

const totalProductsCount = ref(0)
const allProducts = ref<Product[]>([])
const results = ref<Product[]>([])
const errorMsg = ref('')
const scanning = ref(false)
const searchQuery = ref('')
const categories = ref<{ id: number; name: string }[]>([])
const activeCategory = ref<{id:number, name:string} | null>(null)

const loadingProducts = ref(true)
const loadingCategories = ref(true)
const loadingCount = ref(true)

const allLoaded = ref(false)
const isFetching = ref(false)

const pageSize = 15
const currentPage = ref(0)
const ingredientDictionary = ref<Record<string, string>>({})
const infiniteScroll = ref<HTMLIonInfiniteScrollElement | null>(null)

const isNative = ref(Capacitor.isNativePlatform())

const categoryIcons: Record<string, string> = {
  "Snacks": "🍿",
  "Confectionery": "🍬",
  "Sauces & Seasonings": "🧂",
  "Dairy & Ice Cream": "🍦",
  "Cereal & Grains": "🌾",
  "Instant Noodles": "🍜",
  "Beverages": "🥤",
  "Spices & Condiments": "🌶️",
  "Vegetarian & Tofu": "🥗",
}

/* ---------------- Filters ---------------- */
const toggleCategory = async (cat: {id:number, name:string}) => {
  activeCategory.value = activeCategory.value?.id === cat.id ? null : cat
  await fetchProducts(true)
}
/* ---------------- Scanner ---------------- */
function handleDismiss() {
  scanning.value = false
  stopScan()
}
function stopScan() {
  console.log('Scanner stopped / cleanup here')
}
function dismissModal() {
  modalController.dismiss()
}

async function startScan() {
  if (scanning.value) return
  scanning.value = true

  try {
    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHintALLOption.ALL,
      scanInstructions: 'Align the barcode within the frame',
      cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
      scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
      android: { scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.MLKIT },
      web: { showCameraSelection: true, scannerFPS: 15 }
    })

    if (result?.ScanResult) {
      await Haptics.impact({ style: ImpactStyle.Medium })
      searchQuery.value = result.ScanResult

      const { data, error } = await supabase
          .from('products')
          .select('*')
          .or(`name.ilike.%${result.ScanResult}%,barcode.ilike.%${result.ScanResult}%`)
          .order('created_at', { ascending: false })

      results.value = error ? [] : (data || [])
      if (error) errorMsg.value = 'Failed to search products'
    }
  } catch (err) {
    console.error('❌ Barcode scan failed:', err)
  } finally {
    scanning.value = false
    if (route.query.scan === 'true') {
      router.replace({ path: '/search' })
    }
  }
}

/* ---------------- Data Fetch ---------------- */
const fetchCategories = async () => {
  loadingCategories.value = true
  const { data, error } = await supabase
      .from("product_categories")
      .select("id, name")
      .order("name", { ascending: true })

  if (!error && data) {
    categories.value = data
  }
  loadingCategories.value = false
}


const fetchProducts = async (reset = false) => {
  loadingProducts.value = true
  if (isFetching.value || (allLoaded.value && !reset)) return
  isFetching.value = true
  if (reset) {
    currentPage.value = 0
    allLoaded.value = false
    allProducts.value = []
  }

  try {
    const from = currentPage.value * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from("products")
        .select("*, product_categories(name)")   // ❌ removed count
        .eq("approved", true)

    if (activeCategory.value) {
      query = query.eq("product_category_id", activeCategory.value.id)
    }

    if (searchQuery.value) {
      query = query.or(`name.ilike.%${searchQuery.value}%,barcode.ilike.%${searchQuery.value}%`)
    }

    query = query.order("created_at", { ascending: false }).range(from, to)

    const { data, error } = await query
    if (error) {
      errorMsg.value = error.message
    } else {
      if (!data || data.length < pageSize) {
        allLoaded.value = true
        infiniteDisabled.value = true
      } else {
        infiniteDisabled.value = false
      }

      allProducts.value = reset ? (data || []) : [...allProducts.value, ...(data || [])]
      results.value = [...allProducts.value]
      currentPage.value++
    }
  } finally {
    isFetching.value = false
    loadingProducts.value = false
  }
}


const fetchTotalCount = async () => {
  loadingCount.value = true
  const { count, error } = await supabase
      .from('products')
      .select('barcode', { count: 'exact', head: true })
  if (error) {
    errorMsg.value = error.message
  } else {
    totalProductsCount.value = count || 0
  }
  loadingCount.value = false
}

/* ---------------- Search ---------------- */
const handleSearchInput = async (event: Event) => {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value.trim()
  await fetchProducts(true) // reset and fetch from page 1
}


/* ---------------- UI helpers ---------------- */
function fromNowToTaipei(dateString?: string) {
  if (!dateString) return ''
  return dayjs.utc(dateString).tz('Asia/Taipei').fromNow()
}

const openDetails = (product: Product) => {
  router.push({path: `/item/${product.barcode}`})
}


function goToAddProduct() {
  router.push('/add')
}

function getStatusClass(status: string) {
  switch (status) {
    case 'Halal': return 'status-halal'
    case 'Muslim-friendly': return 'status-muslim'
    case 'Syubhah': return 'status-syubhah'
    case 'Haram': return 'status-haram'
    default: return ''
  }
}

/* ---------------- Infinite Scroll ---------------- */
const loadMore = async (event: Event) => {
  await fetchProducts()
  ;(event.target as HTMLIonInfiniteScrollElement).complete()
}


async function refreshList(event: CustomEvent) {
  try {
    await nextTick()
    infiniteDisabled.value = false   // ✅ reactive instead of mutating prop

    await Promise.all([
      fetchProducts(true),
      fetchTotalCount(),
    ])
  } finally {
    event.detail.complete()
  }
}


/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  // 🔹 Auth/session setup
  const { data: { session } } = await supabase.auth.getSession()
  isAuthenticated.value = !!session
  supabase.auth.onAuthStateChange((_event, session) => {
    isAuthenticated.value = !!session
  })

  // 🔹 Ingredient dictionary preload
  const { data, error } = await supabase.from('ingredient_highlights').select('keyword, color')
  if (!isNative.value) {
    await nextTick()
  }
  if (!error && data) {
    ingredientDictionary.value = data.reduce((acc, item) => {
      acc[item.keyword] = item.color
      return acc
    }, {} as Record<string, string>)
  }

  // 🔹 Initial data load
  await Promise.all([
    fetchProducts(true),
    fetchTotalCount(),
    fetchCategories()
  ])
})


onIonViewDidEnter(async () => {
  (window as any).scheduleBannerUpdate?.()
  if (route.query.scan === 'true') {
    setTimeout(async () => {
      await startScan()
      router.replace({ path: '/search' })
    }, 300)
  }
})
</script>


<style>
.product-count {
  display: block;
  text-align: center;
}

#reader {
  width: 100%;
  max-height: 100%;
  border-radius: 8px;
  overflow: hidden;
  margin: 0 auto; /* center horizontally */
}

/* For larger screens */
@media (min-width: 768px) {
  #reader {
    width: 400px;       /* fixed width for better control */
    height: 300px;      /* fixed height */
    border-radius: 8px; /* maybe larger radius for desktop */
  }
}

ion-chip {
  display: block;
  border-radius: 5px;
  width: 95%;
  text-align: center;
}

ion-skeleton-text {
  --background: linear-gradient(90deg, #e0e0e0 25%, #f2f2f2 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

ion-searchbar.rounded {
  --border-radius: 8px;
  --box-shadow: 0 1px 3px rgba(41, 40, 40, 0.1);
}

.product-card {
  transition: box-shadow 0.3s, border 0.3s;
  cursor: pointer;
}

/* ✅ Halal = green glow */
.status-halal {
  border: 1px solid rgba(0, 200, 83, 0.2);
  box-shadow: 0 0 15px rgba(0, 200, 83, 0.2);
}

/* ✅ Muslim-friendly = blue glow */
.status-muslim {
  border: 1px solid rgba(0, 123, 255, 0.2);
  box-shadow: 0 0 15px rgba(0, 123, 255, 0.2);
}

/* ⚠️ Syubhah = yellow/orange glow */
.status-syubhah {
  border: 1px solid rgba(255, 193, 7, 0.2);
  box-shadow: 0 0 15px rgba(255, 193, 7, 0.2);
}

/* ❌ Haram = red glow */
.status-haram {
  border: 1px solid rgba(244, 67, 54, 0.2);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.3);
}

.category-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 6px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.category-bar::-webkit-scrollbar {
  display: none;
}
.category-chip {
  font-size: 13px;
  flex-shrink: 0;
  width: auto;
}
.chip-carrot {
  background: var(--ion-color-carrot);
  color: white;
}

</style>