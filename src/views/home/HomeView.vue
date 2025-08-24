<template>
  <ion-page>
    <ion-header>
      <app-header :title="$t('home.title')" :showProfile="true" />
    </ion-header>
    <ion-content class="ion-padding">

      <!-- Combined Product Status + Stats Card -->
      <ion-card class="featured-card">
        <ion-card-header>
          <ion-card-title>{{ $t('home.mainFeature') }}</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <div class="scan-row">
            <ion-button
                expand="block"
                color="carrot"
                @click="goScan"
            >
              <ion-icon :icon="scanOutline" slot="start" />
              {{ $t('home.scan') }}
            </ion-button>
          </div>

          <div class="scan-row">
            <ion-button
                expand="block"
                color="carrot"
                @click="goToSearchAndScan"
            >
              <ion-icon :icon="barcodeOutline" slot="start" />
              {{ $t('home.scanBarcode') }}
            </ion-button>
          </div>

          <div class="stats-row">
            <div class="stat-box" @click="$router.push('/search')">
              <h2>{{ totalProducts }}</h2>
              <p>{{ $t('home.productsCount') }}</p>
            </div>

            <div class="stat-box" @click="$router.push('/explore')">
              <h2>{{ totalLocations }}</h2>
              <p>{{ $t('home.halalLocationsCount') }}</p>
            </div>
          </div>
        </ion-card-content>
      </ion-card>


      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ $t('home.productStatus') }}</ion-card-title>
        </ion-card-header>
        <div class="chart-flex">
          <DoughnutChart ref="doughnutRef" :data="statusChartData" :options="chartOptions" />
        </div>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import {
  IonPage, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonHeader, onIonViewWillEnter
} from '@ionic/vue';
import { useRouter } from 'vue-router';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { Doughnut } from 'vue-chartjs';
import { supabase } from '@/plugins/supabaseClient';
import type { ChartData, ChartOptions } from 'chart.js';
import AppHeader from "@/components/AppHeader.vue";

ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale);

const DoughnutChart = Doughnut;

const doughnutRef = ref<any>(null);

const totalProducts = ref(0);
const totalLocations = ref(0);

import relativeTime from 'dayjs/plugin/relativeTime'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {barcodeOutline, scanOutline} from "ionicons/icons";

// Extend dayjs
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

const ionColorDark = getComputedStyle(document.documentElement)
    .getPropertyValue('--ion-color-dark')
    .trim(); // remove whitespace

const chartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',  // ✅ Move legend to right
      align: 'center',
      labels: {
        color: ionColorDark, // Sets the color of the legend labels to white
        boxWidth: 14,      // Smaller color boxes
        font: {
          size: 12         // Smaller font
        },
        padding: 8
      }
    }
  },
  layout: {
    padding: 0
  },
};

