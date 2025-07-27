<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title class="title-large">
          <ion-icon :icon="addOutline" style="vertical-align: middle; "></ion-icon>
          <ion-buttons slot="start">

          </ion-buttons>

          Add New Product
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding" >
      <form @submit.prevent="handleSubmit">
        <div class="form-container">
          <ion-item-group>
            <ion-item>
              <ion-input
                  v-model="form.barcode"
                  required
                  label="Barcode"
                  label-placement="floating"
                  placeholder="Enter digits only"
                  @input="onBarcodeInput"
              />
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
                  @input="onProductNameInput"
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
                  :auto-grow="true"
                  @input="onIngredientsInput"
              />
            </ion-item>

            <ion-item>
              <ion-textarea
                  v-model="form.description"
                  label="Description"
                  label-placement="floating"
                  placeholder="Enter text"
                  :auto-grow="true"
              ></ion-textarea>
            </ion-item>

            <ion-item>
              <ion-label>Front Image</ion-label>
              <ion-buttons slot="end">
                <ion-button @click="takeFrontPicture" fill="clear">
                  <ion-icon :icon="cameraOutline" />
                </ion-button>
                <ion-button @click="uploadFrontFromGallery" fill="clear">
                  <ion-icon :icon="cloudUploadOutline" />
                </ion-button>
              </ion-buttons>
            </ion-item>
            <div v-if="frontPreview" style="padding: 0 16px 16px;">
              <img :src="frontPreview" alt="Front Preview" style="max-width: 100%; border-radius: 8px;" />
            </div>

            <ion-item style="--inner-border-width: 0">
              <ion-label>Back Image</ion-label>
              <ion-buttons slot="end">
                <ion-button @click="takeBackPicture" fill="clear">
                  <ion-icon :icon="cameraOutline" />
                </ion-button>
                <ion-button @click="uploadBackFromGallery" fill="clear">
                  <ion-icon :icon="cloudUploadOutline" />
                </ion-button>
              </ion-buttons>
            </ion-item>
            <div v-if="backPreview" style="padding: 0 16px 16px;">
              <img :src="backPreview" alt="Back Preview" style="max-width: 100%; border-radius: 8px;" />
            </div>
          </ion-item-group>
        </div>


        <ion-button
            expand="block"
            type="submit"
            class="ion-margin-top"
            color="carrot"
            :disabled="loading"
        >
          {{ loading ? 'Submitting product...' : 'Submit' }}
        </ion-button>

        <ion-spinner id="spinner" name="dots" v-if="loading" class="ion-text-center ion-margin-top"></ion-spinner>

        <!-- Toast for success -->
        <ion-toast
            :is-open="showToast"
            :message="toastMessage"
            :duration="1500"
            color="success"
            position="bottom"
            position-anchor="spinner"
            @did-dismiss="showToast = false"
            style="margin-bottom: 100px"
        ></ion-toast>

        <!-- Toast for error -->
        <ion-toast
            :is-open="showErrorToast"
            :message="errorMsg"
            :duration="2500"
            color="danger"
            position="bottom"
            position-anchor="spinner"
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
  IonButton,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonIcon,
  IonSpinner,
  IonToast,
    IonButtons,
    IonItemGroup
} from '@ionic/vue';
import {addOutline, barcodeOutline, cameraOutline, cloudUploadOutline} from 'ionicons/icons';
import {
  ref,
  nextTick,
  onUnmounted
} from 'vue'
import {
  supabase
} from '@/plugins/supabaseClient' // adjust path if needed
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats
} from 'html5-qrcode'

// Import Camera plugin and types
import {
  Camera,
  CameraResultType,
  CameraSource
} from '@capacitor/camera'

interface ProductForm {
  barcode: string;
  name: string;
  status: string;
  ingredients: string;
  description: string;
}

const form = ref<ProductForm>({
  barcode: '',
  name: '',
  status: 'Halal',
  ingredients: '',
  description: ''
});

const frontFile = ref < File | null > (null)
const backFile = ref < File | null > (null)
const frontPreview = ref < string | null > (null) // For showing preview
const backPreview = ref < string | null > (null)

const loading = ref(false)
const showToast = ref(false)
const showErrorToast = ref(false)
const toastMessage = ref('')
const errorMsg = ref('')
const scanning = ref(false)
let html5QrcodeScanner: Html5Qrcode | null = null

function toProperCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function onBarcodeInput(event: Event) {
  const input = event.target as HTMLInputElement;
  // Remove non-digit characters
  let numericValue = input.value.replace(/\D/g, '');

  // Limit to 13 digits max
  if (numericValue.length > 13) {
    numericValue = numericValue.slice(0, 13);
  }

  form.value.barcode = numericValue;
  input.value = numericValue; // update input field too
}

function onProductNameInput(event: Event) {
  const input = event.target as HTMLTextAreaElement;
  input.value = toProperCase(input.value);
  form.value.name = input.value;
}

function onIngredientsInput(event: Event) {
  const input = event.target as HTMLTextAreaElement;
  input.value = toProperCase(input.value);
  form.value.ingredients = input.value;
}


