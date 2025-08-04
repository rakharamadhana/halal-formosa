<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title class="title-brand">
          <img
              src="/favicon-32x32.png"
              alt="Halal Formosa"
              style="height: 32px; vertical-align: middle; margin-right: 3px;"
          />
          Halal Formosa
        </ion-title>
      </ion-toolbar>
      <ion-toolbar >
        <ion-searchbar
            placeholder="Search product (e.g. Water)"
            :debounce="1000"
            @ionInput="handleSearchInput($event)"
            style="flex-grow: 1;"
            :value="searchQuery"
            class="rounded"
        ></ion-searchbar>

        <ion-buttons slot="end">
          <ion-button @click="startScan" aria-label="Scan barcode" :disabled="scanning">
            <ion-icon :icon="barcodeOutline" />
          </ion-button>
          <ion-button v-if="scanning" @click="stopScan" color="danger">
            <ion-icon :icon="stopCircleOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="refreshList">
        <ion-refresher-content
            :pulling-icon="chevronDownCircleOutline"
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
            refreshingText="Refreshing...">
        </ion-refresher-content>
      </ion-refresher>

      <div v-if="scanning" id="reader"></div>

      <div>
        <div v-if="!scanning" class="ion-padding">

          <!-- Skeleton loader -->
          <template v-if="loading && results.length === 0">
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
          <template v-else-if="results.length === 0">
            <ion-card>
              <ion-card-content>
                <p>😔 Sorry, no product found...</p>
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
                      :color="product.status === 'Halal' ? 'success'
                : product.status === 'Muslim-friendly' ? 'primary'
                : product.status === 'Syubhah' ? 'warning'
                : product.status === 'Haram' ? 'danger'
                : 'medium'"
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

      <ion-infinite-scroll ref="infiniteScroll" @ionInfinite="loadMore" threshold="100px">
        <ion-infinite-scroll-content
            loading-spinner="bubbles"
            loading-text="Loading more products...">
        </ion-infinite-scroll-content>
      </ion-infinite-scroll>

      <ion-text color="danger" v-if="errorMsg" class="ion-padding">
        ❌ {{ errorMsg }}
      </ion-text>

      <ion-modal :is-open="!!selectedProduct" @didDismiss="closeDetails">
        <ion-header>
          <ion-toolbar>
            <ion-title>Product Details</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeDetails">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <div v-if="selectedProduct">
            <!-- Swiper carousel for images -->
            <swiper
                v-if="selectedProduct.photo_front_url || selectedProduct.photo_back_url"
                :modules="modules"
                :scrollbar="true"
                :zoom="true"
                :slides-per-view="1"
                :pagination="{ clickable: true }"
                style="width: 100%; height: 300px; border-radius: 8px; overflow: hidden;"
            >
              <swiper-slide v-if="selectedProduct.photo_front_url">
                <img
                    :src="selectedProduct.photo_front_url"
                    alt="Front Image"
                    style="width: 100%; height: 100%; object-fit: cover; object-position: center;"
                />
              </swiper-slide>
              <swiper-slide v-if="selectedProduct.photo_back_url">
                <img
                    :src="selectedProduct.photo_back_url"
                    alt="Back Image"
                    style="width: 100%; height: 100%; object-fit: cover; object-position: center;"
                />
              </swiper-slide>
            </swiper>

            <!-- Details below the slider -->
            <div style="margin-top: 1rem;">
              <h2 style="margin-bottom: 0;">{{ selectedProduct.name }}</h2>
              <p style="margin-top: 3px; margin-bottom: 0;"><small>{{ selectedProduct.barcode }}</small></p>
              <p style="margin-top: 10px"><ion-chip
                  :color="
                selectedProduct.status === 'Halal' ? 'success' :
                selectedProduct.status === 'Muslim-friendly' ? 'primary' :
                selectedProduct.status === 'Syubhah' ? 'warning' :
                selectedProduct.status === 'Haram' ? 'danger' :
                'medium'
              "
              >
                {{ selectedProduct.status }}
              </ion-chip></p>

              <p class="ion-margin-top"><strong><small>Description</small></strong></p>
              <h5 class="ion-no-margin" style="margin-top: 2px">{{ selectedProduct.description }}</h5>

              <p class="ion-margin-top"><strong><small>Ingredients</small></strong></p>
              <h5 class="ion-no-margin" style="margin-top: 2px">
                <template v-if="selectedProduct.status !== 'Halal'">
                  <span v-html="highlightedIngredients"></span>
                </template>
                <template v-else>
                  {{ selectedProduct.ingredients }}
                </template>
              </h5>
            </div>
          </div>

          <ion-button
              v-if="selectedProduct"
              class="ion-margin-top"
              expand="block"
              color="medium"
              @click="goToReport(selectedProduct.barcode)"
          >
            Report Product
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>

    <ion-footer >
      <ion-toolbar>
        <ion-text class="product-count" color="medium">
          <small>
            Showing {{ results.length }} of {{ totalProductsCount }} registered products
          </small>
        </ion-text>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
