<template>
  <ion-page>
    <ion-header>
      <!-- Native (mobile) AdMob banner -->
      <div v-if="isNative && !isDonor" id="ad-space-search" style="height:65px;"></div>

      <app-header
          :title="
  activeStores.length === 1
    ? `${$t('search.title')} : ${activeStores[0].name}`
    : activeStores.length > 1
      ? `${$t('search.title')} (${activeStores.length})`
      : $t('search.title')
"
          :icon="gridOutline"
          :showProfile="true"
      />

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
            <ion-icon :icon="barcodeOutline" style="font-size: 22px;"/>
          </ion-button>
        </div>
      </ion-toolbar>

      <!-- Row: Filters -->
      <ion-toolbar class="search-toolbar">
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <ion-button
              fill="clear"
              size="small"
              class="sort-button"
          >
            <!-- ✅ Visible label (your typography) -->
            <ion-text class="toolbar-label ion-padding-horizontal">
              {{ sortLabel }}
            </ion-text>
            <ion-icon :icon="chevronDownOutline"/>

            <!-- ✅ Hidden controller -->
            <ion-select
                v-model="sortBy"
                interface="popover"
                class="hidden-select"
                :interface-options="{ cssClass: 'sort-popover' }"
            >
              <ion-select-option value="recent">
                🆕 Recently Added
              </ion-select-option>
              <ion-select-option value="views">
                🔥 Highest Viewed
              </ion-select-option>
              <!-- ✨ For You (only if logged in) -->
              <ion-select-option
                  v-if="canShowForYouSort"
                  value="for_you"
              >
                ✨ For You (Pro)
              </ion-select-option>
            </ion-select>
          </ion-button>


          <ion-button fill="clear" size="small" @click="toggleFilters">
            <ion-text class="toolbar-label ion-padding-horizontal">
              <ion-icon :icon="funnelOutline" style="vertical-align: middle; margin-right: 6px;"/>
              <strong>{{ $t('search.filtersLabel') }}</strong>
            </ion-text>

            <ion-icon :icon="showFilters ? chevronUpOutline : chevronDownOutline"/>
          </ion-button>
        </div>

        <transition name="collapse">
          <div v-show="showFilters" class="filter-section">

            <!-- Stores -->
            <div style="margin: 8px 0;">
              <div class="filter-title">
                <ion-icon :icon="storefrontOutline"/>
                {{ $t('search.filters.stores') }}
              </div>
              <div class="store-scroll">
                <template v-if="loadingStores">
                  <ion-skeleton-text
                      v-for="n in 10"
                      :key="'store-skeleton-' + n"
                      animated
                      class="skeleton-store"
                  />
                </template>
                <template v-else>
                  <StoreLogoBar
                      :stores="stores"
                      mode="filter"
                      v-model:activeStores="activeStores"
                  />
                </template>
              </div>
            </div>

            <!-- Categories -->
            <div style="margin: 8px 0;">
              <div class="filter-title">
                <ion-icon :icon="pricetagsOutline"/>
                {{ $t('search.filters.categories') }}
              </div>
              <div class="category-bar">
                <template v-if="loadingCategories">
                  <ion-skeleton-text
                      v-for="n in 4"
                      :key="'cat-skeleton-' + n"
                      animated
                      style="width: 100px; height: 28px; border-radius: 5px; margin-right: 8px;"
                  />
                </template>
                <template v-else>
                  <ion-chip
                      v-for="cat in categories"
                      :key="cat.id"
                      :class="[
  'category-chip',
  activeCategories.some(c => c.id === cat.id)
    ? 'chip-carrot'
    : 'chip-medium'
]"
                      @click="toggleCategory(cat)"
                  >
                    <ion-label>{{ categoryIcons[cat.name] || '📦' }} {{ cat.name }}</ion-label>
                  </ion-chip>
                </template>
              </div>
            </div>

            <!-- Status Filter -->
            <div style="margin: 8px 0;">
              <div class="filter-title">
                <ion-icon :icon="shieldCheckmarkOutline"/>
                {{ $t('search.filters.statuses') }}
              </div>
              <div class="category-bar">
                <ion-chip
                    v-for="status in statuses"
                    :key="status.key"
                    :class="[
    'category-chip',
    activeStatuses.includes(status.key)
      ? `chip-${STATUS_COLOR_MAP[status.key]}`
      : 'chip-medium'
  ]"
                    @click="toggleStatus(status.key)"
                >
                  <ion-label>
                    {{ status.emoji }} {{ $t(`search.status.${status.key}`) }}
                  </ion-label>
                </ion-chip>


              </div>
            </div>

            <!-- 🔥 Clear Filters -->
            <div class="filter-clear-row">
              <ion-chip
                  v-if="hasActiveFilters"
                  class="clear-chip"
                  @click="clearAllFilters"
              >
                ✕ Clear
              </ion-chip>
            </div>

          </div>
        </transition>


      </ion-toolbar>

    </ion-header>
    <ion-content ref="contentRef">
      <ion-refresher style="margin-top: 15px;" slot="fixed" @ionRefresh="refreshList">
        <ion-refresher-content
            :pulling-icon="chevronDownCircleOutline"
            :pullingText="$t('search.pullToRefresh')"
            refreshingSpinner="circles"
        >
        </ion-refresher-content>
      </ion-refresher>

      <!-- ✅ Scanner Modal (WEB ONLY) -->
      <ion-modal
          v-if="!isNative"
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
          <template v-if="loadingProducts && results.length === 0 && !showForYouGate">
            <ion-card v-for="n in 10" :key="'skeleton-' + n" class="product-card">
              <div style="display: flex; align-items: center;">
                <!-- Skeleton Image -->
                <ion-skeleton-text
                    animated
                    style="width: 115px; height: 115px; border-radius: 10px;"
                ></ion-skeleton-text>

                <!-- Skeleton Text & Chip -->
                <div
                    style="flex: 1; margin-left: 12px; display: flex; flex-direction: column; justify-content: space-between;">
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

          <!-- 🔒 For You (Non-Pro Gate MUST COME FIRST) -->
          <template v-if="showForYouGate">
            <ion-card class="for-you-info">
              <ion-card-content>
                <div class="for-you-row">
                  <ion-icon name="sparkles-outline" class="for-you-icon"/>
                  <div>
                    <strong>For You</strong>
                    <p>
                      You’re viewing <strong>For You</strong>.
                      This personalized feed unlocks with Halal Formosa Pro
                      and adapts to your activity over time.
                    </p>
                  </div>
                </div>

                <ion-button
                    color="carrot"
                    size="small"
                    expand="block"
                    @click="presentPaywall"
                >
                  Upgrade to Pro
                </ion-button>
              </ion-card-content>
            </ion-card>
          </template>


          <!-- 🧾 Empty state (ONLY for normal modes) -->
          <template v-else-if="!loadingProducts && results.length === 0">
            <ion-card>
              <ion-card-content>
                <p>😔 {{ $t('search.noProductFound') }}</p>
              </ion-card-content>
            </ion-card>
          </template>

          <!-- Actual product results -->
          <template v-else>
            <!-- ✨ For You Explanation -->
            <ion-card
                v-if="showForYouInfo && !hideForYouInfo"
                class="for-you-info"
            >
              <ion-card-content>
                <div class="for-you-row">
                  <ion-icon name="sparkles-outline" class="for-you-icon"/>
                  <div>
                    <strong>For You</strong>
                    <p>
                      We recommend halal and Muslim-friendly products based on what you’ve
                      interacted with before, while also introducing new items you haven’t seen yet.
                    </p>

                    <p
                        v-if="forYouReason"
                        style="margin-top:6px; font-size:12px; color:var(--ion-color-medium);"
                    >
                      💡 You’re seeing this because you often explore
                      <strong>{{ forYouReason }}</strong>.
                    </p>

                    <p
                        v-else
                        style="margin-top:6px; font-size:12px; color:var(--ion-color-medium);"
                    >
                      💡 We’re learning your preferences as you explore more products.
                    </p>
                  </div>
                </div>

                <ion-button fill="clear" size="small" @click="dismissForYouInfo">
                  Got it
                </ion-button>
              </ion-card-content>
            </ion-card>

            <ion-card
                class="product-card"
                v-for="product in results"
                :key="product.barcode"
                @click="openDetails(product)"
                :class="['product-card', getStatusClass(product.status)]"
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
                <div
                    style="flex: 1; margin-left: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <h5 style="margin: 0;">{{ product.name }}</h5>

                    <p style="margin: 4px 0; font-size: 12px; color: var(--ion-color-medium);">
                      👁️ Viewed {{ product.view_count || 0 }} times
                    </p>

                    <p style="margin: 0 0 8px 0; font-size: 13px;">
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
                      style="align-self: flex-start; font-size: 14px;"
                  >
                    {{ product.status }}
                  </ion-chip>
                </div>
              </div>
            </ion-card>
          </template>
        </div>
      </div>

      <!-- When there are results but we’ve loaded them all -->
      <ion-text v-if="allLoaded && results.length > 0" class="end-of-list">
        🙏 Sorry, you have reached the end
      </ion-text>

      <!-- bind the ref so we can disable/enable it -->
      <ion-infinite-scroll
          v-if="!showForYouGate"
          ref="infiniteScroll"
          @ionInfinite="loadMore"
          threshold="100px"
          :disabled="infiniteDisabled"
      >
        <ion-infinite-scroll-content
            loading-spinner="bubbles"
            :loading-text="$t('search.loadingMoreProduct')"
        />
      </ion-infinite-scroll>

      <ion-text color="danger" v-if="errorMsg" class="ion-padding">
        ❌ {{ errorMsg }}
      </ion-text>

      <!-- 🟠 FAB Add Product (only for admins) -->
      <ion-fab v-if="isAuthenticated" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="carrot" @click="goToAddProduct">
          <ion-icon :icon="addOutline"/>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <ion-footer>
      <div class="footer-count">
        <small>
          {{ $t('search.showingResults', {count: results.length, total: totalProductsCount}) }}
        </small>
      </div>
    </ion-footer>

  </ion-page>
