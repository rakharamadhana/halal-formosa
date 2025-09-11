<template>
  <ion-page>
    <ion-header>
      <app-header
          :title="props.editProduct ? $t('addProduct.editTitle') : $t('addProduct.title')"
          :icon="addOutline"
          :showProfile="true"
          show-back
          :useRouterBack="false"
          @back="emit('close')"
      />
    </ion-header>

    <ion-content class="ion-padding" >
      <ion-modal :is-open="showCropper" @didDismiss="closeCropper">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ $t('addProduct.cropIngredients') }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="confirmCrop">{{ $t('addProduct.done') }}</ion-button>
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
            <p>{{ $t('addProduct.processingOcr') }}</p>
          </div>
        </ion-content>
      </ion-modal>
      <form @submit.prevent="handleSubmit">
        <div class="form-container">
          <ion-item-group>
            <ion-item :class="{ 'barcode-valid': barcodeValid === true, 'barcode-invalid': barcodeValid === false }">
              <ion-input
                  v-model="form.barcode"
                  required
                  :label="$t('addProduct.barcode')"
                  label-placement="floating"
                  :placeholder="$t('addProduct.barcodePlaceholder')"
              ></ion-input>

              <ion-icon
                  v-if="barcodeValid !== null"
                  :icon="barcodeValid ? checkmarkCircle : closeCircle"
                  :color="barcodeValid ? 'success' : 'danger'"
                  slot="end"
                  style="font-size: 20px;"
              />
              <ion-button
                  color="carrot"
                  slot="end"
                  size="default"
                  @click="startBarcodeScan"
              >
                <ion-icon :icon="scanning ? stopCircle : barcodeOutline" />
              </ion-button>
            </ion-item>

            <!-- 🟢 message shown here -->
            <ion-note v-if="barcodeMessage" :color="barcodeValid ? 'success' : 'danger'" class="ion-padding-start">
              {{ barcodeMessage }}
            </ion-note>

            <div v-if="scanning && !Capacitor.isNativePlatform()" id="reader"></div>

            <ion-item>
              <ion-input
                  v-model="form.name"
                  required
                  :label="$t('addProduct.productName')"
                  label-placement="floating"
                  :placeholder="$t('addProduct.productNamePlaceholder')"
                  @input="onProductNameInput"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-select v-model="form.status" interface="popover" required>
                <div slot="label">{{ $t('addProduct.status') }} <ion-text color="danger">*</ion-text></div>
                <ion-select-option value="Halal">{{ $t('addProduct.halal') }}</ion-select-option>
                <ion-select-option value="Muslim-friendly">{{ $t('addProduct.muslimFriendly') }}</ion-select-option>
                <ion-select-option value="Syubhah">{{ $t('addProduct.syubhah') }}</ion-select-option>
                <ion-select-option value="Haram">{{ $t('addProduct.haram') }}</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-textarea
                  v-model="form.ingredients"
                  :label="$t('addProduct.ingredients')"
                  label-placement="floating"
                  :placeholder="$t('addProduct.ingredientsPlaceholder')"
                  :auto-grow="true"
                  @input="handleIngredientsInput"
                  @blur="recheckHighlights"
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

            <ion-accordion-group v-if="rawChineseOcr" class="ion-margin-top ion-margin-horizontal">
              <ion-accordion value="rawOcr">
                <ion-item slot="header" style="background-color: transparent">
                  <ion-label>{{ $t('addProduct.detectedText') }}</ion-label>
                </ion-item>
                <div slot="content">
                  <ion-textarea
                      v-model="rawChineseOcr"
                      readonly
                      style="width: 100%; background: var(--ion-background-color-step-50); border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; padding: 8px; --padding: 8px; min-height: 100px;"
                  ></ion-textarea>
                </div>
              </ion-accordion>
            </ion-accordion-group>

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
            />

            <div v-if="ingredientHighlights.length" class="ion-padding-horizontal">
              <ion-chip
                  v-for="(highlight, idx) in ingredientHighlights"
                  :key="idx"
                  class="ion-margin-top"
                  :class="['chip-' + extractIonColor(highlight.color)]"
              >
                <template v-if="highlight.keyword">
                  {{ highlight.keyword }}
                </template>
                <template v-if="highlight.matchedVariant">
                  ({{ highlight.matchedVariant }})
                </template>
                — {{ getColorMeaning(extractIonColor(highlight.color)) }}
              </ion-chip>
            </div>

            <ion-item>
              <ion-select v-model.number="form.product_category_id" interface="popover" required>
                <div slot="label">{{ $t('addProduct.category') }}</div>
                <ion-select-option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </ion-select-option>
              </ion-select>
            </ion-item>


            <ion-item>
              <ion-textarea
                  v-model="form.description"
                  :label="$t('addProduct.description')"
                  label-placement="floating"
                  :placeholder="$t('addProduct.descriptionPlaceholder')"
                  :auto-grow="true"
                  required
              ></ion-textarea>
            </ion-item>

            <ion-item>
              <ion-label>{{ $t('addProduct.frontImage') }}</ion-label>
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
              <ion-label>{{ $t('addProduct.backImage') }}</ion-label>
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

        <ion-button expand="block" type="submit" class="ion-margin-top" color="carrot" :disabled="loading">
          {{ loading
            ? $t('addProduct.submitting')
            : (props.editProduct ? $t('addProduct.update') : $t('addProduct.submit')) }}
        </ion-button>

        <ion-spinner id="spinner" name="dots" v-if="loading" class="ion-text-center ion-margin-top"></ion-spinner>

        <!-- Toast for success -->
        <ion-toast
            :is-open="showToast"
            :message="$t('addProduct.submitSuccess')"
            :duration="1500"
            color="success"
            position="bottom"
            @did-dismiss="showToast = false"
            style="margin-bottom: 100px"
        ></ion-toast>

        <!-- OCR Success Toast -->
        <ion-toast
            :is-open="showOcrToast"
            :message="$t('addProduct.ocrSuccess')"
            :duration="2000"
            color="success"
            position="bottom"
            @did-dismiss="showOcrToast = false"
        />

        <!-- Error Toast -->
        <ion-toast
            :is-open="!!errorMsg"
            :message="errorMsg"
            color="danger"
            position="bottom"
            :duration="2500"
            @did-dismiss="errorMsg = ''"
        />
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
  IonToolbar,
    IonAccordion,
    IonAccordionGroup, IonNote
} from '@ionic/vue';
import {
  addOutline,
  barcodeOutline,
  cameraOutline,
  cloudUploadOutline,
  checkmarkCircle,
  closeCircle,
  stopCircle,
} from 'ionicons/icons';
import { nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {supabase} from '@/plugins/supabaseClient'

import { Capacitor } from '@capacitor/core'
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerAndroidScanningLibrary,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation, CapacitorBarcodeScannerTypeHintALLOption
} from '@capacitor/barcode-scanner'
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// Import Camera plugin and types
import {Camera, CameraDirection, CameraResultType, CameraSource} from '@capacitor/camera'
import {Cropper} from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';
import AppHeader from "@/components/AppHeader.vue";

