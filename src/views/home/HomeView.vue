<template>
  <ion-page>
    <ion-header>
      <app-header :title="$t('home.title')" :showProfile="true" />
    </ion-header>

    <ion-content class="ion-padding">

      <!-- === Main Feature: Scan + Stats === -->
      <ion-card class="featured-card">
        <ion-card-header>
          <ion-card-title>{{ $t('home.mainFeature') }}</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <!-- Scan Buttons -->
          <div class="scan-row">
            <ion-button expand="block" color="carrot" @click="goScan">
              <ion-icon :icon="scanOutline" slot="start" />
              {{ $t('home.scan') }}
            </ion-button>
          </div>
          <div class="scan-row">
            <ion-button expand="block" color="carrot" @click="goToSearchAndScan">
              <ion-icon :icon="barcodeOutline" slot="start" />
              {{ $t('home.scanBarcode') }}
            </ion-button>
          </div>

          <!-- Stats -->
          <div class="stats-row">
            <div class="stat-box" @click="openProducts">
            <h2 v-if="!loadingStats">{{ totalProducts }}</h2>
              <ion-skeleton-text
                  v-else
                  animated
                  style="width: 70px; height: 28px; border-radius: 4px;"
              />
              <p>{{ $t('home.productsCount') }}</p>
            </div>

            <div class="stat-box" @click="openLocations">
            <h2 v-if="!loadingStats">{{ totalLocations }}</h2>
              <ion-skeleton-text
                  v-else
                  animated
                  style="width: 70px; height: 28px; border-radius: 4px;"
              />
              <p>{{ $t('home.halalLocationsCount') }}</p>
            </div>
          </div>

        </ion-card-content>
      </ion-card>

      <!-- === Discover Products === -->
      <ion-card>
        <ion-card-header>
          <div class="card-header-row">
            <ion-card-title>{{ $t('home.discoverProducts') }}</ion-card-title>
            <ion-button
                fill="clear"
                size="small"
                color="carrot"
                @click="viewMoreProducts"
            >
              {{ $t('home.viewMore') }}
            </ion-button>
          </div>
        </ion-card-header>

        <ion-card-content>
          <!-- 🔹 Skeleton loader -->
          <div v-if="loadingProducts" class="discover-grid">
            <ion-card v-for="n in 3" :key="'skeleton-p-' + n" class="discover-item">
              <ion-skeleton-text animated style="width: 100%; height: 140px; border-radius: 12px;" />
              <ion-skeleton-text animated style="width: 95%; height: 30px; margin: 6px auto;" />
              <ion-skeleton-text animated style="width: 40%; height: 12px; margin: 0 auto;" />
            </ion-card>
          </div>

          <!-- 🔹 Real content -->
          <div v-else class="discover-grid">
            <ion-card
                v-for="p in recentProducts"
                :key="p.barcode"
                class="discover-item"
                button
                @click="openProduct(p)"
            >
              <img :src="p.image || 'https://placehold.co/200x200'" alt="product" class="discover-img" />
              <ion-label class="discover-label">
                <ion-chip
                    :class="p.status === 'Halal' ? 'chip-success'
              : p.status === 'Muslim-friendly' ? 'chip-primary'
              : p.status === 'Syubhah' ? 'chip-warning'
              : p.status === 'Haram' ? 'chip-danger'
              : 'chip-medium'"
                    style="font-size: 14px; margin-bottom: 4px;"
                >
                  {{ p.status }}
                </ion-chip>
                <p>Added {{ fromNowToTaipei(p.created_at) }}</p>
              </ion-label>
            </ion-card>
          </div>
        </ion-card-content>
      </ion-card>


      <!-- === Discover Locations === -->
      <ion-card>
        <ion-card-header>
          <div class="card-header-row">
            <ion-card-title>{{ $t('home.discoverLocations') }}</ion-card-title>
            <ion-button
                fill="clear"
                size="small"
                color="carrot"
                @click="viewMoreLocations"
            >
              {{ $t('home.viewMore') }}
            </ion-button>
          </div>
        </ion-card-header>
        <ion-card-content>
          <div v-if="loadingLocations" class="discover-grid">
            <ion-card v-for="n in 3" :key="'skeleton-l-' + n" class="discover-item">
              <ion-skeleton-text animated style="width: 100%; height: 140px; border-radius: 12px;" />
              <ion-skeleton-text animated style="width: 90%; height: 12px; margin: 6px auto;" />
              <ion-skeleton-text animated style="width: 80%; height: 12px; margin: 6px auto;" />
              <ion-skeleton-text animated style="width: 40%; height: 12px; margin: 0 auto;" />
            </ion-card>
          </div>

          <div v-else class="discover-grid">
            <ion-card
                v-for="loc in recentLocations"
                :key="loc.id"
                class="discover-item"
                button
                @click="openLocation(loc)"
            >
              <img
                  :src="loc.image || 'https://placehold.co/200x200'"
                  alt="location"
                  class="discover-img"
              />
              <ion-label class="discover-label">
                <h3>{{ loc.name }}</h3>
                <p>Added {{ fromNowToTaipei(loc.created_at) }}</p>
              </ion-label>
            </ion-card>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- === Product Status Chart === -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ $t('home.productStatus') }}</ion-card-title>
        </ion-card-header>
        <div class="chart-flex">
          <DoughnutChart ref="doughnutRef" :data="statusChartData" :options="chartOptions" />
        </div>
      </ion-card>

      <!-- === Location Categories Chart === -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ $t('home.locationCategories') }}</ion-card-title>
        </ion-card-header>
        <div class="chart-flex">
          <DoughnutChart ref="locationChartRef" :data="locationChartData" :options="chartOptions" />
        </div>
      </ion-card>

      <!-- === Leaderboard === -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ $t('home.leaderboard') }}</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <ion-list v-if="!loadingLeaderboard">
            <ion-item
                v-for="(user, index) in leaderboard"
                :key="user.id"
                lines="none"
                button
                @click="openUserProfile(user, $event)"
            >
              <div style="display: flex; align-items: center; width: 100%;">

                <!-- Rank -->
                <div style="width: 28px; text-align: center; font-weight: 600;">
                  <span v-if="index === 0">🥇</span>
                  <span v-else-if="index === 1">🥈</span>
                  <span v-else-if="index === 2">🥉</span>
                  <span v-else>{{ index + 1 }}</span>
                </div>

                <!-- Avatar -->
                <ion-avatar style="width: 40px; height: 40px; margin: 0 10px;">
                  <img
                      :src="user.public_leaderboard ? (user.avatar_url || 'https://placehold.co/64x64') : 'https://placehold.co/64x64?text=?'"
                      alt="Avatar"/>
                </ion-avatar>

                <!-- Info -->
                <ion-label style="flex: 1; min-width: 0;">
                  <h2 style="margin: 0; font-weight: 600; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    {{ user.public_leaderboard ? user.display_name : `Anonymous #${index + 1}` }}
                  </h2>
                  <p style="margin: 0; font-size: 0.8rem; color: var(--ion-color-medium);">
                    {{ getLevelLabel(user.points) }}
                  </p>
                </ion-label>

                <!-- Points Badge -->
                <ion-badge
                    :color="getLevelColor(user.points)"
                    style="white-space: nowrap; font-size: 0.75rem; min-width: 70px; text-align: center;"
                >
                  {{ user.points }} pts
                </ion-badge>

              </div>
            </ion-item>
          </ion-list>


          <ion-skeleton-text
              v-else
              animated
              style="width:100%;height:120px;border-radius:8px;"
          />
        </ion-card-content>
      </ion-card>
    </ion-content>

    <!-- 👇 Popover instead of modal -->
    <ion-popover
        :is-open="!!selectedUser"
        :event="popoverEvent"
        @didDismiss="closePopover"
    >
      <ion-content class="ion-padding" style="text-align:center; min-width: 220px;">
        <div v-if="selectedUser">

          <!-- ✅ Public profile shown -->
          <template v-if="selectedUser.public_leaderboard">
            <ion-avatar style="width:60px;height:60px;margin:auto;">
              <img :src="selectedUser.avatar_url || 'https://placehold.co/60x60?text=?'"  alt="Avatar"/>
            </ion-avatar>

            <h3 style="margin-top:6px; font-size:1rem;">
              {{ selectedUser.display_name }}
            </h3>

            <p style="margin:4px 0; font-size:0.85rem; color:var(--ion-color-medium);">
              {{ getLevelLabel(selectedUser.points) }} ({{ selectedUser.points }} pts)
            </p>

            <p v-if="selectedUser.bio" style="margin-top:6px; font-size:0.8rem; color:var(--ion-color-dark)">
              {{ selectedUser.bio }}
            </p>
          </template>

          <!-- ❌ No public profile: only show XP -->
          <template v-else>
            <p style="margin:4px 0; font-size:0.9rem; font-weight:600;">
              Anonymous
            </p>
            <p style="margin:4px 0; font-size:0.85rem; color:var(--ion-color-medium);">
              {{ getLevelLabel(selectedUser.points) }} ({{ selectedUser.points }} pts)
            </p>
          </template>

        </div>
      </ion-content>
    </ion-popover>

  </ion-page>