</template>

<script setup lang="ts">

/* ---------------- Imports ---------------- */
import {
  IonPage, IonHeader, IonContent, IonSearchbar, IonText, IonModal, IonToolbar, IonButton, IonIcon, IonFooter, IonChip,
  IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher, IonRefresherContent,
  IonSkeletonText, IonThumbnail, IonCard, IonCardContent,
  onIonViewDidEnter, modalController, IonLabel, IonFab, IonFabButton, onIonViewWillEnter, IonSelect, IonSelectOption,
  toastController
} from '@ionic/vue'
import {ref, onMounted, nextTick, watch, computed} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import {supabase} from '@/plugins/supabaseClient'
import {
  barcodeOutline,
  chevronDownCircleOutline,
  gridOutline,
  addOutline,
  chevronUpOutline,
  chevronDownOutline,
  funnelOutline,
  pricetagsOutline, storefrontOutline, shieldCheckmarkOutline
} from 'ionicons/icons'
import {Capacitor} from '@capacitor/core'
import {
  CapacitorBarcodeScanner, CapacitorBarcodeScannerAndroidScanningLibrary,
  CapacitorBarcodeScannerCameraDirection, CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHintALLOption
} from '@capacitor/barcode-scanner'
import {Haptics, ImpactStyle} from '@capacitor/haptics'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
import AppHeader from '@/components/AppHeader.vue'