import useHighlightCache from '@/composables/useHighlightCache'
import useOcrPipeline from '@/composables/useOcrPipeline'
import useError from '@/composables/useError'
import { userRole, setUserRole } from '@/composables/userProfile'
import { usePoints } from "@/composables/usePoints";

const { awardAndCelebrate } = usePoints();
const { errorMsg, setError } = useError()

import type { Product } from '@/types/Product'


// props
const props = defineProps<{
  editProduct?: Product
}>()

// highlight + OCR pipeline
const { allHighlights, blacklistPatterns, fetchHighlightsWithCache, incrementUsageCount } =
    useHighlightCache()

const {
  recheckHighlights,
  ingredientHighlights,
  ingredientsText,
  autoStatus,
  productName,
  checkingIngredients,
  cleanChineseOcrText
} = useOcrPipeline({
  allHighlights,
  blacklistPatterns,
  incrementUsageCount,
  fetchHighlightsWithCache,
  setError,   // ✅ use composable directly

})

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

  if (props.editProduct) {
    form.value = {
      barcode: props.editProduct.barcode,
      name: props.editProduct.name,
      status: props.editProduct.status,
      product_category_id: props.editProduct.product_category_id ?? null,
      ingredients: props.editProduct.ingredients ?? '',
      description: props.editProduct.description ?? ''
    }
    frontPreview.value = props.editProduct.photo_front_url ?? null
    backPreview.value = props.editProduct.photo_back_url ?? null
  }

  // force fetch highlights & blacklist from DB and save to cache
  await fetchHighlightsWithCache(true);
  await fetchCategoryRules();
  await fetchCategories();
});