const statusChartData = ref<ChartData<'doughnut'>>({
  labels: ['Halal', 'Muslim-friendly', 'Syubhah', 'Haram'],
  datasets: [{ backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545'], data: [0,0,0,0] }],
});


const router = useRouter();
const news = ref<any[]>([]);
const loadingNews = ref(true);

onMounted(async () => {
  await fetchStats();
  await fetchNews();
});

onIonViewWillEnter(async () => {
  await fetchStats()
})

function goScan() {
  router.push('/scan')
}

function truncateText(text: string, wordLimit = 10) {
  const words = text.trim().split(/\s+/);
  return words.slice(0, wordLimit).join(' ') + (words.length > wordLimit ? '…' : '');
}

function generateSummary(content: string, title: string, wordLimit = 20) {
  // Remove HTML tags
  const text = content.replace(/<[^>]+>/g, '').trim();

  // Split into clean lines
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Remove title duplicates
  const filtered = lines.filter(line => !line.includes(title)).join(' ');

  // Split into words
  const allWords = filtered.split(/\s+/);
  const truncatedWords = allWords.slice(0, wordLimit);

  // Only add ellipsis if original text is longer than limit
  return truncatedWords.join(' ') + (allWords.length > wordLimit ? '…' : '');
}

async function fetchNews() {
  const { data, error } = await supabase
      .from('news')
      .select('id, title, header_image, content, created_at, author_name')
      .order('created_at', { ascending: false })
      .limit(3);

  if (!error && data) {
    news.value = data.map(item => ({
      id: item.id,
      title: truncateText(item.title, 12),
      summary: generateSummary(item.content, item.title, 10),
      thumbnail: item.header_image || 'https://placehold.co/600x400',
      created_at: item.created_at
    }));
  }

  loadingNews.value = false;
}

async function fetchStats() {
  const { data: products } = await supabase.from('products').select('status, created_at');
  if (products) {
    totalProducts.value = products.length;
    const statusCount = { Halal:0,'Muslim-friendly':0,Syubhah:0,Haram:0 };
    const monthlyCount: Record<string, number> = {};

    products.forEach((p) => {
      if (statusCount[p.status as keyof typeof statusCount] !== undefined)
        statusCount[p.status as keyof typeof statusCount]++;
      const month = new Date(p.created_at).toLocaleString('default', { month:'short',year:'numeric' });
      monthlyCount[month] = (monthlyCount[month]||0)+1;
    });

    updateChartSmoothly(doughnutRef, Object.values(statusCount));
  }

  const { data: locations } = await supabase.from('locations').select('id');
  if (locations) totalLocations.value = locations.length;
}

function updateChartSmoothly(chartRef: any, newData: number[]) {
  nextTick(() => {
    if (!chartRef.value?.chart) return;
    const chart = chartRef.value.chart;
    chart.data.datasets[0].data = newData;
    chart.update('active');
  });
}

function goToSearchAndScan() {
  router.push({ path: '/search', query: { scan: 'true' } })
}
</script>

<style scoped>
/* === Chart === */
.featured-card {
  cursor: auto;
  display: flex;             /* enable flexbox */
  flex-direction: column;    /* stack children vertically */
  justify-content: center;   /* center them vertically */
}


.chart-flex {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;  /* ✅ taller to fit larger donut */
  padding-bottom: 20px;
  padding-top: 20px;
}

.chart-flex canvas {
  cursor: pointer;
  width: 100%; /* ✅ make doughnut larger */
  max-height: 400px;
}

/* === Stats Row === */
.stats-row {
  margin-top: 10px;
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  min-height: 120px;
}

.scan-row {
  margin-top: 5px;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  min-height: 60px;
  width: 100%;
  text-transform: none;
}

.scan-row > * {
  flex: 1; /* equal width for children */
}

.scan-row ion-button {
  text-transform: none;
  font-size: 1.2rem;   /* 🔹 increase base text size */
  font-weight: 500;    /* optional: make it a bit bolder */
}

.stat-box {
  cursor: pointer;
  flex: 1 1 45%;
  min-width: 140px;
  height: 100px;
  background: var(--ion-color-light);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: transform 0.2s ease;
  will-change: transform; /* ✅ prevents bouncing */
}

.stat-box:hover {
  transform: translateY(-2px);
}

.stat-box h2 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 600;
}

.stat-box p {
  margin: 2px 0;
  font-size: 1.0rem;
  color: var(--ion-color-medium);
}

/* ✅ Optional: On larger screens center them and give space */
@media (min-width: 768px) {
  .stats-row {
    justify-content: space-evenly;
  }
}

/* If your style block is scoped, use :deep(); if not scoped, drop :deep() */
:deep(#scan-fab) {
  position: fixed;
  right: 20px;
  bottom: calc(16px + env(safe-area-inset-bottom) + var(--tabbar-height, 0px));
  z-index: 20;
  /* Override Ionic default */
  text-transform: none;
}

:deep(#scan-fab.center) {
  right: auto;
  left: 50%;
  transform: translateX(-50%);
}

/* Ensure the tab bar exposes its height as a CSS var */
#footer-tabs {
  --tabbar-height: 56px; /* fallback */
  height: var(--tabbar-height);
}

</style>

