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
          <p>This scanner checks product ingredients against our curated database of English and Chinese keywords. Each match is highlighted by category:</p>

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

          <p style="margin-top: 16px;">Results are for <strong>reference only</strong>. Always verify with trusted sources before consuming.</p>

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
              <ion-button size="small" fill="outline" @click="shareResult">
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
          :message="errMsg"
          :duration="2200"
          color="danger"
          style="transform: translateY(-6%)"
          position="bottom"
          @did-dismiss="showErr=false"
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
import {ref, nextTick, onUnmounted} from 'vue'

import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Clipboard } from '@capacitor/clipboard'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'

import { supabase } from '@/plugins/supabaseClient'
import router from "@/router";

/** ---------- State ---------- */
const showCropper = ref(false)
const cropperSrc = ref<string | null>(null)
const cropperRef = ref<any>(null)
const ocrLoading = ref(false)

const showOk = ref(false)
const showErr = ref(false)
const errMsg = ref('')
const showCopied = ref(false)

const ingredientsText = ref('')
const productName = ref('')
const originalFile = ref<File | null>(null)
const croppedFile = ref<File | null>(null)

const showSimpleDisclaimer = ref(false)
const showDetailedDisclaimer = ref(false)

const DISCLAIMER_ACK_KEY = 'disclaimerAccepted'
const DISCLAIMER_COUNT_KEY = 'disclaimerScanCount'

/** Highlights + status */
interface IngredientHighlight {
  keyword: string
  keyword_zh?: string
  color: string
}

interface BlacklistPattern {
  pattern: string
}

interface HighlightCache {
  highlights: IngredientHighlight[]
  blacklist: BlacklistPattern[]
}

const allHighlights = ref<IngredientHighlight[]>([])
const ingredientHighlights = ref<IngredientHighlight[]>([])
const blacklistPatterns = ref<RegExp[]>([])
const autoStatus = ref('')

const originalPreviewUrl = ref<string | null>(null) // original file preview
const croppedPreviewUrl  = ref<string | null>(null) // cropped area preview

/** ---------- Show the Disclaimer of Usage ---------- */

function maybeShowDisclaimer() {
  const accepted = localStorage.getItem(DISCLAIMER_ACK_KEY) === 'true'
  const count = parseInt(localStorage.getItem(DISCLAIMER_COUNT_KEY) || '0', 10)

  if (!accepted || count >= 5) {
    // reset reminder count if showing disclaimer again
    if (count >= 5) localStorage.setItem(DISCLAIMER_COUNT_KEY, '0')
    showSimpleDisclaimer.value = true
    return true // means "modal is showing, wait for user action"
  }
  return false
}

function showDetails() {
  showDetailedDisclaimer.value = true
}

function acceptDisclaimer() {
  localStorage.setItem(DISCLAIMER_ACK_KEY, 'true')
  localStorage.setItem(DISCLAIMER_COUNT_KEY, '0')
  showSimpleDisclaimer.value = false
}

function closeDetailedDisclaimer() {
  showDetailedDisclaimer.value = false
}

function declineDisclaimer() {
  localStorage.removeItem(DISCLAIMER_ACK_KEY)
  showSimpleDisclaimer.value = false
  error('You must accept the disclaimer to use halal scanner feature.')
  router.push('/home')
}

function incrementDisclaimerCount() {
  let count = parseInt(localStorage.getItem(DISCLAIMER_COUNT_KEY) || '0', 10)
  count++
  localStorage.setItem(DISCLAIMER_COUNT_KEY, count.toString())
}

/** ---------- Boot: fetch highlight data ---------- */
let resumeHandle: PluginListenerHandle | null = null
const CACHE_KEY = 'highlightCache'
const COUNT_KEY = 'highlightFetchCount'

// Load from cache
// Load from cache
function loadCachedHighlights(): HighlightCache | null {
  const raw = localStorage.getItem(CACHE_KEY)
  return raw ? JSON.parse(raw) as HighlightCache : null
}

// Save to cache
function saveCachedHighlights(data: HighlightCache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  localStorage.setItem(COUNT_KEY, '0') // reset usage count
}

// Increment usage counter
function incrementUsageCount() {
  let count = parseInt(localStorage.getItem(COUNT_KEY) || '0', 10)
  count++
  localStorage.setItem(COUNT_KEY, count.toString())
  console.log("Usage count: ",count)
  return count
}