interface ProductForm {
  barcode: string
  name: string
  status: string
  product_category_id: number | null
  ingredients: string
  description: string
}

const form = ref<ProductForm>({
  barcode: '',
  name: '',
  status: 'Muslim-friendly',
  product_category_id: null,
  ingredients: '',
  description: ''
})

// ✅ rules fetched from DB
const categoryRules = ref<Record<string, number>>({})

// central mapping
const statusDescriptions: Record<string, string> = {
  'Halal': "Halal certified.",
  'Muslim-friendly': "Muslim-friendly ingredients, OK.",
  'Syubhah': "Syubhah ingredients found.",
  'Haram': "Haram ingredients found."
}

// Track if user manually edits description
watch(() => form.value.description, (newDesc, oldDesc) => {
  // Only mark as user-typed if not from our own code
  if (!programmaticDescUpdate.value && newDesc !== oldDesc && scannedOnce.value) {
    userTouchedDescription.value = true
  }
})


// after your useOcrPipeline call
watch([autoStatus, productName, ingredientsText],
    ([newStatus, newName]) => {
      if (newStatus) {
        form.value.status = newStatus
        autoStatusApplied.value = true   // ✅ mark that auto status was applied
        console.log("⚡ AutoStatus applied:", newStatus)

        if (!form.value.description?.trim()) {
          form.value.description = statusDescriptions[newStatus] ?? ""
        }
      }

      if (newName && !form.value.name.trim()) {
        form.value.name = newName
        console.log("🏷 AutoProductName applied:", newName)
      }

      if (form.value.name && !form.value.product_category_id) {
        const lower = form.value.name.toLowerCase()
        for (const keyword in categoryRules.value) {
          if (lower.includes(keyword)) {
            form.value.product_category_id = categoryRules.value[keyword]
            console.log(`📂 AutoCategory applied: "${form.value.product_category_id}" (matched "${keyword}")`)
            break
          }
        }
      }
    }
)

// Manual status change
watch(() => form.value.status, (newStatus) => {
  if (!newStatus) return
  if (isResettingForm.value) return   // 🚫 skip if resetting form

  if (!scannedOnce.value) return      // 🚫 skip if not after scan

  // reset + overwrite description
  form.value.description = ""
  programmaticDescUpdate.value = true
  form.value.description = statusDescriptions[newStatus] ?? ""
  nextTick(() => { programmaticDescUpdate.value = false })
  userTouchedDescription.value = false
})


const autoStatusApplied = ref(false)
const userTouchedDescription = ref(false)
const programmaticDescUpdate = ref(false)

const frontFile = ref < File | null > (null)
const backFile = ref < File | null > (null)
const frontPreview = ref < string | null > (null) // For showing preview
const backPreview = ref < string | null > (null)

const loading = ref(false)
const showToast = ref(false)
const showOcrToast = ref(false);
const showErrorToast = ref(false)
const toastMessage = ref('')
const scanning = ref(false)

const showCropper = ref(false);
const cropperSrc = ref<string | null>(null);
const cropperRef = ref<any>(null);
const rawChineseOcr = ref('')  // keep original OCR before cleaning
const scannedOnce = ref(false);
const isResettingForm = ref(false)

const barcodeValid = ref<null | boolean>(null)
const barcodeMessage = ref<string>('') // feedback below input
const html5QrCodeInstance = ref<Html5Qrcode | null>(null)
const categories = ref<{ id: number; name: string }[]>([])
const emit = defineEmits(['updated', 'close'])