import StoreLogoBar from "@/components/StoreLogoBar.vue";
import {ActivityLogService} from "@/services/ActivityLogService";
import {isDonor, refreshSubscriptionStatus} from "@/composables/useSubscriptionStatus";
import {Purchases} from "@revenuecat/purchases-capacitor";
import {PAYWALL_RESULT, RevenueCatUI} from "@revenuecat/purchases-capacitor-ui";


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
  product_categories?: { name: string }
  ingredients?: string
  description?: string
  photo_front_url?: string
  photo_back_url?: string
  created_at?: string
  view_count?: number   // <-- ADD THIS LINE
}

const STATUS_COLOR_MAP: Record<string, string> = {
  'Halal': 'success',
  'Muslim-friendly': 'primary',
  'Syubhah': 'warning',
  'Haram': 'danger'
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
const activeCategories = ref<{ id: number; name: string }[]>([])

const loadingProducts = ref(true)
const loadingCategories = ref(true)
const loadingCount = ref(true)

const allLoaded = ref(false)
const isFetching = ref(false)

const pageSize = 15
const currentPage = ref(0)
const ingredientDictionary = ref<Record<string, string>>({})
const infiniteScroll = ref<HTMLIonInfiniteScrollElement | null>(null)
const suppressSortWatcher = ref(false)
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
  "Fresh Meat": "🥩",
}

