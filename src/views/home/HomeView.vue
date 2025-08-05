<template>
  <ion-page>
    <app-header title="Halal Formosa" />
    <ion-content class="ion-padding">

      <!-- Combined Product Status + Stats Card -->
      <ion-card class="chart-card">
        <ion-card-header>
          <ion-card-title>Product Status</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <div class="chart-flex">
            <DoughnutChart ref="doughnutRef" :data="statusChartData" :options="chartOptions" />
          </div>

          <div class="stats-row">
            <div class="stat-box" @click="$router.push('/search')">
              <h2>{{ totalProducts }}</h2>
              <p>Products</p>
            </div>

            <div class="stat-box" @click="$router.push('/explore')">
              <h2>{{ totalLocations }}</h2>
              <p>Halal Locations</p>
            </div>
          </div>
        </ion-card-content>
      </ion-card>


      <!-- Halal & Islam News -->
      <ion-card class="news-card">
        <ion-card-header>
          <ion-card-title>Halal & Islam News</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item
                v-for="(item, idx) in news"
                :key="idx"
                button
                detail
                class="news-item"
                @click="router.push(`/news/${item.id}`)"
            >
            <div class="news-thumbnail">
                <img :src="item.thumbnail" loading="lazy" alt="News Thumbnail" />
              </div>
              <ion-label>
                <h2>{{ item.title }}</h2>
                <p>{{ item.summary }}</p>
              </ion-label>
            </ion-item>
          </ion-list>

          <template v-if="loadingNews">
            <ion-skeleton-text animated style="width: 80%; height: 20px"></ion-skeleton-text>
            <ion-skeleton-text animated style="width: 60%; height: 14px; margin-top: 6px"></ion-skeleton-text>
          </template>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonList, IonSkeletonText
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

const chartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',  // ✅ Move legend to right
      align: 'center',
      labels: {
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
      .limit(10);

  if (!error && data) {
    news.value = data.map(item => ({
      id: item.id,
      title: truncateText(item.title, 12),
      summary: generateSummary(item.content, item.title, 10),
      thumbnail: item.header_image || 'https://placehold.co/600x400'
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
</script>

<style scoped>
/* === Chart === */
.chart-card {
  cursor: auto;
}

.chart-flex {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;  /* ✅ taller to fit larger donut */
  padding-bottom: 10px;
}

.chart-flex canvas {
  cursor: pointer;
  width: 100%; /* ✅ make doughnut larger */
  max-height: 400px;
}

/* === Stats Row === */
.stats-row {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  min-height: 120px;
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
  font-size: 1.5rem;
  font-weight: 600;
}

.stat-box p {
  margin: 2px 0;
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}

/* ✅ Optional: On larger screens center them and give space */
@media (min-width: 768px) {
  .stats-row {
    justify-content: space-evenly;
  }
}

/* === News Section === */
.news-card {
  cursor: auto;
}

.news-item {
  display: flex;
  align-items: center; /* Vertical center */
}

.news-thumbnail {
  width: 100px;
  height: 125px;
  border-radius: 8px;
  overflow: hidden;
  margin-right: 12px;
  flex-shrink: 0;
}

.news-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>