const fetchCategories = async () => {
  const { data, error } = await supabase
      .from("product_categories")
      .select("id, name")
      .order("name")

  if (!error && data) {
    categories.value = data
  }
}

const fetchCategoryRules = async () => {
  const { data, error } = await supabase
      .from("category_rules")
      .select("keyword, category_id")

  if (!error && data) {
    categoryRules.value = data.reduce((acc, row) => {
      acc[row.keyword.toLowerCase()] = row.category_id  // ✅ numeric FK
      return acc
    }, {} as Record<string, number>)
  }
}

function openCropper(file: File) {
  cropperSrc.value = URL.createObjectURL(file);
  showCropper.value = true;

  // 🟢 Save the original file temporarily for later resizing
  backFile.value = file;
}

function closeCropper() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
  showCropper.value = false
  cropperSrc.value = null
}


async function confirmCrop() {
  if (!cropperRef.value) {
    setError('❌ Cropper ref is null');
    return;
  }

  const result = cropperRef.value.getResult();
  if (!result || !result.canvas) {
    setError('No crop result available.');
    return;
  }

  ocrLoading.value = true;

  // 🟢 OCR: cropped image
  const { canvas } = result;
  const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b: Blob | null) => resolve(b), 'image/jpeg', 0.9)
  );

  if (blob) {
    const croppedFile = new File([blob], `cropped-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });

    const resizedCropped = await resizeImage(
        URL.createObjectURL(croppedFile),
        1000,
        0.7
    );

    // Run OCR on the cropped+resized image
    await runOcrOnFile(resizedCropped);
  }

  // 🟢 Back image: resize the original (not cropped)
  if (backFile.value) {
    const resizedOriginal = await resizeImage(
        URL.createObjectURL(backFile.value),
        1200, // maybe bigger, since it's background
        0.7
    );

    backPreview.value = URL.createObjectURL(resizedOriginal);
    backFile.value = resizedOriginal;
  }

  ocrLoading.value = false;
  closeCropper();
}

const ocrLoading = ref(false);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise
        .then((value) => {
          clearTimeout(timer)
          resolve(value)
        })
        .catch((err) => {
          clearTimeout(timer)
          reject(err)
        })
  })
}

async function extractTextFromImage(file: File): Promise<string> {
  try {
    const base64 = await fileToBase64(file);

    const res = await withTimeout(
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ocr`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageBase64: base64 }),
        }),
        15000 // 15s timeout
    );

    const json = await res.json();

    if (!res.ok || json.error) {
      setError(`OCR failed: ${json.error || 'Google OCR server error'}`);
      return '';
    }

    return json.text || '';
  } catch (e: any) {
    if (e.message === 'timeout') {
      setError('OCR server is busy, please try again later.');
    } else {
      setError('Failed to connect to OCR server. Please try again later.');
    }
    console.error('❌ OCR service error:', e);
    return '';
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1]; // remove data URL prefix
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function scanIngredientsWithCamera() {
  scannedOnce.value = false;  // reset here
  console.log('📸 Taking picture from camera...');

  // 🟢 Clear old values before new scan
  form.value.ingredients = '';
  form.value.product_category_id = null;
  form.value.description = '';
  userTouchedDescription.value = false
  ingredientHighlights.value = [];
  rawChineseOcr.value = '';

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
  scannedOnce.value = false;  // reset here too

  // 🟢 Clear old values before new scan
  form.value.ingredients = '';
  form.value.product_category_id = null;
  form.value.description = '';
  userTouchedDescription.value = false
  ingredientHighlights.value = [];
  rawChineseOcr.value = '';

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
    setError('Translation failed, please try again later.')
    console.error('Translation failed:', result);
    return '';
  }
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
  parts = parts.filter((p) => !/^[(),]+$/.test(p));

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
      let remainder = text.substring(idx + keyword.length).trim();

      remainder = remainder
          .split(/ingredients?:/i)[0]
          .split(/[,(\n]/)[0]
          .replace(/[:：]/g, '')
          .trim();

      if (remainder.length > 1) {
        const productName = toProperCase(remainder);
        console.log('🏷 Extracted Product Name:', productName);
        form.value.name = productName;
        return productName; // ✅ return if valid
      } else {
        console.warn('⚠️ Potential product name found but skipped (too short or single word):', remainder);
        return ''; // ✅ return here too so we don't fall through
      }
    }
  }

  setError('⚠️ Could not detect product name, please enter manually.')
  console.warn('⚠️ Product name could not be extracted from OCR text.');
  return '';
}

