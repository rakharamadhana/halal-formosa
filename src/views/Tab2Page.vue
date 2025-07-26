<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Add New Products</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <form @submit.prevent="handleSubmit">
        <ion-item>
          <ion-input
              v-model="form.barcode"
              required
              label="Barcode"
              label-placement="floating"
              placeholder="Enter text"
          ></ion-input>
          <ion-button slot="end" size="small" @click="startBarcodeScan" :disabled="scanning">
            <ion-icon :icon="barcodeOutline" />
          </ion-button>
        </ion-item>

        <div v-if="scanning" id="reader"></div>
        <ion-button v-if="scanning" color="danger" @click="stopScan">Stop Scan</ion-button>

        <ion-item>
          <ion-input
              v-model="form.name"
              required
              label="Product Name"
              label-placement="floating"
              placeholder="Enter text"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-select v-model="form.status" interface="popover" required>
            <div slot="label">Status</div>
            <ion-select-option value="Halal">Halal</ion-select-option>
            <ion-select-option value="Muslim-friendly">Muslim-friendly</ion-select-option>
            <ion-select-option value="Syubhah">Syubhah</ion-select-option>
            <ion-select-option value="Haram">Haram</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-textarea
              v-model="form.ingredients"
              label="Ingredients"
              label-placement="floating"
              placeholder="Enter text"
          ></ion-textarea>
        </ion-item>

        <ion-item lines="none">
          <ion-label>Has Halal Logo</ion-label>
          <ion-checkbox slot="start" v-model="form.halal_logo_present"></ion-checkbox>
        </ion-item>

        <ion-item>
          <ion-label>Front Image</ion-label>
          <ion-button @click="takeFrontPicture" fill="outline" size="small">Take Picture</ion-button>
        </ion-item>
        <div v-if="frontPreview" style="padding: 0 16px 16px;">
          <img :src="frontPreview" alt="Front Preview" style="max-width: 100%; border-radius: 8px;" />
        </div>

        <ion-item>
          <ion-label>Back Image</ion-label>
          <ion-button @click="takeBackPicture" fill="outline" size="small">Take Picture</ion-button>
        </ion-item>
        <div v-if="backPreview" style="padding: 0 16px 16px;">
          <img :src="backPreview" alt="Back Preview" style="max-width: 100%; border-radius: 8px;" />
        </div>

        <ion-button
            expand="block"
            type="submit"
            shape="round"
            class="ion-margin-top"
            :disabled="loading"
        >
          {{ loading ? 'Submitting product...' : 'Submit' }}
        </ion-button>

        <ion-spinner name="dots" v-if="loading" class="ion-text-center ion-margin-top"></ion-spinner>

        <!-- Toast for success -->
        <ion-toast
            :is-open="showToast"
            :message="toastMessage"
            :duration="3000"
            color="success"
            @did-dismiss="showToast = false"
        ></ion-toast>

        <!-- Toast for error -->
        <ion-toast
            :is-open="showErrorToast"
            :message="errorMsg"
            :duration="5000"
            color="danger"
            @did-dismiss="showErrorToast = false"
        ></ion-toast>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonItem,
  IonContent,
  IonLabel,
  IonToolbar,
  IonTitle,
  IonButton, IonCheckbox, IonTextarea, IonSelect, IonSelectOption, IonInput, IonIcon, IonSpinner, IonToast
} from '@ionic/vue';
import { barcodeOutline } from 'ionicons/icons';
import { nextTick, ref } from 'vue'
import { supabase } from '@/plugins/supabaseClient' // adjust path if needed
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// Import Camera plugin and types
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

const form = ref({
  barcode: '',
  name: '',
  status: 'Halal',
  ingredients: '',
  halal_logo_present: false,
})

const frontFile = ref<File | null>(null)
const backFile = ref<File | null>(null)
const frontPreview = ref<string | null>(null)  // For showing preview
const backPreview = ref<string | null>(null)

const loading = ref(false)
const showToast = ref(false)
const showErrorToast = ref(false)
const toastMessage = ref('')
const errorMsg = ref('')
const success = ref(false)

const scanning = ref(false);
let html5QrcodeScanner: Html5Qrcode | null = null;

async function startBarcodeScan() {
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
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 100 },
          formatsToSupport,
        } as any,
        (decodedText) => {
          console.log("Barcode detected:", decodedText);
          form.value.barcode = decodedText;
          stopScan();
        },
        (errorMessage) => {
          console.log(errorMessage);
        }
    );
  } catch (err) {
    console.error("Unable to start scanning:", err);
    scanning.value = false;
  }
}

async function stopScan() {
  if (html5QrcodeScanner) {
    await html5QrcodeScanner.stop();
    await html5QrcodeScanner.clear();
    html5QrcodeScanner = null;
  }
  scanning.value = false;
}

async function takeFrontPicture() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    })

    frontPreview.value = image.webPath || null

    // Fetch the file blob for upload
    const response = await fetch(image.webPath || '')
    const blob = await response.blob()
    frontFile.value = new File([blob], 'front.jpg', { type: blob.type })
  } catch (error) {
    console.error('Error taking front photo:', error)
  }
}

async function takeBackPicture() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    })

    backPreview.value = image.webPath || null

    // Fetch the file blob for upload
    const response = await fetch(image.webPath || '')
    const blob = await response.blob()
    backFile.value = new File([blob], 'back.jpg', { type: blob.type })
  } catch (error) {
    console.error('Error taking back photo:', error)
  }
}

// Your existing handleSubmit function for uploading and inserting the product
async function handleSubmit() {
  loading.value = true
  errorMsg.value = ''
  showErrorToast.value = false

  try {
    const { barcode } = form.value
    if (!barcode) {
      errorMsg.value = 'Barcode is required.';
      return; // or handle accordingly without throwing
    }

    let frontUrl = ''
    let backUrl = ''

    if (frontFile.value) {
      const { error } = await supabase.storage
          .from('product-images')
          .upload(`${barcode}/front.jpg`, frontFile.value, { upsert: true })
      if (error) throw error

      const { data: publicUrl } = supabase.storage
          .from('product-images')
          .getPublicUrl(`${barcode}/front.jpg`)
      frontUrl = publicUrl.publicUrl
    }

    if (backFile.value) {
      const { error } = await supabase.storage
          .from('product-images')
          .upload(`${barcode}/back.jpg`, backFile.value, { upsert: true })
      if (error) throw error

      const { data: publicUrl } = supabase.storage
          .from('product-images')
          .getPublicUrl(`${barcode}/back.jpg`)
      backUrl = publicUrl.publicUrl
    }

    const { error: insertError } = await supabase.from('products').insert([
      {
        ...form.value,
        photo_front_url: frontUrl,
        photo_back_url: backUrl,
        created_at: new Date().toISOString(),
      },
    ])

    if (insertError) throw insertError

    success.value = true
    loading.value = false
    toastMessage.value = 'Product submitted successfully!'
    showToast.value = true

    form.value = {
      barcode: '',
      name: '',
      status: 'Halal',
      ingredients: '',
      halal_logo_present: false,
    }
    frontFile.value = null
    backFile.value = null
    frontPreview.value = null
    backPreview.value = null
  } catch (err: any) {
    loading.value = false
    errorMsg.value = err.message || 'An unexpected error occurred.'
    showErrorToast.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
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