</template>

<script setup lang="ts">
/* ---------------- Imports ---------------- */
import { ref, nextTick } from 'vue'
import {
  IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonButton, IonIcon, IonHeader, onIonViewWillEnter, IonLabel, IonChip, IonSkeletonText,
    IonList, IonBadge, IonAvatar, IonItem, IonPopover
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { supabase } from '@/plugins/supabaseClient'
import type { ChartData, ChartOptions } from 'chart.js'
import AppHeader from "@/components/AppHeader.vue"
import relativeTime from 'dayjs/plugin/relativeTime'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { barcodeOutline, scanOutline } from "ionicons/icons"
import { useLeaderboard } from "@/composables/useLeaderboard";
import {getLevelColor, getLevelLabel} from "@/composables/useLevels";
import {ActivityLogService} from "@/services/ActivityLogService";

const selectedUser = ref<any | null>(null)
const popoverEvent = ref<Event | null>(null)

/* ---------------- Chart Setup ---------------- */
ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale)
const DoughnutChart = Doughnut

/* ---------------- State ---------------- */
const router = useRouter()
const doughnutRef = ref<any>(null)
const locationChartRef = ref<any>(null)
const RECENT_DISCOVER_LIMIT = 15
const totalProducts = ref(0)
const totalLocations = ref(0)
const loadingStats = ref(true)
const loadingProducts = ref(true)
const loadingLocations = ref(true)
const recentProducts = ref<any[]>([])
const recentLocations = ref<any[]>([])