const stores = ref<{ id: string; name: string; logo_url?: string }[]>([])
const activeStores = ref<{ id: string; name: string }[]>([])
const loadingStores = ref(true)
const showFilters = ref(false)


const statuses = [
  {key: 'Halal', emoji: '✅'},
  {key: 'Muslim-friendly', emoji: '🤝'},
  {key: 'Syubhah', emoji: '⚠️'},
  {key: 'Haram', emoji: '⛔'}
]

const sortBy = ref<'recent' | 'views' | 'for_you'>('recent')
const forYouReason = ref<string | null>(null)


const activeStatuses = ref<string[]>([])

function toggleFilters() {
  showFilters.value = !showFilters.value
}

type HTMLIonContentElement = HTMLElement & {
  getScrollElement: () => Promise<HTMLElement>
}

const contentRef = ref<any>(null)
const savedScrollTop = ref<number | null>(null)

const getIonContentEl = (): HTMLIonContentElement | null => {
  if (!contentRef.value) return null

  // Vue component → underlying web component
  const el = contentRef.value.$el ?? contentRef.value
  return el as HTMLIonContentElement
}

async function ensureRevenueCatLoggedIn() {
  if (!Capacitor.isNativePlatform()) return

  const {data} = await supabase.auth.getUser()
  if (!data?.user) return

  await Purchases.logIn({
    appUserID: data.user.id
  })

  console.log("🔐 RevenueCat logged in as:", data.user.id)
}

async function presentPaywall(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.warn("[RC] Paywall can only run on native (Android/iOS).");
    return false;
  }

  try {
    console.log("[RC] Presenting Paywall...");

    const {result} = await RevenueCatUI.presentPaywall();

    console.log("[RC] Paywall Result:", result);

    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
        console.log("[RC] 🎉 User purchased subscription!");
        return true;

      case PAYWALL_RESULT.RESTORED:
        console.log("[RC] 🔄 Subscription restored!");
        return true;

      case PAYWALL_RESULT.CANCELLED:
        console.log("[RC] User cancelled paywall.");
        return false;

      case PAYWALL_RESULT.ERROR:
        console.log("[RC] Paywall error.");
        return false;

      case PAYWALL_RESULT.NOT_PRESENTED:
      default:
        console.log("[RC] Paywall not presented.");
        return false;
    }

  } catch (e) {
    console.error("[RC] Paywall failed:", e);
    return false;
  }
}

