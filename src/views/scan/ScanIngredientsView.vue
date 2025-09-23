<template>
  <ion-page>
    <ion-header>
      <app-header
          :title="$t('scanIngredients.title')"
          :icon="scanOutline"
          :showBack="true"
          backRoute="/home"
      />
    </ion-header>

    <ion-content class="ion-padding">

      <ion-modal :is-open="showSimpleDisclaimer" backdrop-dismiss="false">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ $t('scanIngredients.disclaimer.title') }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <p style="margin-bottom: 12px;">
            {{ $t('scanIngredients.disclaimer.message') }}
          </p>

          <blockquote style="font-size: 14px; color: var(--ion-color-success); border-left: 4px solid var(--ion-color-success); padding-left: 8px;">
            <em>
              {{ $t('scanIngredients.disclaimer.verse') }}
            </em> <br />
            <small>{{ $t('scanIngredients.disclaimer.verseRef') }}</small>
          </blockquote>

          <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 12px;">
            <!-- First row: Agree + Learn More -->
            <div style="display: flex; gap: 8px; width: 100%;">
              <ion-button style="flex: 1;" color="carrot" @click="acceptDisclaimer">
                {{ $t('scanIngredients.disclaimer.agree') }}
              </ion-button>
              <ion-button style="flex: 1;" fill="outline" color="medium" @click="showDetails">
                {{ $t('scanIngredients.disclaimer.learnMore') }}
              </ion-button>
            </div>

            <!-- Second row: No want to use -->
            <ion-button expand="block" fill="outline" color="medium" @click="declineDisclaimer">
              {{ $t('scanIngredients.disclaimer.decline') }}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <ion-modal :is-open="showDetailedDisclaimer" backdrop-dismiss="false">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ $t('scanIngredients.details.title') }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <p>
            {{ $t('scanIngredients.details.intro') }}
          </p>

          <h3>{{ $t('scanIngredients.details.stepsTitle') }}</h3>
          <ol>
            <li>
              {{ $t('scanIngredients.details.steps.ocr') }}
            </li>
            <li>
              {{ $t('scanIngredients.details.steps.translate') }}
            </li>
            <li>
              {{ $t('scanIngredients.details.steps.match') }}
            </li>
            <li>
              {{ $t('scanIngredients.details.steps.display') }}
            </li>
          </ol>

          <h3>{{ $t('scanIngredients.details.categories.title') }}</h3>
          <ion-list lines="none">
            <ion-item>
              <ion-label>
                <h2 style="color: var(--ion-color-success); font-weight: bold;">{{ $t('scanIngredients.details.categories.halal.label') }}</h2>
                <p>{{ $t('scanIngredients.details.categories.halal.desc') }}</p>
                <small>{{ $t('scanIngredients.details.categories.halal.examples') }}</small>
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
            {{ $t('scanIngredients.details.disclaimerNote') }}
          </p>

          <ion-button expand="block" color="carrot" @click="closeDetailedDisclaimer">
            {{ $t('scanIngredients.details.gotIt') }}
          </ion-button>
        </ion-content>
      </ion-modal>


      <ion-card>
        <ion-card-content>
          <!-- Big Buttons Row -->
          <div style="display: flex; gap: 12px; margin-bottom: 16px;" v-if="!ingredientsText">
            <!-- Camera Button -->
            <div
                @click="scanFromCamera"
                style="flex: 1; background: var(--ion-color-carrot); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;"
            >
              <ion-icon :icon="cameraOutline" style="font-size: 48px; color: var(--ion-color-light);" />
              <span style="color: var(--ion-color-light); margin-top: 8px; font-size: 16px; font-weight: 500;">{{ $t('scanIngredients.scan.camera') }}</span>
            </div>

            <!-- Gallery Button -->
            <div
                @click="scanFromGallery"
                style="flex: 1; background: var(--ion-color-carrot); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;"
            >
              <ion-icon :icon="cloudUploadOutline" style="font-size: 48px; color: var(--ion-color-light);" />
              <span style="color: var(--ion-color-light); margin-top: 8px; font-size: 16px; font-weight: 500;">{{ $t('scanIngredients.scan.gallery') }}</span>
            </div>
          </div>

          <ion-progress-bar
              v-if="ocrLoading"
              type="indeterminate"
              class="ion-margin-top"
          />

          <!-- Original image preview inside Accordion -->
          <ion-accordion-group v-if="originalPreviewUrl">
            <ion-accordion value="original">
              <ion-item slot="header" color="light">
                <ion-label>{{ $t('scanIngredients.scan.originalImage') }}</ion-label>
              </ion-item>
              <div slot="content">
                <img :src="originalPreviewUrl" alt="Original" class="preview-img" />

                <ion-button
                    size="small"
                    class="ion-no-margin"
                    expand="block"
                    @click="recrop"
                >
                  {{ $t('scanIngredients.scan.reCrop') }}
                </ion-button>
              </div>
            </ion-accordion>
          </ion-accordion-group>

          <!-- Cropped image preview -->
          <div v-if="croppedPreviewUrl" class="preview-block ion-margin-top">

            <img :src="croppedPreviewUrl" alt="Cropped" class="preview-img-cropped" />
          </div>

          <!-- Auto status -->
          <ion-chip
              v-if="autoStatus"
              class="ion-margin-top"
              :class="{
    'chip-success': autoStatus === 'Halal',
    'chip-primary': autoStatus === 'Muslim-friendly',
    'chip-warning': autoStatus === 'Syubhah',
    'chip-danger': autoStatus === 'Haram',
    'chip-medium': !['Halal', 'Muslim-friendly', 'Syubhah', 'Haram'].includes(autoStatus)
  }"
          >
            {{ autoStatus }}
          </ion-chip>


          <ion-item class="ion-margin-top">
            <ion-input
                v-model="productName"
                :label="$t('scanIngredients.scan.productName')"
                label-placement="stacked"
                :value="productName || 'Unknown Product'"
                readonly
            />
          </ion-item>

          <div class="ion-margin-top">
            <ion-item lines="full" class="ion-margin-top">
              <ion-textarea
                  v-model="ingredientsTextZh"
                  :label="$t('scanIngredients.scan.ingredientsZh')"
                  label-placement="stacked"
                  :auto-grow="true"
                  readonly
              />
            </ion-item>

            <ion-item lines="full">
              <ion-textarea
                  v-model="ingredientsText"
                  :label="$t('scanIngredients.scan.ingredientsEn')"
                  label-placement="stacked"
                  :auto-grow="true"
                  readonly
                  @ionBlur="() => recheckHighlightsSmart()"
              />
            </ion-item>

            <!-- Highlights -->
            <div v-if="ingredientHighlights.length" class="ion-padding-top">
              <ion-chip
                  v-for="(h, idx) in ingredientHighlights"
                  :key="idx"
                  class="ion-margin-end ion-margin-bottom"
                  :class="['chip-' + extractIonColor(h.color)]"
              >
                {{ h.keyword }}
                <template v-if="h.matchedVariant">
                  ({{ h.matchedVariant }})
                </template>
                — {{ colorMeaning(extractIonColor(h.color)) }}
              </ion-chip>
            </div>

            <ion-button
                v-if="isDonor && ingredientsTextZh && !summaryUsed"
                expand="block"
                color="carrot"
                :disabled="loadingSummary"
                @click="handleSummaryClick"
            >
              {{ loadingSummary ? 'Analyzing…' : 'AI Summary' }}
            </ion-button>

            <!-- AI Summary Section -->
            <div v-if="isDonor && (loadingSummary || overallNote || errorSummary)" class="ai-summary-block">
              <h3 class="ai-summary-title">AI Summary</h3>
              <div class="ai-summary-text" v-html="errorSummary || overallNote"></div>
            </div>


            <div v-if="ingredientsText" class="actions">
              <ion-button size="small" fill="outline" @click="onShareClick">
                <ion-icon slot="start" :icon="shareOutline" />
                {{ $t('scanIngredients.scan.share') }}
              </ion-button>
              <ion-button size="small" color="medium" fill="outline" @click="clearAll">
                <ion-icon slot="start" :icon="refreshOutline" /> <!-- optional different icon -->
                {{ $t('scanIngredients.scan.clear') }}
              </ion-button>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Cropper Modal -->
      <ion-modal :is-open="showCropper" @didDismiss="closeCropper">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ $t('scanIngredients.scan.cropTitle') }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="confirmCrop">{{ $t('scanIngredients.scan.done') }}</ion-button>
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
            <p>{{ $t('scanIngredients.scan.ocrProcessing') }}</p>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Toasts -->
      <ion-toast
          :is-open="showOk"
          :message="$t('scanIngredients.toast.ok')"
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
  IonSpinner, IonProgressBar, IonChip, IonLabel, onIonViewWillEnter, IonList, IonAccordionGroup, IonAccordion
} from '@ionic/vue'
import {cameraOutline, cloudUploadOutline, refreshOutline, scanOutline, shareOutline} from 'ionicons/icons'
import AppHeader from '@/components/AppHeader.vue'
import {ref, onUnmounted} from 'vue'