// Main fetch logic
async function fetchHighlightsWithCache(force = false): Promise<HighlightCache | null> {
  const count = parseInt(localStorage.getItem(COUNT_KEY) || '0', 10)
  console.log(`[HighlightCache] Usage count = ${count}, force = ${force}`)

  // If we haven't reached 5 scans yet and not forced, use cache
  if (!force && count < 5) {
    const cached = loadCachedHighlights()
    if (cached) {
      console.log(`[HighlightCache] ✅ Using cached highlights (count = ${count})`, cached)
      return cached
    } else {
      console.log(`[HighlightCache] ⚠ No cached data found, fetching from Supabase...`)
    }
  } else {
    console.log(`[HighlightCache] 🔄 Count threshold reached (${count}) or force = true, fetching from Supabase...`)
  }

  try {
    const [hl, bl] = await Promise.all([
      supabase
          .from('ingredient_highlights')
          .select('keyword, keyword_zh, color'),
      supabase
          .from('ingredient_blacklist')
          .select('pattern')
          .eq('is_active', true)
    ])

    if (!hl.error && !bl.error && hl.data && bl.data) {
      const data: HighlightCache = {
        highlights: hl.data,
        blacklist: bl.data
      }
      saveCachedHighlights(data)
      console.log(`[HighlightCache] 📡 Fetched fresh data from Supabase`, data)
      return data
    } else {
      console.error(`[HighlightCache] ❌ Error fetching from Supabase`, hl.error || bl.error)
    }
  } catch (err) {
    console.error(`[HighlightCache] ❌ Supabase fetch failed, trying cache fallback`, err)
    return loadCachedHighlights()
  }

  return null
}

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
  if (!result || !result.canvas) return error('No crop result available.')

  ocrLoading.value = true
  const blob = await new Promise<Blob | null>((resolve) =>
      result.canvas.toBlob((b: Blob | null) => resolve(b), 'image/jpeg', 0.9)
  )
  if (!blob) {
    ocrLoading.value = false
    return error('Failed to create image from crop.')
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

/** ---------- Share card ------------*/

// --- helpers ---
function loadImageFromFile(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = reject
    img.src = url
  })
}
function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w/2, h/2)
  ctx.beginPath()
  ctx.moveTo(x+rr, y)
  ctx.arcTo(x+w, y, x+w, y+h, rr)
  ctx.arcTo(x+w, y+h, x, y+h, rr)
  ctx.arcTo(x, y+h, x, y, rr)
  ctx.arcTo(x, y, x+w, y, rr)
  ctx.closePath()
}

// --- main: makeShareCard ---
/**
 * @param imageFile  cropped image (or original)
 * @param opts { productName, status, ingredients, logoUrl? }
 * @returns File (JPEG) ready to share
 */