async function loadForYouReason() {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return

  const {data} = await supabase.rpc(
      'get_user_product_preferences',
      {p_user_id: user.id}
  )

  if (!data || data.length === 0) {
    forYouReason.value = null
    return
  }

  const labels = data.map((d: any) => d.label)

  if (labels.length === 1) {
    forYouReason.value = labels[0]
  } else if (labels.length === 2) {
    forYouReason.value = `${labels[0]} and ${labels[1]}`
  } else {
    forYouReason.value = `${labels[0]}, ${labels[1]}, and ${labels[2]}`
  }
}


/* ---------------- Filters ---------------- */

watch([activeStores, activeCategories, activeStatuses, searchQuery, sortBy], () => {
  savedScrollTop.value = null; // reset scroll restore

  if (activeStores.value.length > 0) {
    ActivityLogService.log("search_filter_store", {
      store_ids: activeStores.value.map(s => s.id),
      store_names: activeStores.value.map(s => s.name),
    });
  }

  if (activeCategories.value.length > 0) {
    ActivityLogService.log("search_filter_category", {
      category_ids: activeCategories.value.map(c => c.id),
      category_names: activeCategories.value.map(c => c.name),
    });
  }

  if (activeStatuses.value.length > 0) {
    ActivityLogService.log("search_filter_status", {
      statuses: activeStatuses.value,
    });
  }


  allLoaded.value = false
  currentPage.value = 0
  infiniteDisabled.value = false   // 👈 reset infinite scroll
  fetchProducts(true)
})

watch(isDonor, (val) => {
  console.log("👀 [Watcher] isDonor changed:", val);
});

watch([sortBy, isDonor], async () => {
  if (sortBy.value === 'for_you' && isDonor.value) {
    await loadForYouReason()
  }
})

watch(sortBy, async (val) => {
  if (val !== 'for_you') {
    forYouReason.value = null
  }
})

watch(isAuthenticated, (loggedIn) => {
  if (!loggedIn && sortBy.value === 'for_you') {
    sortBy.value = 'recent'
  }
})

watch(sortBy, async (val) => {
  if (suppressSortWatcher.value) return
  if (val !== 'for_you') return

  // Non-Pro user
  if (!isDonor.value) {
    // ⛔ Web guard
    if (!Capacitor.isNativePlatform()) {
      const toast = await toastController.create({
        message: "✨ For You is available on mobile apps only.",
        duration: 2000,
        color: "medium",
        position: "bottom",
      })
      await toast.present()
      return
    }

    ActivityLogService.log("search_sort_change", {
      sort: val
    })

    ActivityLogService.log("pro_paywall_trigger", {
      source: "search_sort_for_you"
    })

    await ensureRevenueCatLoggedIn()
    const purchased = await presentPaywall()

    if (purchased) {
      await refreshSubscriptionStatus({syncToServer: true})
    }

    // 🔑 IMPORTANT:
    // Do NOT revert sortBy
    return
  }
})

const showForYouInfo = computed(() => {
  return sortBy.value === 'for_you' && isDonor.value
})

const showForYouGate = computed(() => {
  return sortBy.value === 'for_you' && !isDonor.value
})

const canShowForYouSort = computed(() => {
  return isAuthenticated.value
})


const hasActiveFilters = computed(() => {
  return (
      activeStores.value.length > 0 ||
      activeCategories.value.length > 0 ||
      activeStatuses.value.length > 0 ||
      searchQuery.value.length > 0
  )
})

function clearAllFilters() {
  activeStores.value = []
  activeCategories.value = []
  activeStatuses.value = []
  searchQuery.value = ''
}



const hideForYouInfo = ref(
    localStorage.getItem('hide_for_you_info') === '1'
)

function dismissForYouInfo() {
  hideForYouInfo.value = true
  localStorage.setItem('hide_for_you_info', '1')
}

const sortLabel = computed(() => {
  if (sortBy.value === 'for_you') return '✨ For You (Pro)'
  if (sortBy.value === 'views') return '🔥 Highest Viewed'
  return '🆕 Recently Added'
})

