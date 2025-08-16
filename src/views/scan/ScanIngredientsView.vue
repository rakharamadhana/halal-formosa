<template>
  <ion-page>
    <app-header
        title="Scan Ingredients"
        :icon="scanOutline"
        :showBack="true"
        backRoute="/home"
    />


    <ion-content :fullscreen="true" class="ion-padding">

      <ion-modal :is-open="showSimpleDisclaimer" backdrop-dismiss="false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Halal Scanner Disclaimer</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <p style="margin-bottom: 12px;">
            This scanner only checks ingredients based on a keyword database.
            It does <strong>not</strong> provide an official halal ruling.
            Please use your own judgment before consuming.
          </p>

          <blockquote style="font-size: 14px; color: var(--ion-color-success); border-left: 4px solid var(--ion-color-success); padding-left: 8px;">
            <em>
              "O mankind, eat from whatever is on earth [that is] lawful and good..."
            </em> <br />
            <small>— Qur'an 2:168</small>
          </blockquote>

          <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 12px;">
            <!-- First row: Agree + Learn More -->
            <div style="display: flex; gap: 8px; width: 100%;">
              <ion-button style="flex: 1;" color="carrot" @click="acceptDisclaimer">
                I Understand
              </ion-button>
              <ion-button style="flex: 1;" fill="outline" color="medium" @click="showDetails">
                Learn More
              </ion-button>
            </div>

            <!-- Second row: No want to use -->
            <ion-button expand="block" fill="outline" color="medium" @click="declineDisclaimer">
              No, I Don't Want to Use This Feature
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <ion-modal :is-open="showDetailedDisclaimer" backdrop-dismiss="false">
        <ion-header>
          <ion-toolbar>
            <ion-title>How It Works</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <p>
            This scanner checks product ingredients using OCR (Optical Character Recognition) and our curated halal ingredient database.
          </p>

          <h3>Step-by-Step Process</h3>
          <ol>
            <li>
              <strong>OCR Processing</strong> – The product image (taken by camera or uploaded from gallery) is sent to an OCR server, which reads and extracts the ingredient text from the image.
            </li>
            <li>
              <strong>Translation</strong> – If the detected text is in Chinese, it is sent to Google Translation to be converted into English for consistent checking.
            </li>
            <li>
              <strong>Database Matching</strong> – The translated English ingredient list is checked against our curated database of keywords for halal, Muslim-friendly, syubhah, and haram indicators.
            </li>
            <li>
              <strong>Result Display</strong> – Any matches are highlighted by category with their status shown for your reference.
            </li>
          </ol>

          <h3>Ingredient Categories</h3>
          <ion-list lines="none">
            <ion-item>
              <ion-label>
                <h2 style="color: var(--ion-color-success); font-weight: bold;">Halal</h2>
                <p>Has halal certification within the product.</p>
                <small><em>Examples:</em> Halal BPJPH Indonesia, Halal CMA, Halal TGM, Halal Thailand</small>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2 style="color: var(--ion-color-primary); font-weight: bold;">Muslim-Friendly</h2>
                <p>No <em>Syubhah</em> or <em>Haram</em> ingredients detected, but not officially halal certified.</p>
                <small><em>Examples:</em> Lecithin (Soy), Soy Lecithin, Emulsifier (Sugar Cane), Fresh Cream</small>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2 style="color: var(--ion-color-warning); font-weight: bold;">Syubhah</h2>
                <p>Doubtful or unclear ingredients that may need further checking.</p>
                <small><em>Examples:</em> Unknown Emulsifier, Butter, Margarine, Vinegar</small>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2 style="color: var(--ion-color-danger); font-weight: bold;">Haram</h2>
                <p>Prohibited ingredients.</p>
                <small><em>Examples:</em> Pork, Gelatin, Alcohol, Lard, Wine</small>
              </ion-label>
            </ion-item>
          </ion-list>

          <p style="margin-top: 16px;">
            Results are for <strong>reference only</strong>. Always verify with trusted sources before consuming.
          </p>

          <ion-button expand="block" color="carrot" @click="closeDetailedDisclaimer">
            Got It
          </ion-button>
        </ion-content>
      </ion-modal>


      <ion-card>
        <ion-card-content>
          <!-- Big Buttons Row -->
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <!-- Camera Button -->
            <div
                @click="scanFromCamera"
                style="flex: 1; background: var(--ion-color-carrot); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;"
            >
              <ion-icon :icon="cameraOutline" style="font-size: 48px; color: var(--ion-color-light);" />
              <span style="color: var(--ion-color-light); margin-top: 8px; font-size: 16px; font-weight: 500;">Camera</span>
            </div>

            <!-- Gallery Button -->
            <div
                @click="scanFromGallery"
                style="flex: 1; background: var(--ion-color-carrot); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;"
            >
              <ion-icon :icon="cloudUploadOutline" style="font-size: 48px; color: var(--ion-color-light);" />
              <span style="color: var(--ion-color-light); margin-top: 8px; font-size: 16px; font-weight: 500;">Gallery</span>
            </div>
          </div>

          <ion-progress-bar
              v-if="ocrLoading"
              type="indeterminate"
              class="ion-margin-top"
          />

          <!-- Original image preview -->
          <div v-if="originalPreviewUrl" class="preview-block ion-margin-top">
            <ion-label class="preview-title">Original</ion-label>
            <img :src="originalPreviewUrl" alt="Original" class="preview-img" />

            <!-- ✅ Re-crop button right below original preview -->
            <ion-button
                size="small"
                fill="clear"
                class="ion-margin-top"
                @click="recrop"
            >
              Re-crop
            </ion-button>
          </div>

          <!-- Cropped image preview -->
          <div v-if="croppedPreviewUrl" class="preview-block ion-margin-top">
            <ion-label class="preview-title">Cropped</ion-label>
            <img :src="croppedPreviewUrl" alt="Cropped" class="preview-img" />
          </div>

          <ion-item v-if="productName" class="ion-margin-top">
            <ion-input
                v-model="productName"
                label="Detected Product Name (optional)"
                label-placement="stacked"
            />
          </ion-item>

          <div v-if="ingredientsText" class="ion-margin-top">
            <ion-item lines="full">
              <ion-textarea
                  v-model="ingredientsText"
                  label="Detected Ingredients"
                  label-placement="stacked"
                  :auto-grow="true"
                  @ionBlur="recheckHighlights"
              />
            </ion-item>

            <!-- Auto status -->
            <ion-item class="ion-margin-top" v-if="autoStatus">
              <ion-label>
                <strong>Status (auto):</strong> {{ autoStatus }}
              </ion-label>
            </ion-item>

            <!-- Highlights -->
            <div v-if="ingredientHighlights.length" class="ion-padding-vertical">
              <ion-chip
                  v-for="(h, idx) in ingredientHighlights"
                  :key="idx"
                  outline
                  class="ion-margin-end ion-margin-bottom"
                  :color="extractIonColor(h.color)"
              >
                {{ h.keyword }}
                <template v-if="h.keyword_zh">({{ h.keyword_zh }})</template>
                — {{ colorMeaning(extractIonColor(h.color)) }}
              </ion-chip>
            </div>

            <div class="actions">
              <ion-button size="small" @click="copyResult">
                <ion-icon slot="start" :icon="copyOutline" />
                Copy
              </ion-button>
              <ion-button size="small" fill="outline" @click="onShareClick">
                <ion-icon slot="start" :icon="shareOutline" />
                Share
              </ion-button>
              <ion-button size="small" color="medium" fill="clear" @click="clearAll">
                Clear
              </ion-button>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Cropper Modal -->
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
              :key="cropperSrc"
              ref="cropperRef"
              class="cropper"
              :src="cropperSrc"
              :stencil-props="{ aspectRatio: null }"
          />
          <div v-if="ocrLoading" class="ion-text-center ion-padding">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Processing OCR...</p>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Toasts -->
      <ion-toast
          :is-open="showOk"
          message="✅ Ingredients extracted!"
          :duration="1600"
          color="success"
          position="bottom"
          @did-dismiss="showOk=false"
      />
      <ion-toast
          :is-open="showErr"
          :message="errorMsg"
          :duration="2200"
          color="danger"
          style="transform: translateY(-6%)"
          position="bottom"
          @did-dismiss="clearError()"
      />
      <ion-toast
          :is-open="showCopied"
          message="Copied to clipboard"
          :duration="1200"
          position="bottom"
          @did-dismiss="showCopied=false"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonButton, IonIcon, IonCard, IonCardContent, IonInput, IonItem,
  IonTextarea, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonToast,
  IonSpinner, IonProgressBar, IonChip, IonLabel, onIonViewWillEnter, IonList
} from '@ionic/vue'
import {cameraOutline, cloudUploadOutline, copyOutline, scanOutline, shareOutline} from 'ionicons/icons'
import AppHeader from '@/components/AppHeader.vue'
import {ref, onUnmounted} from 'vue'

