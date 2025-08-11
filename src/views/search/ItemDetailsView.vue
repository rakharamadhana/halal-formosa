<template>
  <ion-page>
    <app-header title="Product details" show-back back-route="/search" :icon="bagOutline" />

    <!-- If this page should show ads, include this slot and set meta.adSpaceId above -->
    <div v-if="isNative && showAds" id="ad-space-item-details" style="height:60px;"></div>

    <ion-content class="ion-padding">
      <div v-if="loading">
        <ion-skeleton-text animated style="width:100%;height:200px" />
        <ion-skeleton-text animated style="width:70%;height:20px;margin-top:10px" />
      </div>

      <div v-else-if="item">
        <!-- Swiper carousel for images -->
        <swiper
            v-if="item.photo_front_url || item.photo_back_url"
            :modules="modules"
            :scrollbar="true"
            :zoom="true"
            :slides-per-view="1"
            :pagination="{ clickable: true }"
            style="width: 100%; height: 300px; border-radius: 8px; overflow: hidden;"
        >
          <swiper-slide v-if="item.photo_front_url">
            <img
                :src="item.photo_front_url"
                alt="Front Image"
                style="width: 100%; height: 100%; object-fit: cover; object-position: center;"
            />
          </swiper-slide>
          <swiper-slide v-if="item.photo_back_url">
            <img
                :src="item.photo_back_url"
                alt="Back Image"
                style="width: 100%; height: 100%; object-fit: cover; object-position: center;"
            />
          </swiper-slide>
        </swiper>

        <!-- Details below the slider -->
        <div style="margin-top: 1rem;">
          <h2 style="margin-bottom: 0;">{{ item.name }}</h2>
          <p style="margin-top: 3px; margin-bottom: 0;"><small>{{ item.barcode }}</small></p>
          <p style="margin-top: 10px"><ion-chip :color="statusColor(item.status)">{{ item.status }}</ion-chip></p>

          <p class="ion-margin-top"><strong><small>Description</small></strong></p>
          <h5 class="ion-no-margin" style="margin-top: 2px">{{ item.description }}</h5>

          <p class="ion-margin-top"><strong><small>Ingredients</small></strong></p>
          <h5 class="ion-no-margin" style="margin-top: 2px">
            <template v-if="item.status !== 'Halal'">
              <span v-html="highlightedIngredients"></span>
            </template>
            <template v-else>
              {{ item.ingredients }}
            </template>
          </h5>
        </div>

        <ion-button
            v-if="item"
            class="ion-margin-top"
            expand="block"
            color="medium"
            @click="goToReport(item.barcode)"
        >
          Report Product
        </ion-button>
      </div>

      <p v-else class="ion-text-center ion-margin-top">❌ Item not found.</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonSkeletonText, IonChip, IonButton
} from '@ionic/vue'
import {onMounted, ref, nextTick, computed} from 'vue'
import { useRoute } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/plugins/supabaseClient'
import {Swiper, SwiperSlide} from "swiper/vue";
import router from "@/router";
import {Pagination, Zoom} from "swiper/modules";
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/zoom'
import AppHeader from "@/components/AppHeader.vue";
import {bagOutline} from "ionicons/icons";

const route = useRoute()
const barcode = route.params.barcode as string

const item = ref<any>(null)
const loading = ref(true)
const isNative = ref(Capacitor.isNativePlatform())
const modules = [Pagination, Zoom];

const ingredientDictionary = ref<Record<string, string>>({});

// If this page should show ads (set meta accordingly), keep this true and include the slot.
// If you used meta:{noAds:true} you can leave the slot out and keep showAds = false.
const showAds = false // set true only if meta.adSpaceId is configured

function statusColor(s: string) {
  return s === 'Halal' ? 'success'
      : s === 'Muslim-friendly' ? 'primary'
          : s === 'Syubhah' ? 'warning'
              : s === 'Haram' ? 'danger'
                  : 'medium'
}

function goToReport(barcode: string) {
  if (!barcode) return
  // if you're closing a modal first, keep the small delay; otherwise you can remove it
  setTimeout(() => {
    router.push({ name: 'report', params: { barcode } })
  }, 300)
}

const highlightedIngredients = computed(() => {
  if (!item.value || !item.value.ingredients) return '';

  // If product is Halal, just return plain text
  if (item.value.status === 'Halal') {
    return item.value.ingredients;
  }

  const rawIngredients = item.value.ingredients;
  const parts = rawIngredients.split(',').map(p => p.trim());

  // Sort dictionary by length to avoid partial overlaps first
  const sortedKeys = Object.keys(ingredientDictionary.value).sort((a, b) => b.length - a.length);

  const highlightedParts = parts.map(part => {
    const lowerPart = part.toLowerCase();
    let matchedKey: string | null = null;

    for (const key of sortedKeys) {
      if (lowerPart.includes(key.toLowerCase())) {
        matchedKey = key;
        break; // ✅ only first/highest match
      }
    }

    if (matchedKey) {
      const color = ingredientDictionary.value[matchedKey];
      return `<span style="font-weight:600;color:var(${color});">${part}</span>`;
    } else {
      return part;
    }
  });

  return highlightedParts.join(', ');
});

onMounted(async () => {
  loading.value = true
  try {
    const [prodRes, hlRes] = await Promise.all([
      supabase.from('products')
          .select('*')
          .eq('barcode', barcode)
          .maybeSingle(), // avoids throwing when 0 rows
      supabase.from('ingredient_highlights')
          .select('keyword, color')
    ])

    // product
    if (prodRes.error) {
      console.error('Product load error:', prodRes.error)
    } else {
      item.value = prodRes.data
    }

    // highlights
    if (hlRes.error) {
      console.error('Highlights load error:', hlRes.error)
    } else if (hlRes.data) {
      ingredientDictionary.value = Object.fromEntries(
          hlRes.data.map(h => [h.keyword, h.color])
      )
    }
  } finally {
    loading.value = false
    // let the page paint, then ask the global banner scheduler to realign
    await nextTick()
    ;(window as any).scheduleBannerUpdate?.()
  }
})

</script>