function toggleCategory(cat: { id: number; name: string }) {
  const index = activeCategories.value.findIndex(c => c.id === cat.id)

  if (index > -1) {
    activeCategories.value = activeCategories.value.filter(c => c.id !== cat.id)
  } else {
    activeCategories.value = [...activeCategories.value, cat]

  }
}

function toggleStatus(status: string) {
  if (activeStatuses.value.includes(status)) {
    activeStatuses.value = activeStatuses.value.filter(s => s !== status)
  } else {
    activeStatuses.value = [...activeStatuses.value, status]
  }
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
  await ActivityLogService.log("barcode_scan_start");

  if (scanning.value) return
  scanning.value = true

  try {
    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHintALLOption.ALL,
      scanInstructions: 'Align the barcode within the frame',
      cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
      scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
      android: {scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.MLKIT},
      web: {showCameraSelection: true, scannerFPS: 15}
    })

    if (result?.ScanResult) {
      await Haptics.impact({style: ImpactStyle.Medium})
      searchQuery.value = result.ScanResult

      const {data, error} = await supabase
          .from('products')
          .select('*')
          .or(`name.ilike.%${result.ScanResult}%,barcode.ilike.%${result.ScanResult}%`)
          .order('created_at', {ascending: false})

      results.value = error ? [] : (data || [])
      if (error) errorMsg.value = 'Failed to search products'
    }

    await ActivityLogService.log("barcode_scan_success", {
      barcode: result.ScanResult
    });
  } catch (err) {
    console.error('❌ Barcode scan failed:', err)

    await ActivityLogService.log("barcode_scan_error", {
      error: err || "unknown",
    });

  } finally {
    scanning.value = false
    if (route.query.scan === 'true') {
      router.replace({path: '/search'})
    }
  }
}

/* ---------------- Data Fetch ---------------- */
const fetchStores = async () => {
  loadingStores.value = true
  const {data, error} = await supabase
      .from("stores")
      .select("id, name, logo_url")
      .order("sort_order", {ascending: true})
  if (!error && data) stores.value = data
  loadingStores.value = false
}

const fetchCategories = async () => {
  loadingCategories.value = true
  const {data, error} = await supabase
      .from("product_categories")
      .select("id, name")
      .order("name", {ascending: true})

  if (!error && data) {
    categories.value = data
  }
  loadingCategories.value = false
}


const fetchProducts = async (reset = false) => {
  if (sortBy.value === 'for_you' && !isDonor.value) {
    results.value = []
    loadingProducts.value = false
    allLoaded.value = true
    return
  }

  if (isFetching.value || (allLoaded.value && !reset)) return
  isFetching.value = true

  if (reset) {
    currentPage.value = 0
    allLoaded.value = false
    allProducts.value = []
    infiniteDisabled.value = false
    results.value = [] // 👈 clear UI first
  }

  // Only show skeleton if it's the *first* load
  loadingProducts.value = reset

  try {
    const from = currentPage.value * pageSize
    const to = from + pageSize - 1

    let baseSelect =
        "barcode, name, status, view_count, created_at, photo_front_url, product_category_id, product_categories(name)";

    if (activeStores.value.length > 0) {
      baseSelect += ", product_stores!inner(store_id)";
    }

    let query = supabase
        .from("products")
        .select(baseSelect)
        .eq("approved", true);

// 🏬 Store filter (MULTIPLE)
    if (activeStores.value.length > 0) {
      const storeIds = activeStores.value.map(s => s.id);
      query = query.in("product_stores.store_id", storeIds);
    }

// 🏷 Category filter (MULTIPLE)
    if (activeCategories.value.length > 0) {
      const categoryIds = activeCategories.value.map(c => c.id);
      query = query.in("product_category_id", categoryIds);
    }

// 🛡 Status filter (MULTIPLE)
    if (activeStatuses.value.length > 0) {
      query = query.in("status", activeStatuses.value);
    }


    if (searchQuery.value) {
      query = query.or(
          `name.ilike.%${searchQuery.value}%,barcode.ilike.%${searchQuery.value}%`
      )
    }

    if (sortBy.value === 'views') {
      query = query.order('view_count', {ascending: false})
    } else {
      query = query.order('created_at', {ascending: false})
    }

    query = query.range(from, to)

    const {data, error} = await query.returns<Product[]>()

    if (error) {
      errorMsg.value = error.message
    } else {
      if (!data || data.length < pageSize) {
        allLoaded.value = true
      }

      // Merge results
      allProducts.value = reset ? data : [...allProducts.value, ...data];
      if (sortBy.value === 'for_you' && isDonor.value) {
        const {data, error} = await supabase.rpc(
            'get_for_you_products',
            {
              p_user_id: (await supabase.auth.getUser()).data.user?.id,
              p_limit: pageSize,
              p_offset: currentPage.value * pageSize,
            }
        )

        if (!error && data) {
          results.value = reset ? data : [...results.value, ...data]
        }
      } else {
        results.value = [...allProducts.value]
      }

      currentPage.value++;

    }
  } finally {
    isFetching.value = false
    loadingProducts.value = false
  }
}