async function runOcrOnFile(file: File) {
  // reset user edits on every scan
  userTouchedDescription.value = false

  const ocrText = await extractTextFromImage(file);

  if (!ocrText) {
    setError('OCR failed to detect any text.');
    return;
  }

  rawChineseOcr.value = ocrText   // 🟢 store the raw Chinese OCR here
  console.log("🈶 Raw OCR assigned:", ocrText);

  // 1️⃣ Clean Chinese OCR first
  const cleanedChinese = cleanChineseOcrText(ocrText);
  if (!cleanedChinese) {
    setError("⚠️ OCR returned no usable text after cleaning");
    return;
  }
  console.log('✨ Cleaned Chinese OCR:', cleanedChinese);

  // 2️⃣ Translate to English
  const translatedText = await translateToEnglish(cleanedChinese);
  if (!translatedText) {
    setError("⚠️ Translation failed or returned empty text");
    return;
  }

  // 3️⃣ Check if translated text likely has ingredients
  const lowerTranslated = translatedText.toLowerCase();
  if (!/(ingredient|ingredients|material|materials|content|contents)/.test(lowerTranslated)) {
    setError('⚠️ Ingredients not detected. Please crop the correct ingredients section.');
    console.warn('⚠️ Ingredients keyword not detected, trying fallback extraction…');
  }

  // 4️⃣ Extract product name if available
  extractProductName(translatedText);

  // 5️⃣ Extract ingredients text
  let readableText = '';
  const idx = translatedText.toLowerCase().indexOf('ingredients:');
  if (idx !== -1) {
    // normal path: found "Ingredients:"
    readableText = translatedText.substring(idx + 'ingredients:'.length).trim();
  } else {
    // fallback: try after product name
    const parts = translatedText.split(/product name:/i);
    if (parts[1]) readableText = parts[1].slice(0, 400).trim();
  }

  // clean & normalize
  readableText = cleanTranslatedIngredients(readableText);

  if (!readableText.trim()) {
    setError('⚠️ No valid ingredients detected after OCR. Please try cropping the ingredients section more precisely.');
    return;
  }

  // 6️⃣ Populate form and highlight
  if (readableText.trim()) {
    form.value.ingredients = toProperCase(readableText) // apply ProperCase here once
    ingredientsText.value = form.value.ingredients
    scannedOnce.value = true   // mark as processed
    await recheckHighlights(cleanedChinese)
    showOcrToast.value = true
  }

  // Focus the ingredients textarea
  nextTick(() => {
    const textarea = document.querySelector('ion-textarea');
    if (textarea && (textarea as any).setFocus) {
      (textarea as any).setFocus();
    }
  })

  // 7️⃣ Show OCR success toast
  showOcrToast.value = true;
}

watch(() => form.value.barcode, async (newVal) => {
  if (!newVal) {
    barcodeValid.value = null
    barcodeMessage.value = ''
    return
  }

  if (newVal.length >= 8) {
    const { data, error } = await supabase
        .from("products")
        .select("id, barcode")
        .eq("barcode", newVal)
        .limit(1)

    if (!error && data && data.length > 0) {
      // 🟢 allow if this is the same product we’re editing
      if (props.editProduct && data[0].id === props.editProduct.id) {
        const result = validateBarcode(newVal)
        barcodeValid.value = result.isValid
        barcodeMessage.value = result.message
      } else {
        barcodeValid.value = false
        barcodeMessage.value = "❌ This barcode already exists in the database."
      }
    } else {
      const result = validateBarcode(newVal)
      barcodeValid.value = result.isValid
      barcodeMessage.value = result.message
    }
  }
})


