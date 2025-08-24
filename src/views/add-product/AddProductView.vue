<template>
  <ion-page>
    <ion-header>
      <app-header title="Add product" :icon="addOutline" :showProfile="true" />
    </ion-header>

    <ion-content class="ion-padding" >
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
                  @ionInput="onBarcodeInput"
              />

              <ion-button slot="end" size="small" @click="startBarcodeScan" :disabled="scanning">
                <ion-icon :icon="barcodeOutline" />
              </ion-button>
            </ion-item>

            <div v-if="scanning && !Capacitor.isNativePlatform()" id="reader"></div>

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
                <ion-item slot="header">
                  <ion-label>🔎 Detected Text</ion-label>
                </ion-item>
                <div slot="content" >
                  <ion-textarea
                      v-model="rawChineseOcr"
                      readonly
                      style="width: 100%; background: var(--ion-background-color-step-50); border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; padding: 8px; --padding: 8px; min-height: 60px;"
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
                <div slot="label">
                  Category <ion-text color="danger">*</ion-text>
                </div>

                <ion-select-option
                    v-for="cat in categories"
                    :key="cat.id"
                    :value="cat.id"
                >
                  {{ cat.name }}
                </ion-select-option>
              </ion-select>
            </ion-item>


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
    IonAccordionGroup
} from '@ionic/vue';
import {addOutline, barcodeOutline, cameraOutline, cloudUploadOutline} from 'ionicons/icons';
import {nextTick, onMounted, onUnmounted, ref, toRaw, watch} from 'vue'
import {supabase} from '@/plugins/supabaseClient'
import { Capacitor } from '@capacitor/core'
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerAndroidScanningLibrary,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHintALLOption
} from '@capacitor/barcode-scanner'
import { Haptics, ImpactStyle } from '@capacitor/haptics'


// Import Camera plugin and types
import {Camera, CameraResultType, CameraSource} from '@capacitor/camera'
import {Cropper} from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';
import AppHeader from "@/components/AppHeader.vue";

import useHighlightCache from '@/composables/useHighlightCache'
import useOcrPipeline from '@/composables/useOcrPipeline'
import useError from '@/composables/useError'

const { errorMsg, setError } = useError()

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

// after your useOcrPipeline call
watch([autoStatus, productName, ingredientsText],
    ([newStatus, newName]) => {
      if (newStatus) {
        form.value.status = newStatus
        console.log("⚡ AutoStatus applied:", newStatus)

        // only set description if still empty
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

// watch for *manual* status changes
watch(() => form.value.status, (newStatus) => {
  if (newStatus && !form.value.description?.trim()) {
    form.value.description = statusDescriptions[newStatus] ?? ""
  }
})

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

const categories = ref<{ id: number; name: string }[]>([])

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
  showCropper.value = false;
  cropperSrc.value = null;
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

function cleanChineseOcrText(text: string): string {
  let cleaned = text
      .replace(/\r?\n+/g, ', ')
      .replace(/[。、．。]/g, ',')
      .replace(/\s{2,}/g, ' ')
      .replace(/品\s*,?\s*名/gi, '品名')
      .replace(/成\s*,?\s*分/gi, '成分');

  // ✅ Catch glued case: 品名...原料:
  cleaned = cleaned.replace(/(品名[:：][^,，]*)原料[:：]/gi, '$1, Ingredients: ');

  // ✅ Catch normal case: 原料: / 成分: etc
  cleaned = cleaned.replace(/(成分|配料|原料|材料|内容物|內容物)[:：]/gi, 'Ingredients: ');

  // ✅ Normalize product name
  cleaned = cleaned.replace(/品名[:：]/gi, 'Product name: ');

  // Remove duplicate commas
  cleaned = cleaned.replace(/,\s*,+/g, ', ').replace(/^,|,$/g, '');

  console.log("🧹 Cleaned before blacklist:", cleaned);

  for (const pattern of blacklistPatterns.value) {
    const newCleaned = cleaned.replace(pattern, '').trim();
    if (newCleaned.length > 5) {   // only accept if not wiping too much
      cleaned = newCleaned;
    } else {
      console.warn("⚠️ Skipped blacklist pattern (too destructive):", pattern);
    }
  }

  console.log("🧹 Cleaned after blacklist:", cleaned);
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

function onBarcodeInput(event: CustomEvent) {
  // Ionic's value comes from event.detail.value
  const rawValue = (event.detail?.value as string) || ''

  // Keep only digits
  let numericValue = rawValue.replace(/\D/g, '')

  // Limit to max 14 digits
  if (numericValue.length > 14) {
    numericValue = numericValue.slice(0, 14)
  }

  // Update form state
  form.value.barcode = numericValue

  // Also push back into input (needed for manual correction)
  event.target && ((event.target as HTMLIonInputElement).value = numericValue)

  // Validate if length is enough
  if (numericValue.length >= 8) {
    const result = validateBarcode(numericValue)
    if (!result.isValid) {
      setError(result.message)
    } else {
      toastMessage.value = result.message
      showToast.value = true
      console.log(result.message)
    }
  }
}


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
  if (scanning.value) return
  scanning.value = true
  console.log('📸 Starting barcode scan...')

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
      await Haptics.impact({ style: ImpactStyle.Medium })  // small vibration
      console.log('✅ Barcode detected:', result.ScanResult)
      form.value.barcode = result.ScanResult
    } else {
      console.warn('⚠️ Scan finished but no barcode detected')
    }
  } catch (err: any) {
    console.error('❌ Barcode scan failed:', err);
    setError('❌ Barcode scan failed: ' + (err.message || 'Unknown error'));
  } finally {
    scanning.value = false
    console.log('🛑 Scanning session ended')
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
      source: CameraSource.Camera
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
            resolve(new File([compressedBlob], 'image.jpg', { type: 'image/jpeg' }));
          } else {
            setError('❌ Failed to compress image, please try again.');
          }
        },
        'image/jpeg',
        quality
    );

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
      setError('You must be logged in to submit a product.')
      loading.value = false
      return
    }

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

    if (!frontFile.value) {
      setError('Front image is required.')
      loading.value = false;
      return;
    }

    if (!backFile.value) {
      setError('Back image is required.')
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
      console.log('Uploading back image...')
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
      status: 'Muslim-friendly',
      product_category_id: null,
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

</style>
