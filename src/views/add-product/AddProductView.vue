<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title class="title-large">
          <ion-icon :icon="addOutline" style="vertical-align: middle; "></ion-icon>
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
                  label="Barcode *"
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
                  label="Product Name *"
                  label-placement="floating"
                  placeholder="Enter text"
                  @input="onProductNameInput"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-select v-model="form.status" interface="popover" required>
                <div slot="label">Status <ion-text color="danger">*</ion-text></div>
                <ion-select-option value="Halal">Halal</ion-select-option>
                <ion-select-option value="Muslim-friendly">Muslim-friendly</ion-select-option>
                <ion-select-option value="Syubhah">Syubhah</ion-select-option>
                <ion-select-option value="Haram">Haram</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-textarea
                  v-model="form.ingredients"
                  label="Ingredients *"
                  label-placement="floating"
                  placeholder="Enter text"
                  :auto-grow="true"
                  @input="handleIngredientsInput"
                  @blur="checkIngredientHighlights"
                  required
              />
            </ion-item>

            <ion-progress-bar
                v-if="checkingIngredients"
                type="indeterminate"
                color="primary"
                style="margin-top: 10px;"
            ></ion-progress-bar>

            <div v-if="ingredientHighlights.length" class="ion-no-padding">
              <div class="ion-padding-vertical">
                <ion-chip
                    v-for="(highlight, idx) in ingredientHighlights"
                    :key="idx"
                    outline
                    class="ion-margin-end ion-margin-bottom"
                    :color="extractIonColor(highlight.color)"
                >
                  {{ highlight.keyword }}
                  <template v-if="highlight.keyword_zh">
                    ({{ highlight.keyword_zh }})
                  </template>
                  - {{ getColorMeaning(extractIonColor(highlight.color)) }}
                </ion-chip>
              </div>
            </div>


            <ion-item>
              <ion-textarea
                  v-model="form.description"
                  label="Description *"
                  label-placement="floating"
                  placeholder="Enter text"
                  :auto-grow="true"
                  required
              ></ion-textarea>
            </ion-item>

            <ion-item>
              <ion-label>Front Image <ion-text color="danger">*</ion-text></ion-label>
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
              <ion-label>Back Image <ion-text color="danger">*</ion-text></ion-label>
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


        <ion-footer>
          <ion-button
              expand="block"
              type="submit"
              class="ion-margin-top"
              color="carrot"
              :disabled="loading"
          >
            {{ loading ? 'Submitting product...' : 'Submit' }}
          </ion-button>
        </ion-footer>

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
    IonItemGroup,
    IonChip,
    IonProgressBar,
    IonText
} from '@ionic/vue';
import {addOutline, barcodeOutline, cameraOutline, cloudUploadOutline} from 'ionicons/icons';
import {
  ref,
  nextTick,
  onUnmounted, onMounted
} from 'vue'
import {
  supabase
} from '@/plugins/supabaseClient'
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

const checkingIngredients = ref(false)

interface IngredientHighlight {
  keyword: string;
  keyword_zh?: string; // optional for backward compatibility
  color: string;
}

const ingredientHighlights = ref<IngredientHighlight[]>([])
const allHighlights = ref<IngredientHighlight[]>([])

// ✅ Fetch highlights once when component mounts
onMounted(async () => {
  const { data, error } = await supabase
      .from('ingredient_highlights')
      .select('keyword, keyword_zh, color')

  if (!error && data) {
    allHighlights.value = data
  }
})

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

import { Keyboard } from '@capacitor/keyboard';

const keyboardOpen = ref(false);

Keyboard.addListener('keyboardWillShow', () => {
  keyboardOpen.value = true;
});
Keyboard.addListener('keyboardWillHide', () => {
  keyboardOpen.value = false;
});


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

function getColorMeaning(color: string) {
  switch (color) {
    case 'danger': return 'Haram'
    case 'warning': return 'Syubhah'
    case 'primary': return 'Muslim-friendly'
    default: return 'Unknown'
  }
}