async function makeShareCard(
    imageFile: Blob,
    opts: {
      productName?: string;
      status?: string;
      ingredients: string;
      logoUrl?: string;
      highlightMap?: Record<string, string>; // 👈 new
    }
): Promise<File> {
  // --- Layout constants ---
  const W = 1080;
  const P = 48;
  const cardR = 40;
  const imageR = 36;
  const headerH = 80;
  const imgH = 580;
  const nameRowH = 72;
  const gapAfterName = 16;
  const footerH = 72;
  const lineH = 42;

  const cardX = P / 2;
  const cardY = P / 2;
  const cardW = W - P;
  const contentX = cardX + P;
  const contentW = cardW - P * 2;

  // Ion color name -> hex
  const ionToHex = (ion?: string) => {
    const c = (ion || '').match(/(danger|warning|primary|success|medium|dark)/i)?.[1]?.toLowerCase();
    switch (c) {
      case 'danger':  return '#eb445a';
      case 'warning': return '#ffc409';
      case 'primary': return '#3880ff';
      case 'success': return '#2dd36f';
      case 'medium':  return '#92949c';
      case 'dark':    return '#222428';
      default:        return '#333';
    }
  };

  // Wrap + (optionally) draw highlighted items
  function drawHighlightedItems(
      ctx: CanvasRenderingContext2D,
      items: string[],
      x: number,
      y: number,
      maxW: number,
      lineH: number,
      draw: boolean,
      cfg: { label?: string; highlightMap?: Record<string, string> } = {}
  ): number {
    const fontFor = (bold: boolean) =>
        `${bold ? '700' : '400'} 30px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;

    // use the ionToHex you defined outside
    const colorFor = (item: string) => ionToHex(cfg.highlightMap?.[item.toLowerCase()]);

    let cx = x, cy = y;

    // Label (bold)
    if (cfg.label) {
      ctx.font = fontFor(true);
      const lw = ctx.measureText(cfg.label).width;
      if (cx + lw > x + maxW) { cx = x; cy += lineH; }
      if (draw) { ctx.fillStyle = '#111'; ctx.fillText(cfg.label, cx, cy); }
      cx += lw;
    }

    const drawToken = (text: string, bold: boolean, color: string) => {
      ctx.font = fontFor(bold);
      const w = ctx.measureText(text).width;
      if (cx + w > x + maxW) { cx = x; cy += lineH; }
      if (draw) { ctx.fillStyle = color; ctx.fillText(text, cx, cy); }
      cx += w;
    };

    items.forEach((raw, idx) => {
      const item = raw.trim();
      const isHi = !!cfg.highlightMap?.[item.toLowerCase()];
      const color = colorFor(item);
      if (idx > 0) drawToken(', ', false, '#666');
      item.split(/\s+/).forEach((w, i, arr) =>
          drawToken(w + (i < arr.length - 1 ? ' ' : ''), isHi, color)
      );
    });

    return cy + lineH - y;
  }

  // Pre-measure ingredients block height
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = '400 30px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  const items = opts.ingredients
      .replace(/，/g, ',')            // handle Chinese comma, if relevant
      .split(/\s*,\s*/)
      .map(s => s.trim())
      .filter(Boolean);

  const ingredientsYStart =
      cardY + 20 + headerH + 16 + imgH + 24 + nameRowH + gapAfterName;

  const blockH = drawHighlightedItems(
      measure,            // <-- was measureCtx
      items,
      contentX,
      ingredientsYStart,
      contentW,
      lineH,
      false,
      { label: 'Ingredients: ', highlightMap: opts.highlightMap ?? {} }
  );


  // Final canvas height so footer stays at the bottom
  const H = Math.ceil(ingredientsYStart + blockH + 24 + footerH + cardY);

  // --- Create canvas ---
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background + card
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, cardX, cardY, cardW, H - P, cardR);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Header
  let y = cardY + 20;
  if (opts.logoUrl) {
    try {
      const logo = await loadImageFromUrl(opts.logoUrl);
      const s = 42;
      ctx.drawImage(logo, contentX, y + (headerH - s) / 2, s, s);
    } catch { /* empty */ }
  } else {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#111';
    roundRect(ctx, contentX, y + 18, 36, 36, 8);
    ctx.stroke();
  }
  ctx.fillStyle = '#111';
  ctx.font = '600 42px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  ctx.textBaseline = 'top';
  ctx.fillText('Halal Formosa', contentX + 56, y + 24);
  y += headerH + 16;

  // Main image
  const img = await loadImageFromFile(imageFile);
  ctx.save();
  roundRect(ctx, contentX, y, contentW, imgH, imageR);
  ctx.clip();
  {
    const ratio = img.width / img.height;
    let drawW = contentW;
    let drawH = Math.round(drawW / ratio);
    if (drawH < imgH) { drawH = imgH; drawW = Math.round(drawH * ratio); }
    const dx = contentX + Math.round((contentW - drawW) / 2);
    const dy = y + Math.round((imgH - drawH) / 2);
    ctx.drawImage(img, dx, dy, drawW, drawH);
  }
  ctx.restore();

  // Name + status
  y += imgH + 24;
  ctx.fillStyle = '#111';
  ctx.font = '700 44px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  const name = (opts.productName || 'Product Name').trim();
  const pillW = 240, pillH = 56;
  const nameMaxW = contentW - pillW - 16;
  ctx.fillText(name, contentX, y, nameMaxW);

  if (opts.status) {
    const status = opts.status;
    const pillX = contentX + contentW - pillW;
    const pillY = y - 8;
    const pillColor: Record<string, string> = {
      'Halal': '#2dd36f', 'Muslim-friendly': '#3880ff',
      'Syubhah': '#ffc409', 'Haram': '#eb445a'
    };
    ctx.lineWidth = 4;
    ctx.strokeStyle = pillColor[status] || '#3880ff';
    ctx.fillStyle = 'rgba(0,0,0,0)';
    roundRect(ctx, pillX, pillY, pillW, pillH, 18);
    ctx.stroke();
    ctx.font = '600 30px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    ctx.fillStyle = '#111';
    const textW = ctx.measureText(status).width;
    ctx.fillText(status, pillX + (pillW - textW) / 2, pillY + 12);
  }

  // Ingredients (highlighted)
  y = ingredientsYStart;
  drawHighlightedItems(
      ctx,
      items,
      contentX,
      y,
      contentW,
      lineH,
      true,
      { label: 'Ingredients: ', highlightMap: opts.highlightMap ?? {} }
  );
  y += blockH + 24;

  // Footer
  ctx.fillStyle = '#777';
  ctx.font = '500 26px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  ctx.textBaseline = 'alphabetic';
  const year = new Date().getFullYear();
  ctx.fillText(`Halal Formosa (c) ${year}`, contentX, H - P + 12 - 48);

  // Export
  const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.92));
  return new File([blob], `halal-formosa-card-${Date.now()}.jpg`, { type: 'image/jpeg' });
}


/** ---------- OCR pipeline ---------- */
async function runOcr(file: File) {
  const raw = await extractTextFromImage(file)
  if (!raw) return error('OCR failed to detect any text.')

  const cleanedZh = cleanChineseOcrText(raw)
  const translated = await translateToEnglish(cleanedZh)
  if (translated === null) return // Translation error already shown

  if (!translated.toLowerCase().includes('ingredient')) {
    return error('Ingredients not detected. Please crop the ingredients section.')
  }

  console.log(translated)
  productName.value = extractProductName(translated) || ''
  ingredientsText.value = cleanTranslatedIngredients(translated)
  await nextTick()
  await recheckHighlights()

  showOk.value = true

  // ✅ Increment counters only after successful scan
  incrementDisclaimerCount()
  const count = incrementUsageCount()

  // ✅ If count reached 5, fetch fresh data and reset counter
  if (count >= 5) {
    const data = await fetchHighlightsWithCache(true) // force refresh
    if (data) {
      allHighlights.value = data.highlights
      blacklistPatterns.value = data.blacklist.map(
          (row: BlacklistPattern) => new RegExp(row.pattern, 'gi')
      )
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms)
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

async function extractTextFromImage(file: File) {
  try {
    const apiKey = import.meta.env.VITE_OCR_SPACE_API_KEY as string
    const formData = new FormData()
    formData.append('file', file)
    formData.append('apikey', apiKey)
    formData.append('language', 'auto')
    formData.append('isOverlayRequired', 'false')
    formData.append('scale', 'true')
    formData.append('OCREngine', '2')

    // Wrap fetch in timeout
    const res = await withTimeout(
        fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: formData
        }),
        10000 // 10 seconds
    )

    const json = await res.json()

    if (json?.IsErroredOnProcessing) {
      const errMsgText = Array.isArray(json.ErrorMessage)
          ? json.ErrorMessage.join(', ')
          : (json.ErrorMessage || 'OCR server error')
      error(`OCR Server is busy: ${errMsgText}`)
      return ''
    }

    return json?.ParsedResults?.[0]?.ParsedText || ''
  } catch (e: any) {
    if (e.message === 'timeout') {
      error('OCR server is busy, please try again later.')
    } else {
      error('Failed to connect to OCR server. Please try again later.')
    }
    console.error(e)
    return ''
  }
}


async function translateToEnglish(text: string) {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATION_API_KEY as string

    const res = await withTimeout(
        fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: 'zh',
            target: 'en',
            format: 'text'
          }),
        }),
        10000
    )

    const json = await res.json()

    if (!json?.data?.translations?.[0]?.translatedText) {
      const errMsgText = json?.error?.message || 'Translation service returned no result'
      error(`Translation server error: ${errMsgText}`)
      return null // fail explicitly
    }

    return json.data.translations[0].translatedText

  } catch (e: any) {
    if (e.message === 'timeout') {
      error('Translation server is busy, please try again later.')
    } else {
      error('Failed to connect to translation server. Please try again later.')
    }
    return null
  }
}

/** ---------- Cleaning helpers ---------- */
function cleanChineseOcrText(text: string) {
  let cleaned = text
      .replace(/\r?\n+/g, ', ')
      .replace(/[。、．]/g, ',')
      .replace(/\s{2,}/g, ' ')
      .replace(/品\s*,?\s*名/gi, '品名')
      .replace(/成\s*,?\s*分/gi, '成分')

  for (const pattern of blacklistPatterns.value) {
    cleaned = cleaned.replace(pattern, '').trim()
  }
  cleaned = cleaned.replace(/品名[:：].*?,/i, '')
  cleaned = cleaned.replace(/成分[:：]/i, 'Ingredients: ')
  cleaned = cleaned.replace(/,\s*,+/g, ', ').replace(/^,|,$/g, '')
  return cleaned.trim()
}

function toProperCase(s: string) {
  return s.replace(/\w\S*/g, (txt) => txt[0].toUpperCase() + txt.slice(1).toLowerCase())
}

function cleanTranslatedIngredients(text: string) {
  const idx = text.toLowerCase().indexOf('ingredients:')
  let extracted = idx !== -1 ? text.substring(idx + 'ingredients:'.length).trim() : text
  extracted = extracted.replace(/\n+/g, ', ').replace(/\s{2,}/g, ' ')
  blacklistPatterns.value.forEach((p) => (extracted = extracted.replace(p, '').trim()))

  let parts = extracted.split(',').map(p => p.trim()).filter(Boolean)
  parts = parts.filter(p => !/^\d+\s*(g|kg|ml|毫升|公克)$/i.test(p))
  if (parts.length && /^[A-Z][a-z]+.*\d+.*$/i.test(parts[0])) parts.shift()
  parts = parts.filter(p => !/^[(),]+$/.test(p))

  return parts.map(toProperCase).join(', ').replace(/[\s,]+$/g, '').replace(/\(\s*$/g, '')
}

function extractProductName(text: string) {
  // Normalize common punctuation/spacing weirdness
  const normalized = text
      .replace(/：/g, ':')          // fullwidth colon -> normal
      .replace(/\u3000/g, ' ')      // fullwidth space -> normal space
      .replace(/\s+/g, ' ')         // collapse spaces
      .replace(/\bEnd\.\s*/i, '')   // remove leading "End." noise if present
      .trim()

  const clean = (s: string) =>
      toProperCase(
          s
              .replace(/[™®©]+/g, '')   // symbols
              .replace(/\*+$/g, '')     // trailing asterisks
              .trim()
      )

  // 1) Explicit label with colon anywhere: Name: ___  (or Product:, 品名:, etc.)
  const m1 = /(product\s*name|product|name|item|品名|品項)\s*:\s*(.+?)(?=\s*(ingredients?\s*:|$|[.;\n\r]))/i.exec(normalized)
  if (m1?.[2]) {
    const cand = clean(m1[2])
    if (cand.length > 2) return cand
  }

  // 2) Fallback: "Product <name>." before Ingredients:
  const beforeIngredients = normalized.split(/ingredients?\s*:/i)[0] || ''
  const m2 = /(?:^|\b)product\s+(.{3,120}?)(?=\s*(?:[.;\n]|$))/i.exec(beforeIngredients)
  if (m2?.[1]) {
    const cand = clean(m2[1])
    if (cand.length > 2) return cand
  }

  // 3) Last resort: first sentence-like chunk before Ingredients (if it looks like a name)
  if (beforeIngredients.trim()) {
    const cand = clean(beforeIngredients.split(/[.;\n]/)[0])
    if (/\w/.test(cand) && /\s/.test(cand) && cand.length > 2) return cand
  }

  return ''
}

/** ---------- Highlighting + status ---------- */
async function recheckHighlights() {
  const raw = ingredientsText.value.trim()

  // If no text or no highlight config, clear & bail
  if (!raw || !allHighlights.value.length) {
    ingredientHighlights.value = []
    autoStatus.value = ''
    return
  }

  const parts = raw.split(/\s*,\s*/).map(x => x.trim()).filter(Boolean)

  // If we have zero parsed ingredients, keep status empty
  if (parts.length === 0) {
    ingredientHighlights.value = []
    autoStatus.value = ''
    return
  }

  // Match highlights (same as before)
  const highlights = [...allHighlights.value].sort((a, b) => b.keyword.length - a.keyword.length)
  const found: IngredientHighlight[] = []
  const seen = new Set<string>()

  for (const ing of parts) {
    const low = ing.toLowerCase()
    const m = highlights.find(h =>
        low === h.keyword.toLowerCase() || low.includes(h.keyword.toLowerCase())
    )
    if (m && !seen.has(m.keyword.toLowerCase())) {
      seen.add(m.keyword.toLowerCase())
      found.push({ keyword: ing, keyword_zh: m.keyword_zh, color: m.color })
    }
  }
  ingredientHighlights.value = found

  // Derive status with new default rule:
  const hasHaram = found.some(h => extractIonColor(h.color) === 'danger')
  const hasSyubhah = found.some(h => extractIonColor(h.color) === 'warning')
  // const hasMuslimFriendly = found.some(h => extractIonColor(h.color) === 'primary') // optional

  if (hasHaram) {
    autoStatus.value = 'Haram'
  } else if (hasSyubhah) {
    autoStatus.value = 'Syubhah'
  } else {
    // ✅ default when no risky hits detected
    autoStatus.value = 'Muslim-friendly'
  }
}

function extractIonColor(full: string) {
  const parts = full.split('-')
  return parts[parts.length - 1] // e.g., 'warning'
}
function colorMeaning(c: string) {
  return c === 'danger' ? 'Haram' : c === 'warning' ? 'Syubhah' : c === 'primary' ? 'Muslim-friendly' : 'Unknown'
}

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

async function shareResult() {
  try {
    const imageBlob: Blob | null = originalFile.value
    if (!imageBlob) return shareTextFallback()

    // Build map like: { "gelatin": "danger", "emulsifier": "warning", ... }
    const highlightMap: Record<string, string> = Object.fromEntries(
        ingredientHighlights.value.map(h => [
          h.keyword.toLowerCase(),
          extractIonColor(h.color)
        ])
    );

    const card = await makeShareCard(imageBlob, {
      productName: productName.value,
      status: autoStatus.value,
      ingredients: ingredientsText.value,
      logoUrl: '/android-chrome-192x192.png',
      highlightMap
    });

    if (Capacitor.getPlatform() !== 'web') {
      const base64 = (await blobToBase64(card)).replace(/^data:image\/\w+;base64,/, '')
      const path = `share/ingredients-${Date.now()}.jpg`

      await Filesystem.writeFile({
        path,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      })

      const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })

      const can = await Share.canShare()
      if (!can.value) return shareTextFallback()

      await Share.share({
        title: 'Ingredients',
        text: [
          productName.value ? `Product: ${productName.value}` : null,
          autoStatus.value ? `Status: ${autoStatus.value}` : null,
        ].filter(Boolean).join('\n'),
        files: [uri],
        dialogTitle: 'Share ingredients'
      })
      return
    }

    if ((navigator as any).canShare?.({ files: [card] })) {
      await (navigator as any).share({ title: 'Ingredients', files: [card] })
      return
    }

    const url = URL.createObjectURL(card)
    const a = document.createElement('a')
    a.href = url; a.download = card.name
    document.body.appendChild(a); a.click()
    URL.revokeObjectURL(url); document.body.removeChild(a)
  } catch (err) {
    console.error('[shareResult] native share failed:', err)
    await shareTextFallback()
  }
}

function shareTextFallback() {
  const text = [
    productName.value ? `Product: ${productName.value}` : null,
    autoStatus.value ? `Status: ${autoStatus.value}` : null,
    `Ingredients: ${ingredientsText.value}`,
  ].filter(Boolean).join('\n')
  if ((navigator as any).share) return (navigator as any).share({ title: 'Ingredients', text })
  return Clipboard.write({ string: text }).then(() => (showCopied.value = true))
}

// Helper
function blobToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(((r.result as string) || '').split(',')[1] || '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function clearAll() {
  ingredientsText.value = ''
  productName.value = ''
  ingredientHighlights.value = []
  autoStatus.value = ''
  originalFile.value = null
  croppedFile.value = null

  if (originalPreviewUrl.value) { URL.revokeObjectURL(originalPreviewUrl.value); originalPreviewUrl.value = null }
  if (croppedPreviewUrl.value)  { URL.revokeObjectURL(croppedPreviewUrl.value);  croppedPreviewUrl.value = null }
}

function error(m: string) {
  errMsg.value = m
  showErr.value = true
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