import {
  IonPage,
  IonHeader,
  IonContent,
  IonSearchbar,
  IonText,
  IonModal,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonFooter,
  onIonViewWillEnter,
  IonChip,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
    IonSkeletonText,
    IonThumbnail,
    IonCard,
  IonCardContent
} from '@ionic/vue';
import { defineComponent, ref, onMounted, nextTick } from 'vue';
import { Pagination, Zoom } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { barcodeOutline, stopCircleOutline, chevronDownCircleOutline } from 'ionicons/icons';
import { supabase } from '@/plugins/supabaseClient';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useRouter } from 'vue-router';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/zoom';

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Extend dayjs
dayjs.extend(utc)
dayjs.extend(timezone)

import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

import { computed } from 'vue'

interface Product {
  barcode: string;
  name: string;
  status: string;
  ingredients?: string;
  description?: string;
  photo_front_url?: string;
  photo_back_url?: string;
  created_at?: string;
}

export default defineComponent({
  components: {
    IonPage,
    IonHeader,
    IonContent,
    IonSearchbar,
    IonText,
    IonModal,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonFooter,
    IonChip,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    Swiper,
    SwiperSlide,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonThumbnail,
    IonCard,
    IonCardContent
  },
  setup() {

    const router = useRouter();

    const totalProductsCount = ref(0);
    const allProducts = ref<Product[]>([]);
    const results = ref<Product[]>([]);
    const errorMsg = ref('');
    const selectedProduct = ref<Product | null>(null);
    const scanning = ref(false);
    const searchQuery = ref('');
    let html5QrcodeScanner: Html5Qrcode | null = null;
    const modules = [Pagination, Zoom];
    const pageSize = 15; // Adjust items per page as needed
    const currentPage = ref(0);
    const loadingMore = ref(false);
    const allLoaded = ref(false);
    const ingredientDictionary = ref<Record<string, string>>({});
    const loading = ref(true);
    const showReportForm = ref(false);
    const infiniteScroll = ref<HTMLIonInfiniteScrollElement | null>(null);

    async function refreshList(event: CustomEvent) {
      // Reset state
      currentPage.value = 0;
      allLoaded.value = false;
      allProducts.value = [];
      results.value = [];

      // ✅ Re-enable infinite scroll
      if (infiniteScroll.value) {
        infiniteScroll.value.disabled = false;
      }

      // Fetch first page
      await fetchProducts(true);
      await fetchTotalCount();

      event.detail.complete(); // end refresh animation
    }

    function fromNowToTaipei(dateString?: string) {
      if (!dateString) return ''
      return dayjs.utc(dateString).tz('Asia/Taipei').fromNow()
    }

    const CACHE_KEY = 'products_cache';
    const CACHE_TIMESTAMP_KEY = 'products_cache_timestamp';
    const CACHE_EXPIRY_MS = 60_000; // 1 minute

    const fetchProducts = async (reset = false) => {
      if (loadingMore.value || allLoaded.value) return;

      // ✅ Check cache only on first load
      if (!reset && currentPage.value === 0) {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        const now = Date.now();

        if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp)) < CACHE_EXPIRY_MS) {
          const parsed = JSON.parse(cachedData);
          allProducts.value = parsed;
          results.value = [...allProducts.value];
          loading.value = false;
          return;
        }
      }

      if (reset) {
        loading.value = true;
        currentPage.value = 0;
        allLoaded.value = false;
        allProducts.value = [];
        results.value = [];
      }

      const from = currentPage.value * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
          .from('products')
          .select('*')
          .range(from, to)
          .order('created_at', { ascending: false });

      if (error) {
        errorMsg.value = error.message;
      } else {
        if (!data || data.length < pageSize) {
          allLoaded.value = true;
        }

        allProducts.value = [...allProducts.value, ...(data || [])];
        results.value = [...allProducts.value];

        // ✅ Cache products and timestamp
        if (currentPage.value === 0) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(allProducts.value));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        }

        currentPage.value++;
      }

      loading.value = false;
      loadingMore.value = false;
    };

    function goToReport(barcode: string) {
      closeDetails(); // Close modal
      setTimeout(() => {
        router.push(`/report/${barcode}`);
      }, 300);
    }


    const fetchTotalCount = async () => {
      const { count, error } = await supabase
          .from('products')
          .select('barcode', { count: 'exact', head: true });
      if (error) {
        errorMsg.value = error.message;
      } else {
        totalProductsCount.value = count || 0;
      }
    };


    const loadMore = async (event: Event) => {
      await fetchProducts();
      (event.target as HTMLIonInfiniteScrollElement).complete();

      if (allLoaded.value && infiniteScroll.value) {
        infiniteScroll.value.disabled = true; // disable after reaching end
      }
    };

    const handleSearchInput = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const query = target.value.trim();
      searchQuery.value = query;

      // If query is empty, show loaded products
      if (!query) {
        results.value = [...allProducts.value];
        return;
      }

      // Query Supabase directly for name or barcode
      const { data, error } = await supabase
          .from('products')
          .select('*')
          .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`) // Search in both columns
          .order('created_at', { ascending: false });

      if (error) {
        console.error('Search error:', error);
        results.value = [];
        errorMsg.value = 'Failed to search products';
      } else {
        results.value = data || [];
      }
    };

    const openDetails = (product: Product) => {
      selectedProduct.value = product;
    };

    // Helper to escape special regex chars
    function escapeRegExp(string: string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    // Computed property to highlight ingredients if product is not Halal
    const highlightedIngredients = computed(() => {
      if (!selectedProduct.value || !selectedProduct.value.ingredients) return '';

      // If product is Halal, just return plain text
      if (selectedProduct.value.status === 'Halal') {
        return selectedProduct.value.ingredients;
      }

      const rawIngredients = selectedProduct.value.ingredients;
      const parts = rawIngredients.split(',').map(p => p.trim());

      // Sort dictionary by length to avoid partial overlaps first
      const sortedKeys = Object.keys(ingredientDictionary.value).sort((a, b) => b.length - a.length);

      const highlightedParts = parts.map(part => {
        const lowerPart = part.toLowerCase();
        let matchedKey: string | null = null;

        for (const key of sortedKeys) {
          if (lowerPart.includes(key.toLowerCase())) {
            matchedKey = key;
            break; // ✅ only first/highest match
          }
        }

        if (matchedKey) {
          const color = ingredientDictionary.value[matchedKey];
          return `<span style="font-weight:600;color:var(${color});">${part}</span>`;
        } else {
          return part;
        }
      });

      return highlightedParts.join(', ');
    });

    const closeDetails = () => {
      selectedProduct.value = null;
    };

    onIonViewWillEnter(() => {
      loading.value = true;
      fetchProducts(true);
      fetchTotalCount();
    });

    // Fetch ingredient dictionary from DB on mount
    onMounted(async () => {
      const { data, error } = await supabase
          .from('ingredient_highlights')
          .select('keyword, color');

      if (error) {
        console.error('Failed to load ingredient highlights:', error);
      } else if (data) {
        // Convert array to dictionary { keyword: color }
        ingredientDictionary.value = data.reduce((acc, item) => {
          acc[item.keyword] = item.color;
          return acc;
        }, {} as Record<string, string>);
      }
    });

    async function startScan() {
      if (scanning.value) return;
      scanning.value = true;
      await nextTick();

      html5QrcodeScanner = new Html5Qrcode('reader');

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
      ];

      try {
        await html5QrcodeScanner.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 100 },
              formatsToSupport,
            } as any,
            (decodedText) => {
              console.log('Barcode detected:', decodedText);
              searchQuery.value = decodedText;
              results.value = allProducts.value.filter(
                  (product) =>
                      product.barcode &&
                      product.barcode.toString().toLowerCase().includes(decodedText.toLowerCase())
              );
              stopScan();
            },
            (errorMessage) => {
              if (!errorMessage.includes('NotFoundException')) {
                console.warn('Scan error:', errorMessage);
              }
            }
        );
      } catch (err) {
        console.error('Unable to start scanning:', err);
        scanning.value = false;
      }
    }

    async function stopScan() {
      if (html5QrcodeScanner) {
        console.log('Stopping scanner...');
        await html5QrcodeScanner.stop();
        await html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
        console.log('Scanner stopped and cleared.');
      }
      scanning.value = false;
    }

    return {
      allProducts,
      results,
      errorMsg,
      selectedProduct,
      scanning,
      searchQuery,
      handleSearchInput,
      openDetails,
      closeDetails,
      startScan,
      stopScan,
      barcodeOutline,
      stopCircleOutline,
      chevronDownCircleOutline,
      modules,
      loadMore,
      totalProductsCount,
      fromNowToTaipei,
      refreshList,
      highlightedIngredients,
      loading,
      showReportForm,
      goToReport
    };
  },
});
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
</style>