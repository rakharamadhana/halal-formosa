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
      <div v-if="scanning" id="reader"></div>

      <ion-list v-if="!scanning">
        <ion-item
            v-for="product in results"
            :key="product.barcode"
            button
            @click="openDetails(product)"
        >
          <ion-label>
            <h2>{{ product.name }}</h2>
            <p>Barcode: {{ product.barcode }}</p>
            <p>Status: {{ product.status }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

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
            <h2>{{ selectedProduct.name }}</h2>
            <p><strong>Barcode:</strong> {{ selectedProduct.barcode }}</p>
            <p><strong>Status:</strong> {{ selectedProduct.status }}</p>
            <p><strong>Ingredients:</strong> {{ selectedProduct.ingredients }}</p>
            <p><strong>Halal Logo:</strong> {{ selectedProduct.halal_logo_present ? '✅ Yes' : '❌ No' }}</p>

            <div v-if="selectedProduct.photo_front_url">
              <h3>Front Image</h3>
              <img :src="selectedProduct.photo_front_url" alt="Front Image" style="max-width: 100%; border-radius: 8px;" />
            </div>

            <div v-if="selectedProduct.photo_back_url" style="margin-top: 1rem;">
              <h3>Back Image</h3>
              <img :src="selectedProduct.photo_back_url" alt="Back Image" style="max-width: 100%; border-radius: 8px;" />
            </div>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>

    <ion-footer>
      <ion-text class="product-count" color="medium">
        Showing {{ results.length }} of {{ allProducts.length }} registered products
      </ion-text>
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
} from '@ionic/vue';
import { defineComponent, ref, onMounted, nextTick } from 'vue';
import { barcodeOutline, stopCircleOutline } from 'ionicons/icons';
import { supabase } from '@/plugins/supabaseClient';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface Product {
  barcode: string;
  name: string;
  status: string;
  ingredients?: string;
  halal_logo_present?: boolean;
  photo_front_url?: string;
  photo_back_url?: string;
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
  },
  setup() {
    const allProducts = ref<Product[]>([]);
    const results = ref<Product[]>([]);
    const errorMsg = ref('');
    const selectedProduct = ref<Product | null>(null);
    const scanning = ref(false);
    const searchQuery = ref('');
    let html5QrcodeScanner: Html5Qrcode | null = null;

    const fetchProducts = async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        errorMsg.value = error.message;
        return;
      }
      allProducts.value = data || [];
      results.value = allProducts.value;
    };

    const handleInput = (event) => {
      const query = event.target.value.trim().toLowerCase();
      searchQuery.value = query;
      results.value = allProducts.value.filter(
          (product) =>
              (product.name && product.name.toLowerCase().includes(query)) ||
              (product.barcode && product.barcode.toString().toLowerCase().includes(query))
      );
    };

    const openDetails = (product) => {
      selectedProduct.value = product;
    };

    const closeDetails = () => {
      selectedProduct.value = null;
    };

    onIonViewWillEnter(() => {
      fetchProducts(); // refresh when tab comes to view
    });

    onMounted(() => {
      fetchProducts();
    });

    async function startScan() {
      if (scanning.value) return;
      scanning.value = true;
      await nextTick();

      html5QrcodeScanner = new Html5Qrcode("reader");

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
            {facingMode: "environment"},
            {
              fps: 10,
              qrbox: {width: 250, height: 100},
              formatsToSupport,
            } as any,
            (decodedText, decodedResult) => {
              console.log("Barcode detected:", decodedText);
              searchQuery.value = decodedText;
              results.value = allProducts.value.filter(
                  (product) =>
                      product.barcode &&
                      product.barcode.toString().toLowerCase().includes(decodedText.toLowerCase())
              );
              stopScan();
            },
            (errorMessage) => {
              if (!errorMessage.includes("NotFoundException")) {
                console.warn("Scan error:", errorMessage);
              }
            }
        );
      } catch (err) {
        console.error("Unable to start scanning:", err);
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
      stopCircleOutline
    };
  },
});
</script>

<style>
.product-count {
  display: block;
  text-align: center;
  padding: 0.5rem;
  font-weight: 600;
  margin-top: 1rem;
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


</style>