import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

import {Camera, CameraDirection, CameraResultType, CameraSource} from '@capacitor/camera'
import type { PluginListenerHandle } from '@capacitor/core'

import useDisclaimer from "@/composables/useDisclaimer";
import useShareCard from "@/composables/useShareCard";
import useError from '@/composables/useError'
import useHighlightCache from '@/composables/useHighlightCache'
import { extractIonColor, colorMeaning } from '@/utils/ingredientHelpers'
import {BlacklistPattern} from "@/types/Ingredient";
import useAISummary from '@/composables/useAISummary'
import {isDonor} from "@/composables/userProfile";
import { useCropperOcr } from "@/composables/useCropperOcr"

/** ---------- State ---------- */
const showCopied = ref(false)
const { errorMsg, showErr, setError, clearError } = useError()

const originalFile = ref<File | null>(null)
const croppedFile = ref<File | null>(null)

const originalPreviewUrl = ref<string | null>(null) // original file preview

/** ---------- Show the Disclaimer of Usage ---------- */

const {
  showSimpleDisclaimer,
  showDetailedDisclaimer,
  maybeShowDisclaimer,
  showDetails,
  acceptDisclaimer,
  closeDetailedDisclaimer,
  declineDisclaimer,
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
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    direction: CameraDirection.Rear // ✅ ensures back camera
  });
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

