<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Search Products</ion-title>
      </ion-toolbar>
      <ion-toolbar style="display: flex; align-items: center;">
        <ion-searchbar
            :debounce="1000"
            @ionInput="handleInput($event)"
            style="flex-grow: 1;"
            :value="searchQuery"
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

      <ion-list v-if="!scanning">
        <ion-item
            v-for="product in results"
            :key="product.barcode"
            :button="true"
            @click="openDetails(product)"
        >
          <ion-thumbnail slot="start" v-if="product.photo_front_url">
            <img
                :src="product.photo_front_url"
                alt="Front Image"
                style="object-fit: cover; width: 64px; height: 60px; border-radius: 8px;"
            />
          </ion-thumbnail>


          <ion-label>
            <h2>{{ product.name }}</h2>
            <p><small>Added {{ fromNowToTaipei(product?.created_at) }}</small></p>
            <ion-chip
                :color="
                product.status === 'Halal' ? 'success' :
                product.status === 'Muslim-friendly' ? 'primary' :
                product.status === 'Syubhah' ? 'warning' :
                product.status === 'Haram' ? 'danger' :
                'medium'
              "
                        >
              {{ product.status }}
            </ion-chip>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-infinite-scroll @ionInfinite="loadMore" threshold="100px">
        <ion-infinite-scroll-content loading-spinner="bubbles" loading-text="Loading more products...">
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
        </ion-content>
      </ion-modal>
    </ion-content>

    <ion-footer :translucent="true" collapse="fade">
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
  IonItem,
  IonContent,
  IonList,
  IonSearchbar,
  IonLabel,
  IonText,
  IonModal,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonFooter,
  onIonViewWillEnter,
  IonThumbnail,
  IonChip,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent
} from '@ionic/vue';
import { defineComponent, ref, onMounted, nextTick } from 'vue';
import { Pagination, Zoom } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { barcodeOutline, stopCircleOutline, chevronDownCircleOutline } from 'ionicons/icons';
import { supabase } from '@/plugins/supabaseClient';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

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
    IonItem,
    IonContent,
    IonList,
    IonSearchbar,
    IonLabel,
    IonText,
    IonModal,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonFooter,
    IonThumbnail,
    IonChip,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    Swiper,
    SwiperSlide,
    IonRefresher,
    IonRefresherContent
  },
  setup() {
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

    async function refreshList(event: CustomEvent) {
      await fetchAllProducts(); // Reset and reload products (first page)

      event.detail.complete();   // Hide refresher
    }

    function fromNowToTaipei(dateString?: string) {
      if (!dateString) return ''
      return dayjs.utc(dateString).tz('Asia/Taipei').fromNow()
    }

    const fetchAllProducts = async () => {
      const { data, error, count } = await supabase
          .from('products')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

      if (error) {
        errorMsg.value = error.message;
      } else {
        allProducts.value = data || [];
        results.value = allProducts.value;
        totalProductsCount.value = count || 0;
        allLoaded.value = true;
      }
    };


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

    // Fetch paginated products, reset if needed
    const fetchProducts = async (reset = false) => {
      if (loadingMore.value || allLoaded.value) return;
      loadingMore.value = true;

      if (reset) {
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

        // If no active search, show all loaded
        if (!searchQuery.value) {
          results.value = [...allProducts.value];
        } else {
          // Keep filtering on searchQuery if active
          const query = searchQuery.value.toLowerCase();
          results.value = allProducts.value.filter(
              (product) =>
                  (product.name && product.name.toLowerCase().includes(query)) ||
                  (product.barcode && product.barcode.toString().toLowerCase().includes(query))
          );
        }

        currentPage.value++;
      }

      loadingMore.value = false;
    };

    const loadMore = async (event: Event) => {
      await fetchProducts();
      (event.target as HTMLIonInfiniteScrollElement).complete();

      if (allLoaded.value) {
        (event.target as HTMLIonInfiniteScrollElement).disabled = true;
      }
    };

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const query = target.value.trim().toLowerCase();
      searchQuery.value = query;

      if (!query) {
        // Show all loaded products when search cleared
        results.value = [...allProducts.value];
      } else {
        results.value = allProducts.value.filter(
            (product) =>
                (product.name && product.name.toLowerCase().includes(query)) ||
                (product.barcode && product.barcode.toString().toLowerCase().includes(query))
        );
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

      // If product is Halal, do not highlight
      if (selectedProduct.value.status === 'Halal') {
        return selectedProduct.value.ingredients;
      }

      let text = selectedProduct.value.ingredients;

      // Sort keywords by length desc to avoid partial matches before longer matches
      const sortedKeys = Object.keys(ingredientDictionary.value).sort((a, b) => b.length - a.length);

      sortedKeys.forEach(key => {
        const color = ingredientDictionary.value[key];
        if (!color) return;

        // Replace with highlighted span, case insensitive
        const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'gi');
        text = text.replace(regex, (match) => `<span style="color: ${color}; font-weight: 600;">${match}</span>`);
      });

      return text;
    });


    const closeDetails = () => {
      selectedProduct.value = null;
    };

    onIonViewWillEnter(() => {
      fetchProducts(true);
      fetchTotalCount();
    });

    onMounted(() => {
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
      handleInput,
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
      highlightedIngredients
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
</style>