import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Clipboard } from '@capacitor/clipboard'
import type { PluginListenerHandle } from '@capacitor/core'

import useDisclaimer from "@/composables/useDisclaimer";
import useShareCard from "@/composables/useShareCard";
import useOcrPipeline from "@/composables/useOcrPipeline";
import useError from '@/composables/useError'
import useHighlightCache from '@/composables/useHighlightCache'
import { extractIonColor, colorMeaning } from '@/utils/ingredientHelpers'
import {BlacklistPattern} from "@/types/ingredients";

/** ---------- State ---------- */
const showCropper = ref(false)
const cropperSrc = ref<string | null>(null)
const cropperRef = ref<any>(null)
const ocrLoading = ref(false)
const showCopied = ref(false)
const { errorMsg, showErr, setError, clearError } = useError()

const originalFile = ref<File | null>(null)
const croppedFile = ref<File | null>(null)

const originalPreviewUrl = ref<string | null>(null) // original file preview
const croppedPreviewUrl  = ref<string | null>(null) // cropped area preview

/** ---------- Show the Disclaimer of Usage ---------- */

const {
  showSimpleDisclaimer,
  showDetailedDisclaimer,
  maybeShowDisclaimer,
  showDetails,
  acceptDisclaimer,
  closeDetailedDisclaimer,
  declineDisclaimer,
  incrementDisclaimerCount
} = useDisclaimer()