async function startBarcodeScan() {
  if (scanning.value) return
  scanning.value = true

  await nextTick()

  html5QrcodeScanner = new Html5Qrcode("reader")

  const formatsToSupport = [
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.ITF,
  ]

  try {
    await html5QrcodeScanner.start({
          facingMode: "environment"
        }, {
          fps: 10,
          qrbox: {
            width: 250,
            height: 100
          },
          formatsToSupport,
        } as any,
        (decodedText) => {
          console.log("Barcode detected:", decodedText)
          form.value.barcode = decodedText
          stopScan()
        },
        (errorMessage) => {
          console.log(errorMessage)
        }
    )
  } catch (err) {
    console.error("Unable to start scanning:", err)
    scanning.value = false
  }
}

async function stopScan() {
  if (html5QrcodeScanner) {
    await html5QrcodeScanner.stop()
    await html5QrcodeScanner.clear()
    html5QrcodeScanner = null
  }
  scanning.value = false
}

let isUnmounted = false
onUnmounted(() => {
  isUnmounted = true
})

async function takeFrontPicture() {
  if (isUnmounted) return;
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    });

    if (isUnmounted) return;

    frontPreview.value = image.webPath || null;

    const response = await fetch(image.webPath || '');
    const blob = await response.blob();

    // 👇 Create a new File to ensure unique instance
    frontFile.value = new File([blob], `front-${Date.now()}.jpg`, {
      type: blob.type
    });

  } catch (error) {
    console.error('Error taking front photo:', error);
  }
}

async function takeBackPicture() {
  if (isUnmounted) return;
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    });

    if (isUnmounted) return;

    backPreview.value = image.webPath || null;

    const response = await fetch(image.webPath || '');
    const blob = await response.blob();

    // 👇 Create a new File to ensure unique instance
    backFile.value = new File([blob], `back-${Date.now()}.jpg`, {
      type: blob.type
    });

  } catch (error) {
    console.error('Error taking back photo:', error);
  }
}


function uploadFrontFromGallery() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      frontFile.value = file; // ✅ assign to be uploaded

      const reader = new FileReader();
      reader.onload = () => {
        frontPreview.value = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function uploadBackFromGallery() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      backFile.value = file; // ✅ assign to be uploaded

      const reader = new FileReader();
      reader.onload = () => {
        backPreview.value = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

async function handleSubmit() {
  loading.value = true
  errorMsg.value = ''
  showErrorToast.value = false

  try {
    const {
      barcode
    } = form.value

    if (!barcode) {
      errorMsg.value = 'Barcode is required.'
      showErrorToast.value = true
      loading.value = false
      return
    }

    if (form.value.barcode.length !== 13) {
      errorMsg.value = 'Barcode must be exactly 13 digits.';
      showErrorToast.value = true;
      loading.value = false;
      return;
    }

    let frontUrl = ''
    let backUrl = ''

    if (frontFile.value) {
      console.log('Uploading front image...')
      const {
        error
      } = await supabase.storage
          .from('product-images')
          .upload(`${barcode}/front.jpg`, frontFile.value, {
            upsert: true
          })

      if(error) {
        console.log(error)
      }

      const {
        data: publicUrl
      } = supabase.storage
          .from('product-images')
          .getPublicUrl(`${barcode}/front.jpg`)

      frontUrl = publicUrl.publicUrl
      console.log('Front image uploaded:', frontUrl)
    }

    if (backFile.value) {
      console.log('Uploading back image...')
      const {
        error
      } = await supabase.storage
          .from('product-images')
          .upload(`${barcode}/back.jpg`, backFile.value, {
            upsert: true
          })

      if (error) throw error

      const {
        data: publicUrl
      } = supabase.storage
          .from('product-images')
          .getPublicUrl(`${barcode}/back.jpg`)

      backUrl = publicUrl.publicUrl
      console.log('Back image uploaded:', backUrl)
    }

    console.log('Inserting product into database...')
    const {
      error: insertError
    } = await supabase.from('products').insert([{
      ...form.value,
      photo_front_url: frontUrl,
      photo_back_url: backUrl,
      created_at: new Date().toISOString(),
    }])

    if (insertError) throw insertError

    console.log('Product inserted successfully')
    toastMessage.value = 'Product submitted successfully!'
    showToast.value = true

    form.value = {
      barcode: '',
      name: '',
      status: 'Halal',
      ingredients: '',
      description: ''
    }
    frontFile.value = null
    backFile.value = null
    frontPreview.value = null
    backPreview.value = null
  } catch (err: any) {
    console.error('Submission error:', err)
    errorMsg.value = err.message || 'An unexpected error occurred.'
    showErrorToast.value = true
  } finally {
    loading.value = false
  }
}



</script>

<style scoped>
ion-toast {
  transform: translateY(-55px);
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

ion-item {
  --background: transparent;
}

.form-container {
  border-radius: 10px;
  background-color: var(--ion-color-light); /* optional background */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* optional elevation */
}

</style>
