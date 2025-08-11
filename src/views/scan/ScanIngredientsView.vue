<template>
  <ion-page>
    <app-header
        title="Scan Ingredients"
        :icon="scanOutline"
        :showBack="true"
        backRoute="/home"
    />


    <ion-content :fullscreen="true" class="ion-padding">

      <ion-card>
        <ion-card-content>
          <ion-button color="carrot" expand="block" @click="scanFromCamera" :disabled="ocrLoading">
            <ion-icon :icon="cameraOutline" slot="start" />
            Use Camera
          </ion-button>

          <ion-button
              expand="block"
              fill="outline"
              class="ion-margin-top"
              color="carrot"
              @click="scanFromGallery"
              :disabled="ocrLoading"
          >
            <ion-icon :icon="cloudUploadOutline" slot="start" />
            Choose from Gallery
          </ion-button>

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
  IonSpinner, IonProgressBar, IonChip, IonLabel
} from '@ionic/vue'
import {cameraOutline, cloudUploadOutline, copyOutline, scanOutline, shareOutline} from 'ionicons/icons'
import AppHeader from '@/components/AppHeader.vue'
import {ref, onMounted, nextTick, onUnmounted} from 'vue'

import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Clipboard } from '@capacitor/clipboard'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'

import { supabase } from '@/plugins/supabaseClient'

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

/** Highlights + status */
interface IngredientHighlight {
  keyword: string
  keyword_zh?: string
  color: string
}
const allHighlights = ref<IngredientHighlight[]>([])
const ingredientHighlights = ref<IngredientHighlight[]>([])
const blacklistPatterns = ref<RegExp[]>([])
const autoStatus = ref('')

const originalPreviewUrl = ref<string | null>(null) // original file preview
const croppedPreviewUrl  = ref<string | null>(null) // cropped area preview


/** ---------- Boot: fetch highlight data ---------- */
let resumeHandle: PluginListenerHandle | null = null

onMounted(async () => {
  const [hl, bl] = await Promise.all([
    supabase.from('ingredient_highlights').select('keyword, keyword_zh, color'),
    supabase.from('ingredient_blacklist').select('pattern').eq('is_active', true)
  ])
  if (!hl.error && hl.data) allHighlights.value = hl.data
  if (!bl.error && bl.data) blacklistPatterns.value = bl.data.map(
      (row) => new RegExp(row.pattern, 'gi')   // 👈 global + case-insensitive
  );
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
  if (!translated.toLowerCase().includes('ingredient')) {
    return error('Ingredients not detected. Please crop the ingredients section.')
  }

  console.log(translated)
  productName.value = extractProductName(translated) || ''
  ingredientsText.value = cleanTranslatedIngredients(translated)
  await nextTick()
  await recheckHighlights()

  showOk.value = true
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

    const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: formData })
    const json = await res.json()
    return json?.ParsedResults?.[0]?.ParsedText || ''
  } catch (e) {
    console.error(e)
    return ''
  }
}

async function translateToEnglish(text: string) {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATION_API_KEY as string
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'zh', target: 'en', format: 'text' }),
    })
    const json = await res.json()
    return json?.data?.translations?.[0]?.translatedText || ''
  } catch (e) {
    console.error(e)
    return ''
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
  if (!raw || !allHighlights.value.length) {
    ingredientHighlights.value = []
    autoStatus.value = ''
    return
  }

  const parts = raw.split(/\s*,\s*/).map(x => x.trim()).filter(Boolean)
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

  // derive status by color priority
  const colors = found.map(h => extractIonColor(h.color))
  autoStatus.value =
      colors.includes('danger') ? 'Haram' :
          colors.includes('warning') ? 'Syubhah' :
              colors.includes('primary') ? 'Muslim-friendly' :
                  'Halal'
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

</style>