const fetchTotalCount = async () => {
  loadingCount.value = true
  const {count, error} = await supabase
      .from('products')
      .select('barcode', {count: 'exact', head: true})
  if (error) {
    errorMsg.value = error.message
  } else {
    totalProductsCount.value = count || 0
  }
  loadingCount.value = false
}

/* ---------------- Search ---------------- */
const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const q = target.value.trim();
  searchQuery.value = q;

  if (q.length > 1) {   // only log if at least 2 chars
    ActivityLogService.log("search_query", {query: q});
  }
};

/* ---------------- UI helpers ---------------- */
function fromNowToTaipei(dateString?: string) {
  if (!dateString) return ''
  return dayjs.utc(dateString).tz('Asia/Taipei').fromNow()
}

const openDetails = async (product: Product) => {

  // ✅ safely read scroll position
  const ionContent = getIonContentEl()
  if (ionContent) {
    const scrollEl = await ionContent.getScrollElement()
    savedScrollTop.value = scrollEl.scrollTop
  }

  ActivityLogService.log("search_product_click", {
    barcode: product.barcode,
    product_name: product.name,
    status: product.status,
    store: activeStores.value.map(s => s.name),
    category: activeCategories.value.map(c => c.name),
    status_filters: activeStatuses.value,
    query_used: searchQuery.value || null
  });

  router.push({path: `/item/${product.barcode}`})
}

function goToAddProduct() {
  router.push('/add')
}

function getStatusClass(status: string) {
  switch (status) {
    case 'Halal':
      return 'status-halal'
    case 'Muslim-friendly':
      return 'status-muslim'
    case 'Syubhah':
      return 'status-syubhah'
    case 'Haram':
      return 'status-haram'
    default:
      return ''
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
  await ActivityLogService.log("search_page_open");

  // 🔹 Auth/session setup
  const {data: {session}} = await supabase.auth.getSession()
  isAuthenticated.value = !!session
  supabase.auth.onAuthStateChange((_event, session) => {
    isAuthenticated.value = !!session
  })

  // 🔹 Ingredient dictionary preload
  const {data, error} = await supabase.from('ingredient_highlights').select('keyword, color')
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
    fetchCategories(),
    fetchStores(),
  ])
})

onIonViewWillEnter(async () => {
  if (Capacitor.isNativePlatform()) refreshSubscriptionStatus();
})