const summaryUsed = ref(false)

async function handleSummaryClick() {
  if (summaryUsed.value) return
  await generateSummary(ingredientsTextZh.value, ingredientHighlights.value, autoStatus.value)
  summaryUsed.value = true
}

/** ---------- AI Summary ---------- */
const {
  overallNote,
  loadingSummary,
  errorSummary,
  generateSummary
} = useAISummary()

/** ---------- Cropper OCR pipeline ---------- */
const {
  reset,
  cropperRef,
  cropperSrc,
  showCropper,
  croppedPreviewUrl,
  ocrLoading,
  openCropper,
  confirmCrop,
  closeCropper,   // ✅ available now
  recrop,         // ✅ available now
  showOk,
  ingredientHighlights,
  ingredientsText,
  ingredientsTextZh,
  autoStatus,
  productName,
  recheckHighlightsSmart,
} = useCropperOcr({
  allHighlights,
  blacklistPatterns,
  fetchHighlightsWithCache,
  incrementUsageCount,
  setError,
})


/** ---------- Share card ------------*/

const { shareResult } = useShareCard(
    productName,
    ingredientsText,
    autoStatus,
    ingredientHighlights, ingredientsTextZh
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

function clearAll() {
  reset()
  originalFile.value = null
  croppedFile.value = null
  overallNote.value = ''
  summaryUsed.value = false
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
  margin-bottom: 0;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
  background: var(--ion-color-light);
}

.preview-img-cropped {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
  background: var(--ion-color-light);
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

.actions {
  display: flex;
  gap: 8px;           /* spacing between buttons */
}

.actions ion-button {
  flex: 1;            /* each button takes equal space */
}

.ai-summary-block {
  margin-top: 10px;
  padding-left: 10px;
  padding-right: 10px;
}

.ai-summary-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.ai-summary-text {
  white-space: pre-wrap;     /* ✅ keeps line breaks from AI response */
  font-size: 16px;
  color: var(--ion-color-dark);
  line-height: 1.5;          /* ✅ improves readability */
  border-radius: 8px;
}
</style>