const { leaderboard, loading: loadingLeaderboard, fetchLeaderboard } = useLeaderboard();

const ionColorDark = getComputedStyle(document.documentElement)
    .getPropertyValue('--ion-color-dark')
    .trim()

const chartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      align: 'center',
      labels: {
        color: ionColorDark,
        boxWidth: 14,
        font: { size: 12 },
        padding: 8
      }
    }
  }
}

/* ---------------- Product Status Chart ---------------- */
const statusChartData = ref<ChartData<'doughnut'>>({
  labels: ['Halal', 'Muslim-friendly', 'Syubhah', 'Haram'],
  datasets: [{
    backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545'],
    data: [0, 0, 0, 0]
  }]
})

/* ---------------- Location Categories Chart ---------------- */
const locationChartData = ref<ChartData<'doughnut'>>({
  labels: [],
  datasets: [{
    backgroundColor: [
      '#3498db', '#2ecc71', '#f1c40f',
      '#e74c3c', '#9b59b6', '#1abc9c', '#e67e22'
    ],
    data: []
  }]
})

/* ---------------- Utilities ---------------- */
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

function fromNowToTaipei(dateString?: string) {
  if (!dateString) return ''
  return dayjs.utc(dateString).tz('Asia/Taipei').fromNow()
}

function updateChartSmoothly(chartRef: any, newData: number[]) {
  nextTick(() => {
    if (!chartRef.value?.chart) return
    const chart = chartRef.value.chart
    chart.data.datasets[0].data = newData
    chart.update('active')
  })
}

function openUserProfile(user: any, ev: Event) {
  ActivityLogService.log("home_leaderboard_profile", {
    user_id: user.id,
    display_name: user.display_name
  });

  selectedUser.value = user
  popoverEvent.value = ev   // 👈 attach the click event for positioning
}

function closePopover() {
  selectedUser.value = null
  popoverEvent.value = null
}

/* ---------------- Data Fetching ---------------- */
async function fetchRecentProducts() {
  loadingProducts.value = true
  const { data, error } = await supabase
      .from("products")
      .select("barcode, name, status, photo_front_url, created_at, product_categories(name)")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(RECENT_DISCOVER_LIMIT)

  if (!error && data) {
    recentProducts.value = data.map(p => ({
      barcode: p.barcode,
      name: p.name,
      status: p.status,
      category: p.product_categories?.[0]?.name || "",
      image: p.photo_front_url,
      created_at: p.created_at
    }))
  }
  loadingProducts.value = false
}