onIonViewDidEnter(async () => {
  await ActivityLogService.log("search_page_open");
  // --- 🔥 Refresh view_count in one batch ---
  if (results.value.length > 0) {
    const barcodes = results.value.map(p => p.barcode);

    const {data: updatedCounts, error} = await supabase
        .from("products")
        .select("barcode, view_count")
        .in("barcode", barcodes);

    if (!error && updatedCounts) {
      for (const updated of updatedCounts) {
        const product = results.value.find(p => p.barcode === updated.barcode);
        if (product) product.view_count = updated.view_count;
      }
    }
  }

  // 🧭 RESTORE SCROLL POSITION
  if (savedScrollTop.value !== null) {
    await nextTick()
    const ionContent = getIonContentEl()
    if (ionContent) {
      const scrollEl = await ionContent.getScrollElement()
      scrollEl.scrollTo({
        top: savedScrollTop.value,
        behavior: 'auto'
      })
    }
  }

  // Refresh AdMob if needed
  (window as any).scheduleBannerUpdate?.();

  // Auto trigger scanner if route has scan=true
  if (route.query.scan === "true") {
    setTimeout(async () => {
      await startScan();
      router.replace({path: "/search"});
    }, 300);
  }
});


</script>


<style>
.footer-count {
  text-align: center;
  padding: 3px 0;
  font-size: 14px;
  color: var(--ion-color-medium);
  background: transparent;
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
    width: 400px; /* fixed width for better control */
    height: 300px; /* fixed height */
    border-radius: 8px; /* maybe larger radius for desktop */
  }
}

ion-chip {
  display: block;
  border-radius: 5px;
  width: 95%;
  text-align: center;
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
  border: 1px solid var(--border-color, transparent);
  box-shadow: var(--box-shadow, none);
  transition: box-shadow 0.3s, border 0.3s;
}

ion-card.status-halal {
  --border-color: rgba(0, 200, 83, 0.6);
  --box-shadow: 0 0 15px rgba(0, 200, 83, 0.4);
}

ion-card.status-muslim {
  --border-color: rgba(0, 123, 255, 0.6);
  --box-shadow: 0 0 15px rgba(0, 123, 255, 0.4);
}

ion-card.status-syubhah {
  --border-color: rgba(255, 193, 7, 0.6);
  --box-shadow: 0 0 15px rgba(255, 193, 7, 0.4);
}

ion-card.status-haram {
  --border-color: rgba(244, 67, 54, 0.6);
  --box-shadow: 0 0 15px rgba(244, 67, 54, 0.4);
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

.end-of-list {
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--ion-color-medium);
}

.collapse-enter-active,
.collapse-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 300px; /* adjust to fit content */
  opacity: 1;
}

.filter-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ion-color-dark);
  margin-left: 12px;
  margin-bottom: 6px;
}

.filter-title ion-icon {
  font-size: 14px;
}

.sort-button {
  position: relative;
  height: 32px; /* lock height */
  min-height: 32px;
  display: flex;
  align-items: center;
  text-transform: none;
}


.sort-button ion-select {
  padding: 0;
  margin: 0;
  font-weight: 600;
}

.sort-button::part(native) {
  padding: 0;
}

/* Hide select but keep it clickable */
.hidden-select {
  position: absolute;
  inset: 0;
  opacity: 0;
}

/* Shared toolbar typography */
.toolbar-label {
  font-size: 14px;
  font-weight: 600;
  text-transform: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-button {
  position: relative;
  text-transform: none;
}

/* Force neutral text color in toolbar controls */
.search-toolbar ion-button,
.search-toolbar ion-text,
.search-toolbar ion-icon {
  color: var(--ion-color-dark);
}

.for-you-info {
  border-left: 4px solid var(--ion-color-warning);
  margin-bottom: 12px;
}

.for-you-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.for-you-icon {
  font-size: 20px;
  color: var(--ion-color-warning);
  margin-top: 2px;
}

.for-you-info p {
  font-size: 13px;
  margin: 4px 0 0;
}

.filter-clear-row {
  display: flex;
  justify-content: flex-start;
  padding: 4px 12px 8px;
}

</style>