function onProductNameInput(event: Event) {
  const input = event.target as HTMLTextAreaElement;

  if (!scannedOnce.value) {
    input.value = toProperCase(input.value);
  }

  form.value.name = input.value;
}

function onIngredientsInput(event: Event) {
  const input = event.target as HTMLTextAreaElement;

  if (!scannedOnce.value) {
    // before scan: normalize (maybe if user types all-caps by mistake)
    input.value = toProperCase(input.value);
  }

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

async function startBarcodeScan() {
  if (scanning.value) {
    // 🛑 If already scanning → stop
    if (html5QrCodeInstance.value) {
      await html5QrCodeInstance.value.stop()
      document.getElementById('reader')!.innerHTML = ''
      html5QrCodeInstance.value = null
    }
    scanning.value = false
    return
  }

  scanning.value = true

  try {
    if (Capacitor.isNativePlatform()) {
      // 🟢 Native → MLKit
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHintALLOption.ALL,
        scanInstructions: 'Align the barcode within the frame',
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
        scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
        android: { scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.MLKIT },
      })

      if (result?.ScanResult) {
        await Haptics.impact({ style: ImpactStyle.Medium })
        form.value.barcode = result.ScanResult
      }
      scanning.value = false
    } else {
      // 🌐 Web → html5-qrcode
      await nextTick()
      const html5QrCode = new Html5Qrcode('reader')
      html5QrCodeInstance.value = html5QrCode

      const config = {
        fps: 15,
        qrbox: { width: 300, height: 150 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
      }

      await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          async (decodedText) => {
            console.log('✅ Web barcode detected:', decodedText)
            await Haptics.impact({ style: ImpactStyle.Medium })
            form.value.barcode = decodedText

            // auto stop after detection
            await html5QrCode.stop()
            document.getElementById('reader')!.innerHTML = ''
            html5QrCodeInstance.value = null
            scanning.value = false
          },
          (errorMessage) => {
            // gets called often — keep silent or log if needed
            console.log(errorMessage)
          }
      )
    }
  } catch (err: any) {
    console.error('❌ Barcode scan failed:', err)
    scanning.value = false
  }
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
      source: CameraSource.Camera,
      direction: CameraDirection.Rear   // 👈 force front camera
    });

    if (isUnmounted) return;
    frontPreview.value = image.webPath || null;
    frontFile.value = await resizeImage(image.webPath || '');

  } catch (error) {
    console.error('Error taking front photo:', error);
    setError('❌ Failed to capture front image.');
  }
}

async function takeBackPicture() {
  if (isUnmounted) return;
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      direction: CameraDirection.Rear   // 👈 force back camera
    });

    if (isUnmounted) return;
    backPreview.value = image.webPath || null;
    backFile.value = await resizeImage(image.webPath || '');

  } catch (error) {
    console.error('Error taking back photo:', error);
    setError('❌ Failed to capture back image.');
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

async function resizeImage(webPath: string, maxWidth = 600, quality = 0.6): Promise<File> {
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
            resolve(new File([compressedBlob], 'image.jpg', { type: 'image/jpeg' }))
          } else {
            setError('❌ Failed to compress image, please try again.')
          }
        },
        'image/jpeg',
        quality
    )
  })
}


let debounceTimer: ReturnType<typeof setTimeout> | null = null

