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
      <ion-modal :is-open="showCropper" @didDismiss="closeCropper">
        <ion-header>
          <ion-toolbar>
            <ion-title>Crop Ingredients</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="confirmCrop">Done</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <cropper
              ref="cropperRef"
              class="cropper"
              :src="cropperSrc"
              :stencil-props="{ aspectRatio: null }"
          />

          <div v-if="ocrLoading" class="ion-text-center ion-padding">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Processing OCR...</p>
          </div>
        </ion-content>
      </ion-modal>
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
                  placeholder="Enter text or use camera/gallery"
                  :auto-grow="true"
                  @input="handleIngredientsInput"
                  @blur="checkIngredientHighlights"
                  required
              />
              <ion-buttons slot="end">
                <ion-button @click="scanIngredientsWithCamera" :disabled="ocrLoading">
                  <ion-icon :icon="cameraOutline" />
                </ion-button>
                <ion-button @click="scanIngredientsFromGallery" :disabled="ocrLoading">
                  <ion-icon :icon="cloudUploadOutline" />
                </ion-button>
              </ion-buttons>
            </ion-item>

            <ion-progress-bar
                v-if="ocrLoading"
                type="indeterminate"
                color="primary"
                style="margin-top: 10px;"
            ></ion-progress-bar>

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
            @did-dismiss="showToast = false"
            style="margin-bottom: 100px"
        ></ion-toast>

        <!-- OCR Success Toast -->
        <ion-toast
            :is-open="showOcrToast"
            message="✅ Ingredients succesfully extracted!"
            :duration="2000"
            color="success"
            position="bottom"
            @did-dismiss="showOcrToast = false"
        />

        <!-- Toast for error -->
        <ion-toast
            :is-open="showErrorToast"
            :message="errorMsg"
            :duration="2500"
            color="danger"
            position="bottom"
            @did-dismiss="showErrorToast = false"
        ></ion-toast>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonModal,
  IonPage,
  IonProgressBar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTextarea,
  IonTitle,
  IonToast,
  IonToolbar
} from '@ionic/vue';
import {addOutline, barcodeOutline, cameraOutline, cloudUploadOutline} from 'ionicons/icons';
import {nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {supabase} from '@/plugins/supabaseClient'
import {Html5Qrcode, Html5QrcodeSupportedFormats} from 'html5-qrcode'

// Import Camera plugin and types
import {Camera, CameraResultType, CameraSource} from '@capacitor/camera'
import {Cropper} from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';

const checkingIngredients = ref(false)

interface IngredientHighlight {
  keyword: string;
  keyword_zh?: string; // optional for backward compatibility
  color: string;
}

const ingredientHighlights = ref<IngredientHighlight[]>([])
const allHighlights = ref<IngredientHighlight[]>([]);
const blacklistPatterns = ref<RegExp[]>([]);

// ✅ Fetch highlights & blacklist once when component mounts
onMounted(async () => {
  const [highlightsResult, blacklistResult] = await Promise.all([
    supabase.from('ingredient_highlights').select('keyword, keyword_zh, color'),
    supabase.from('ingredient_blacklist').select('pattern').eq('is_active', true)
  ]);

  if (!highlightsResult.error && highlightsResult.data) {
    allHighlights.value = highlightsResult.data;
  }
  if (!blacklistResult.error && blacklistResult.data) {
    blacklistPatterns.value = blacklistResult.data.map((row) => new RegExp(row.pattern, 'i'));
  }
});

watch(ingredientHighlights, (newHighlights) => {
  if (!newHighlights.length) {
    form.value.status = 'Halal'; // default
    return;
  }

  // Extract colors from highlights
  const colors = newHighlights.map(h => extractIonColor(h.color));

  // Determine status based on priority
  if (colors.includes('danger')) {
    form.value.status = 'Haram';
  } else if (colors.includes('warning')) {
    form.value.status = 'Syubhah';
  } else if (colors.includes('primary')) {
    form.value.status = 'Muslim-friendly';
  } else {
    form.value.status = 'Halal';
  }

  console.log('⚡ Auto-set status to:', form.value.status);
});

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
const showOcrToast = ref(false);
const showErrorToast = ref(false)
const toastMessage = ref('')
const errorMsg = ref('')
const scanning = ref(false)
let html5QrcodeScanner: Html5Qrcode | null = null

const showCropper = ref(false);
const cropperSrc = ref<string | null>(null);
const cropperRef = ref<any>(null);

function openCropper(file: File) {
  cropperSrc.value = URL.createObjectURL(file);
  showCropper.value = true;
}

function closeCropper() {
  showCropper.value = false;
  cropperSrc.value = null;
}

async function confirmCrop() {
  console.log('✅ Confirm Crop button clicked');

  if (!cropperRef.value) {
    console.error('❗ Cropper ref is null');
    return;
  }

  const result = cropperRef.value.getResult();
  console.log('📐 Cropper result:', result);

  if (!result || !result.canvas) {
    errorMsg.value = 'No crop result available.';
    showErrorToast.value = true;
    console.error('❌ No canvas returned from cropper');
    return;
  }

  // ✅ Start loading spinner
  ocrLoading.value = true;

  const { canvas } = result;
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b: Blob | null) => {
      console.log('🖼 Canvas to Blob finished. Blob size:', b?.size || 0);
      resolve(b);
    }, 'image/jpeg', 0.9);
  });

  if (blob) {
    const croppedFile = new File([blob], `cropped-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    console.log('📂 Cropped file ready:', croppedFile.name, croppedFile.size, 'bytes');

    await runOcrOnFile(croppedFile); // OCR + translation
  } else {
    console.error('❌ Failed to create blob from canvas');
  }

  // ✅ Hide spinner & close modal
  ocrLoading.value = false;
  closeCropper();
}


const ocrLoading = ref(false);

async function extractTextFromImage(file: File) {
  console.log('🔍 Starting OCR for file:', file.name);

  const apiKey = import.meta.env.VITE_OCR_SPACE_API_KEY as string; // replace with your OCR.Space API key
  const formData = new FormData();
  formData.append('file', file);
  formData.append('apikey', apiKey);
  formData.append('language', 'auto'); // use 'chs' for Chinese
  formData.append('isOverlayRequired', 'false');
  formData.append('scale', 'true');        // 🔹 Use Engine 2
  formData.append('OCREngine', '2');        // 🔹 Use Engine 2

  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result?.ParsedResults?.length > 0) {
      return result.ParsedResults[0].ParsedText;
    } else {
      console.error('❌ OCR failed to detect text');
      return '';
    }
  } catch (err) {
    console.error('❌ OCR request error:', err);
    return '';
  }
}

async function scanIngredientsWithCamera() {
  console.log('📸 Taking picture from camera...');
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
  });

  console.log('📸 Camera image received:', image.webPath);

  const blob = await fetch(image.webPath!).then((r) => r.blob());
  const file = new File([blob], `ingredients-${Date.now()}.jpg`, { type: 'image/jpeg' });

  openCropper(file); // 🔹 open cropper before OCR
}

function scanIngredientsFromGallery() {
    const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      openCropper(target.files[0]); // 🔹 open cropper before OCR
    } else {
      console.warn('⚠️ No file selected');
    }
  };
  input.click();
}

async function translateToEnglish(text: string) {
  const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATION_API_KEY as string;

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const body = {
    q: text,
    source: 'zh',       // or 'auto'
    target: 'en',
    format: 'text',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (result.data?.translations?.[0]) {
    return result.data.translations[0].translatedText;
  } else {
    console.error('Translation failed:', result);
    return '';
  }
}

function cleanChineseOcrText(text: string): string {
  let cleaned = text
      .replace(/\r?\n+/g, ', ')    // new lines -> commas
      .replace(/[。、．]/g, ',')   // Chinese punctuation -> commas
      .replace(/\s{2,}/g, ' ')     // multiple spaces
      .replace(/品\s*,?\s*名/gi, '品名')  // merge fragmented
      .replace(/成\s*,?\s*分/gi, '成分'); // merge fragmented

  // ✅ Apply blacklist from DB
  for (const pattern of blacklistPatterns.value) {
    cleaned = cleaned.replace(pattern, '').trim();
  }

  // ✅ Standardize product name & ingredients
  cleaned = cleaned.replace(/品名[:：].*?,/i, '');        // remove product name
  cleaned = cleaned.replace(/成分[:：]/i, 'Ingredients: '); // normalize
  cleaned = cleaned.replace(/,\s*,+/g, ', ').replace(/^,|,$/g, '');

  return cleaned.trim();
}


function cleanTranslatedIngredients(text: string): string {
  let extracted = text;
  const idx = text.toLowerCase().indexOf('ingredients:');
  if (idx !== -1) {
    extracted = text.substring(idx + 'ingredients:'.length).trim();
  }

  extracted = extracted.replace(/\n+/g, ', ').replace(/\s{2,}/g, ' ');

  // Apply blacklist patterns from DB if available
  blacklistPatterns.value.forEach((pattern) => {
    extracted = extracted.replace(pattern, '').trim();
  });

  // Split and clean
  let parts = extracted
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean); // ✅ Remove any empty parts

  // Remove weight-only items like 800g, 1kg, 250 ml
  parts = parts.filter((p) => !/^\d+\s*(g|kg|ml|毫升|公克)$/i.test(p));

  // Remove title-case product names with digits if first
  if (parts.length && /^[A-Z][a-z]+.*\d+.*$/i.test(parts[0])) {
    parts.shift();
  }

  // ✅ Remove incomplete items like "(" or ")" or ending commas
  parts = parts.filter((p) => !/^[\(\)\,]+$/.test(p));

  // ✅ Join and remove trailing punctuation
  return parts.map(toProperCase).join(', ')
      .replace(/[\s,]+$/g, '')   // remove trailing spaces/commas
      .replace(/\(\s*$/g, '');
}

function toProperCase(str: string): string {
  return str
      .replace(/\w\S*/g, (txt) => txt[0].toUpperCase() + txt.slice(1).toLowerCase());
}

function extractProductName(text: string) {
  const lower = text.toLowerCase();
  const nameKeywords = ['product name', 'name:', 'item:', '品名', '品項'];

  for (const keyword of nameKeywords) {
    const idx = lower.indexOf(keyword);
    if (idx !== -1) {
      // Extract part after keyword
      let remainder = text.substring(idx + keyword.length).trim();

      // ✅ Stop at "ingredients" or the first comma/parenthesis/newline
      remainder = remainder
          .split(/ingredients?:/i)[0]  // stop before ingredients
          .split(/[,(\n]/)[0]          // stop at first comma/parenthesis/newline
          .replace(/[:：]/g, '')        // remove colon
          .trim();

      // ✅ Avoid single words like "Sodium" being mistaken for product name
      if (remainder.length > 2 && /\s/.test(remainder)) {
        const productName = toProperCase(remainder);
        console.log('🏷 Extracted Product Name:', productName);
        form.value.name = productName;
        return productName;
      } else {
        console.warn('⚠️ Potential product name found but skipped (too short or single word):', remainder);
      }
    }
  }

  console.warn('⚠️ Product name could not be extracted from OCR text.');
  return '';
}

async function runOcrOnFile(file: File) {
  const ocrText = await extractTextFromImage(file);

  if (!ocrText) {
    errorMsg.value = 'OCR failed to detect any text.';
    showErrorToast.value = true;
    return;
  }

  // 1️⃣ Clean Chinese OCR first
  const cleanedChinese = cleanChineseOcrText(ocrText);
  console.log('🔹 Cleaned Chinese OCR:', cleanedChinese);

  // 2️⃣ Translate to English
  const translatedText = await translateToEnglish(cleanedChinese);
  console.log('🔹 Translated text:', translatedText);

  // 3️⃣ Check if translated text likely has ingredients
  const lowerTranslated = translatedText.toLowerCase();
  if (!lowerTranslated.includes('ingredient')) {
    errorMsg.value = '⚠️ Ingredients not detected. Please crop the correct ingredients section.';
    showErrorToast.value = true;
    console.warn('⚠️ No ingredients section detected in OCR result.');
    return;
  }

  // 4️⃣ Extract product name if available
  extractProductName(translatedText);

  // 5️⃣ Clean & extract only ingredients
  const readableText = cleanTranslatedIngredients(translatedText);
  console.log('✨ Final Ingredients:', readableText);

  // 6️⃣ Populate form and highlight
  form.value.ingredients = readableText;
  checkIngredientHighlights();

  // Focus the ingredients textarea
  nextTick(() => {
    const textarea = document.querySelector('ion-textarea');
    if (textarea && (textarea as any).setFocus) {
      (textarea as any).setFocus();
    }
  });

  // 7️⃣ Show OCR success toast
  showOcrToast.value = true;
}

function onBarcodeInput(event: Event) {
  const input = event.target as HTMLInputElement;
  let numericValue = input.value.replace(/\D/g, '');

  // Limit to max 14 digits
  if (numericValue.length > 14) numericValue = numericValue.slice(0, 14);

  form.value.barcode = numericValue;
  input.value = numericValue;

  if (numericValue.length >= 8) {
    const result = validateBarcode(numericValue);
    if (!result.isValid) {
      errorMsg.value = result.message;
      showErrorToast.value = true;
    } else {
      console.log(result.message);
    }
  }
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

function validateBarcode(barcode: string) {
  if (!/^\d+$/.test(barcode)) return { isValid: false, message: 'Barcode must be digits only' };

  const len = barcode.length;
  let type = '';
  switch (len) {
    case 8: type = 'EAN-8'; break;
    case 12: type = 'UPC-A'; break;
    case 13: type = 'EAN-13'; break;
    case 14: type = 'GTIN-14'; break;
    default:
      return { isValid: false, message: 'Barcode must be 8, 12, 13, or 14 digits' };
  }

  const digits = barcode.split('').map(Number);
  const checkDigit = digits.pop()!;
  const calcCheckDigit = calculateCheckDigit(digits);

  const isValid = checkDigit === calcCheckDigit;
  const correctBarcode = isValid ? null : [...digits, calcCheckDigit].join('');

  return {
    isValid,
    type,
    checkDigit: calcCheckDigit,
    correctBarcode,
    message: isValid
        ? `✅ Valid ${type} barcode`
        : `❌ Invalid ${type}. Correct check digit: ${calcCheckDigit}`
  };
}

function calculateCheckDigit(digits: number[]) {
  const len = digits.length;
  let sumOdd = 0;
  let sumEven = 0;

  // GS1 logic: positions are counted from the right (rightmost = position 1)
  for (let i = 0; i < len; i++) {
    const digit = digits[len - 1 - i];
    if ((i + 1) % 2 === 1) {
      sumOdd += digit;  // odd position from right
    } else {
      sumEven += digit; // even position from right
    }
  }

  const total = sumOdd * 3 + sumEven;
  const mod = total % 10;
  return mod === 0 ? 0 : 10 - mod;
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

    const barcodeValidation = validateBarcode(barcode);
    if (!barcodeValidation.isValid) {
      errorMsg.value = barcodeValidation.message;
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
    ingredientHighlights.value = []
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