async function fetchRecentLocations() {
  loadingLocations.value = true
  const { data, error } = await supabase
      .from('locations')
      .select('id, name, image, type_id, location_types(name), created_at')
      .order('created_at', { ascending: false })
      .limit(RECENT_DISCOVER_LIMIT)

  if (!error && data) {
    recentLocations.value = data.map(l => ({
      id: l.id,
      name: l.name,
      image: l.image,
      type: l.location_types?.[0]?.name || '',
      created_at: l.created_at
    }))
  }
  loadingLocations.value = false
}

async function fetchStats() {
  loadingStats.value = true
  const { data: products } = await supabase.from('products').select('status, created_at')
  if (products) {
    totalProducts.value = products.length
    const statusCount = { Halal:0,'Muslim-friendly':0,Syubhah:0,Haram:0 }
    products.forEach((p) => {
      if (statusCount[p.status as keyof typeof statusCount] !== undefined) {
        statusCount[p.status as keyof typeof statusCount]++
      }
    })
    updateChartSmoothly(doughnutRef, Object.values(statusCount))
  }

  const { data: locations } = await supabase.from('locations').select('id')
  if (locations) totalLocations.value = locations.length

  loadingStats.value = false
}

async function fetchLocationCategoryStats() {
  const { data, error } = await supabase
      .from("locations")
      .select(`
        id,
        name,
        image,
        created_at,
        location_types!inner ( name )
      `)

  if (!error && data) {
    const counts: Record<string, number> = {}

    data?.forEach(loc => {
      //@ts-expect-error always name
      const typeName = loc.location_types?.name || 'Unknown'
      counts[typeName] = (counts[typeName] || 0) + 1
    })

    const labels = Object.keys(counts)
    const values = Object.values(counts)

    locationChartData.value = {
      labels,
      datasets: [
        {
          backgroundColor: ['#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#f1c40f', '#e74c3c', '#1abc9c'],
          data: values
        }
      ]
    }
  }
}

/* ---------------- Lifecycle ---------------- */

onIonViewWillEnter(async () => {
  ActivityLogService.log("home_page_open");

  fetchStats()
  fetchLocationCategoryStats()   // ✅ new
  fetchRecentProducts()
  fetchRecentLocations()
  fetchLeaderboard()   // ✅ new
})

/* ---------------- Navigation ---------------- */
function openProducts() {
  ActivityLogService.log("home_open_products");
  router.push('/search');
}

function goScan() {
  ActivityLogService.log("home_scan_ingredient");
  router.push('/scan');
}

function goToSearchAndScan() {
  ActivityLogService.log("home_scan_barcode");
  router.push({ path: '/search', query: { scan: 'true' } });
}

function openLocations() {
  ActivityLogService.log("home_open_locations");
  router.push('/explore');
}

function viewMoreProducts() {
  ActivityLogService.log("home_viewmore_products");
  router.push('/search');
}

function viewMoreLocations() {
  ActivityLogService.log("home_viewmore_locations");
  router.push('/explore');
}

async function openProduct(p: any) {
  // increment product views
  await supabase.rpc("increment_product_view", {
    product_barcode: p.barcode
  });

  ActivityLogService.log("home_product_click", {
    barcode: p.barcode,
    name: p.name,
    status: p.status
  });

  router.push(`/item/${p.barcode}`);
}


async function openLocation(loc: any) {

  // increment location views
  await supabase.rpc("increment_location_view", {
    location_id: loc.id
  });

  ActivityLogService.log("home_location_click", {
    id: loc.id,
    name: loc.name,
    type: loc.type
  });

  router.push(`/place/${loc.id}`);
}


</script>

<style scoped>
/* === Featured Card === */
.featured-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* === Chart === */
.chart-flex {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 20px 0;
}
.chart-flex canvas {
  width: 100%;
  max-height: 400px;
}

/* === Stats Row === */
.stats-row {
  margin-top: 10px;
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
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
  font-size: 1rem;
  color: var(--ion-color-medium);
}

/* === Scan Buttons === */
.scan-row {
  margin-top: 5px;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  min-height: 60px;
}
.scan-row > * {
  flex: 1;
}
.scan-row ion-button {
  text-transform: none;
  font-size: 1.2rem;
  font-weight: 500;
}

/* === Discover Section === */
.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
</style>