function handleIngredientsInput(event: Event) {
  onIngredientsInput(event)
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    try {
      await recheckHighlights();
    } catch (err: any) {
      setError('❌ Failed to recheck highlights.');
      console.error(err);
    }
  }, 800);
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
        : `❌ Invalid ${type}.`
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

  const autoApprove = ['admin', 'contributor'].includes(userRole.value || 'user')
  loading.value = true
  errorMsg.value = ''
  showErrorToast.value = false

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to submit a product.')
      loading.value = false
      return
    }

    // fetch role from profiles table
    const { data: profile } = await supabase
        .from('user_roles')  // or 'profiles'
        .select('role')
        .eq('user_id', user.id)
        .single()

    setUserRole(profile?.role || 'user')

    const {
      barcode
    } = form.value

    const barcodeValidation = validateBarcode(barcode);
    if (!barcodeValidation.isValid) {
      setError(barcodeValidation.message)
      loading.value = false;
      return;
    }

    if (!form.value.name.trim()) {
      setError('Product name is required.')
      loading.value = false;
      return;
    }

    if (!form.value.status) {
      setError('Product status is required.')
      loading.value = false;
      return;
    }

    if (!form.value.ingredients.trim()) {
      setError('Ingredients is required.')
      loading.value = false;
      return;
    }

    if (!form.value.product_category_id) {
      setError('Product category is required.')
      loading.value = false
      return
    }

    if (!form.value.description.trim()) {
      setError('Description is required.')
      loading.value = false;
      return;
    }

    if (!props.editProduct && !frontFile.value) {
      setError('Front image is required.')
      loading.value = false
      return
    }

    if (!props.editProduct && !backFile.value) {
      setError('Back image is required.')
      loading.value = false
      return
    }


    let frontUrl = props.editProduct?.photo_front_url || ''
    let backUrl  = props.editProduct?.photo_back_url || ''

    if (frontFile.value) {
      const {
        error
      } = await supabase.storage
          .from('product-images')
          .upload(`${barcode}/front.jpg`, frontFile.value, {
            upsert: true
          })

      if (error) {
        console.log(error);
        setError('❌ Failed to upload front image.');
        return;
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
      const {
        error
      } = await supabase.storage
          .from('product-images')
          .upload(`${barcode}/back.jpg`, backFile.value, {
            upsert: true
          })

      if (error) {
        console.log(error);
        setError('❌ Failed to upload back image.');
        return;
      }

      const {
        data: publicUrl
      } = supabase.storage
          .from('product-images')
          .getPublicUrl(`${barcode}/back.jpg`)

      backUrl = publicUrl.publicUrl
      console.log('Back image uploaded:', backUrl)
    }

    if (props.editProduct) {
      // update existing
      const { error } = await supabase.from('products').update({
        ...form.value,
        photo_front_url: frontUrl,
        photo_back_url: backUrl,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        approved: autoApprove ? true : props.editProduct?.approved,
        approved_by: autoApprove ? user.id : props.editProduct?.approved_by,
        approved_at: autoApprove ? new Date().toISOString() : props.editProduct?.approved_at,
      }).eq('id', props.editProduct.id)

      if (error) throw error
      toastMessage.value = '✅ Product updated successfully!'
      console.log('Product updated successfully')
      emit('updated')
    } else {
      // 🟢 INSERT new
      const { error } = await supabase.from('products').insert([{
        ...form.value,
        photo_front_url: frontUrl,
        photo_back_url: backUrl,
        added_by: user.id,
        approved: autoApprove,
        approved_by: autoApprove ? user.id : null,
        approved_at: autoApprove ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
      }])
      if (error) throw error
      toastMessage.value = autoApprove
          ? '✅ Product published successfully!'
          : '✅ Product submitted and awaiting approval.'

      isResettingForm.value = true

      form.value = {
        barcode: '',
        name: '',
        status: 'Muslim-friendly',
        product_category_id: null,
        ingredients: '',
        description: ''
      }

      nextTick(() => {
        isResettingForm.value = false
      })

      frontFile.value = null
      backFile.value = null
      frontPreview.value = null
      backPreview.value = null
      ingredientHighlights.value = []

      // ✅ Reset barcode checks
      barcodeValid.value = null
      barcodeMessage.value = ''

      console.log('Product inserted successfully')

      // 🎁 Always award points once submitted
      await awardAndCelebrate("add_product", 10000); // now it updates global overlay

    }

    showToast.value = true

  } catch (err: any) {
    console.error('Submission error:', err)
    setError(err.message || 'An unexpected error occurred.')
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

.barcode-valid {
  --highlight-color-focused: var(--ion-color-success);
  --border-color: var(--ion-color-success);
}

.barcode-invalid {
  --highlight-color-focused: var(--ion-color-danger);
  --border-color: var(--ion-color-danger);
}
</style>