function extractIonColor(fullColor: string) {
  const parts = fullColor.split('-')
  return parts[parts.length - 1] // last part = "warning"
}


async function checkIngredientHighlights() {
  const rawIngredients = form.value.ingredients.trim()
  if (!rawIngredients || allHighlights.value.length === 0) {
    ingredientHighlights.value = []
    return
  }

  const ingredients = rawIngredients.split(/\s*,\s*/).map(i => i.trim()).filter(Boolean)
  if (!ingredients.length) return

  checkingIngredients.value = true
  try {
    const highlights = [...allHighlights.value].sort((a, b) => b.keyword.length - a.keyword.length)

    const foundHighlights: IngredientHighlight[] = []
    const addedKeywords = new Set<string>()

    for (const ing of ingredients) {
      const lowerIng = ing.toLowerCase()
      const match = highlights.find(h =>
          lowerIng === h.keyword.toLowerCase() || lowerIng.includes(h.keyword.toLowerCase())
      )

      if (match && !addedKeywords.has(match.keyword.toLowerCase())) {
        addedKeywords.add(match.keyword.toLowerCase())
        foundHighlights.push({
          keyword: ing,
          keyword_zh: match.keyword_zh, // ✅ now allowed
          color: match.color
        })
      }
    }

    ingredientHighlights.value = foundHighlights
  } finally {
    checkingIngredients.value = false
  }
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
    frontFile.value = await resizeImage(image.webPath || '');

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
    backFile.value = await resizeImage(image.webPath || '');

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

      const reader = new FileReader();
      reader.onload = async () => {
        frontPreview.value = reader.result as string;
        frontFile.value = await resizeImage(reader.result as string);
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

      const reader = new FileReader();
      reader.onload = async () => {
        backPreview.value = reader.result as string;
        backFile.value = await resizeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

async function resizeImage(webPath: string, maxWidth = 800, quality = 0.7): Promise<File> {
  const response = await fetch(webPath)
  const blob = await response.blob()
  const img = await createImageBitmap(blob)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const ratio = img.width / img.height
  canvas.width = Math.min(img.width, maxWidth)
  canvas.height = canvas.width / ratio

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve) => {
    canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob) {
            resolve(new File([compressedBlob], `img-${Date.now()}.jpg`, {
              type: 'image/jpeg'
            }))
          }
        },
        'image/jpeg',
        quality
    )
  })
}

let debounceTimer: NodeJS.Timeout | null = null

function handleIngredientsInput(event: Event) {
  onIngredientsInput(event)

  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    checkIngredientHighlights()
  }, 800)
}

async function handleSubmit() {
  loading.value = true
  errorMsg.value = ''
  showErrorToast.value = false

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      errorMsg.value = 'You must be logged in to submit a product.'
      showErrorToast.value = true
      loading.value = false
      return
    }

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

    if (!form.value.name.trim()) {
      errorMsg.value = 'Product name is required.';
      showErrorToast.value = true;
      loading.value = false;
      return;
    }

    if (!form.value.status) {
      errorMsg.value = 'Product status is required.';
      showErrorToast.value = true;
      loading.value = false;
      return;
    }

    if (!form.value.ingredients.trim()) {
      errorMsg.value = 'Ingredients are required.';
      showErrorToast.value = true;
      loading.value = false;
      return;
    }

    if (!form.value.description.trim()) {
      errorMsg.value = 'Description is required.';
      showErrorToast.value = true;
      loading.value = false;
      return;
    }

    if (!frontFile.value) {
      errorMsg.value = 'Front image is required.';
      showErrorToast.value = true;
      loading.value = false;
      return;
    }

    if (!backFile.value) {
      errorMsg.value = 'Back image is required.';
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
      added_by: user.id, // ✅ Fill with current user's ID
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

ion-content::part(scroll) {
  padding-bottom: 100px; /* leave space for keyboard */
}

.keyboard-open ion-footer {
  margin-bottom: 300px; /* adjust to keyboard height */
}

</style>