/** ---------- Boot: fetch highlight data ---------- */
let resumeHandle: PluginListenerHandle | null = null

const {
  allHighlights,
  blacklistPatterns,
  fetchHighlightsWithCache,
  incrementUsageCount
} = useHighlightCache()

/** ---------- UI actions ---------- */
async function scanFromCamera() {
  const image = await Camera.getPhoto({ quality: 90, allowEditing: false, resultType: CameraResultType.Uri, source: CameraSource.Camera })
  const blob = await fetch(image.webPath!).then(r => r.blob())
  const file = new File([blob], `ingredients-${Date.now()}.jpg`, { type: 'image/jpeg' })
  originalFile.value = file
  openCropper(file)
}

// Gallery
function scanFromGallery() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files[0]) {
      originalFile.value = target.files[0]
      openCropper(target.files[0])
    }
  }
  input.click()
}

function openCropper(file: File) {
  // Revoke old object URLs if any
  if (originalPreviewUrl.value) URL.revokeObjectURL(originalPreviewUrl.value)
  if (cropperSrc.value) URL.revokeObjectURL(cropperSrc.value)

  const url = URL.createObjectURL(file)
  originalPreviewUrl.value = url
  cropperSrc.value = url
  showCropper.value = true
}

function recrop() {
  if (!originalPreviewUrl.value) return
  cropperSrc.value = originalPreviewUrl.value   // restore the image
  showCropper.value = true
}


function closeCropper() {
  showCropper.value = false
  cropperSrc.value = null
  // (Keep originalPreviewUrl so user can re-crop if they want)
}

async function confirmCrop() {
  if (!cropperRef.value) return
  const result = cropperRef.value.getResult()
  if (!result || !result.canvas) return setError('No crop result available.')

  ocrLoading.value = true
  const blob = await new Promise<Blob | null>((resolve) =>
      result.canvas.toBlob((b: Blob | null) => resolve(b), 'image/jpeg', 0.9)
  )
  if (!blob) {
    ocrLoading.value = false
    return setError('Failed to create image from crop.')
  }

  // ✅ keep a preview URL (for UI)
  if (croppedPreviewUrl.value) URL.revokeObjectURL(croppedPreviewUrl.value)
  croppedPreviewUrl.value = URL.createObjectURL(blob)

  // ✅ keep a File you can share/reuse later
  croppedFile.value = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' })

  // OCR against the same file you just created
  await runOcr(croppedFile.value as File)

  ocrLoading.value = false
  closeCropper()
}

/** ---------- OCR pipeline ---------- */
const {
  runOcr,
  recheckHighlights,
  ingredientHighlights,
  autoStatus,
  productName,
  ingredientsText,
  showOk
} = useOcrPipeline({
  allHighlights,
  blacklistPatterns,
  incrementDisclaimerCount,
  incrementUsageCount,
  fetchHighlightsWithCache,
  setError
})


/** ---------- Share card ------------*/

const { shareResult } = useShareCard(
    productName,
    ingredientsText,
    autoStatus,
    ingredientHighlights
)

function onShareClick() {
  shareResult(originalFile)
}

/** ---------- Lifecycle  ---------- */
onIonViewWillEnter(async () => {
  if (maybeShowDisclaimer()) return

  const data = await fetchHighlightsWithCache()
  if (!data) {
    console.warn('No cache and no internet — highlight system will be empty.')
    return
  }

  allHighlights.value = data.highlights
  blacklistPatterns.value = data.blacklist.map(
      (row: BlacklistPattern) => new RegExp(row.pattern, 'gi')
  )
})

onUnmounted(() => {
  resumeHandle?.remove()
  resumeHandle = null
  if (originalPreviewUrl.value) URL.revokeObjectURL(originalPreviewUrl.value)
  if (croppedPreviewUrl.value) URL.revokeObjectURL(croppedPreviewUrl.value)
})

/** ---------- Utility actions ---------- */
async function copyResult() {
  const lines = [
    productName.value ? `Product: ${productName.value}` : null,
    autoStatus.value ? `Status: ${autoStatus.value}` : null,
    `Ingredients: ${ingredientsText.value}`
  ].filter(Boolean).join('\n')

  await Clipboard.write({ string: lines })
  showCopied.value = true
}

function clearAll() {
  ingredientsText.value = ''
  productName.value = ''
  ingredientHighlights.value = []
  autoStatus.value = ''
  originalFile.value = null
  croppedFile.value = null

  if (originalPreviewUrl.value) {
    URL.revokeObjectURL(originalPreviewUrl.value);
    originalPreviewUrl.value = null
  }
  if (croppedPreviewUrl.value) {
    URL.revokeObjectURL(croppedPreviewUrl.value);
    croppedPreviewUrl.value = null
  }
}
</script>

<style scoped>
ion-card { border-radius: 12px; }
.actions { display: flex; gap: 8px; align-items: center; margin-top: 12px; }

.preview-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.preview-title {
  font-weight: 600;
  opacity: 0.8;
}
.preview-img {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
  background: var(--ion-color-light);
}

.category-item {
  --min-height: auto;
  padding-top: 8px;
  padding-bottom: 8px;
}
.category-item h2 {
  margin: 0 0 4px;
}
.category-item p {
  margin: 0 0 4px;
  font-size: 14px;
}
.category-item small {
  display: block;
  color: var(--ion-color-medium);
  font-size: 13px;
}
</style>
