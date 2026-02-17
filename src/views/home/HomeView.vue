<template>
  <ion-page>
    <ion-header>
      <app-header :title="$t('home.title')" :showProfile="true" />
    </ion-header>

    <ion-content class="ion-padding">

      <!-- === Prayer Times Horizontal === -->
      <ion-card class="prayer-card">
        <ion-card-header>
          <div class="prayer-header-row">
            <ion-card-title>
              <template v-if="nextPrayer && userLocation">
                <div class="prayer-title-main">
                  {{ nextPrayer.label }} Prayer in {{ upcomingCountdown }}
                </div>
                <div class="prayer-title-location">
                  <ion-icon :icon="locationOutline" slot="start" /> {{ userLocation.city || 'Current Location' }}
                </div>
              </template>
              <template v-else>
                Prayer Times
              </template>
            </ion-card-title>

            <!-- 🧭 Find Qibla (header action) -->
            <ion-button
                size="small"
                fill="outline"
                color="carrot"
                class="qibla-header-btn"
                @click="goQibla"
            >
              🧭 Qibla
            </ion-button>
          </div>
        </ion-card-header>



        <ion-card-content>
          <!-- 🔹 Skeleton: Prayer pills -->
          <div
              v-if="loadingPrayerTimes"
              class="prayer-horizontal"
          >
            <div
                v-for="n in 5"
                :key="'prayer-skel-' + n"
                class="prayer-pill skeleton"
            >
              <ion-skeleton-text
                  animated
                  style="width: 50%; height: 12px; border-radius: 6px;"
              />
              <ion-skeleton-text
                  animated
                  style="width: 70%; height: 22px; margin-top: 6px; border-radius: 6px;"
              />
            </div>
          </div>

          <!-- 🔹 Skeleton: Qibla button -->
          <div
              v-if="loadingPrayerTimes"
              class="qibla-row"
          >
            <ion-skeleton-text
                animated
                style="width: 110px; height: 28px; border-radius: 999px;"
            />
          </div>

          <!-- 🔹 Real content -->
          <template v-else>
            <div
                class="prayer-horizontal"
                ref="prayerScroll"
            >
              <div class="prayer-track">
                <div
                    v-for="p in prayerList"
                    :key="p.key"
                    :data-key="p.key"
                    :class="[
  'prayer-pill',
  p.key === currentPrayerKey ? 'active' : ''
]"
                >
                  <span class="label">{{ p.label }}</span>
                  <span class="time">{{ p.time }}</span>
                </div>
              </div>
            </div>

          </template>
        </ion-card-content>

      </ion-card>



      <!-- === Main Feature: Scan + Stats === -->
      <ion-card class="featured-card no-pointer">
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

      <!-- === Our Partner=== -->
      <ion-card class="compact-section no-pointer">
        <ion-card-header>
          <div class="card-header-row">
            <ion-card-title>
              {{ $t('home.ourPartners') }}
            </ion-card-title>

            <ion-button
                fill="clear"
                size="small"
                color="carrot"
                @click="viewMorePartners"
            >
              {{ $t('home.viewMore') }}
            </ion-button>
          </div>
        </ion-card-header>

        <ion-card-content>
          <div v-if="loadingPartners" class="discover-grid compact-grid">
            <ion-card
                v-for="n in 5"
                :key="'partner-skel-' + n"
                class="discover-item discover-item--compact"
            >
              <ion-skeleton-text animated style="width:100%;height:120px;border-radius:12px;" />
              <ion-skeleton-text animated style="width:80%;height:14px;margin:6px auto;" />
            </ion-card>
          </div>

          <div v-else class="discover-grid compact-grid">
            <ion-card
                v-for="partner in displayedPartners"
                :key="partner.id"
                :class="[
  'discover-item',
  'discover-item--compact',
  partner.partner_tier
]"

                button
                @click="openPartner(partner)"
            >
              <ion-badge
                  v-if="partner.partner_tier"
                  :class="['tier-badge', partner.partner_tier]"
              >
                {{ partner.partner_tier.toUpperCase() }} PARTNER
              </ion-badge>


              <img
                  :src="partner.logo"
                  :alt="partner.name"
                  class="discover-img discover-img--compact"
              />

              <ion-label class="discover-label discover-label--compact">
                <p class="discover-name">
                  {{ partner.name }}
                </p>
              </ion-label>
            </ion-card>

          </div>
        </ion-card-content>

      </ion-card>




      <!-- === Discover Products === -->
      <ion-card class="no-pointer">
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
            <ion-card v-for="n in 5" :key="'skeleton-p-' + n" class="discover-item">
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
      <ion-card class="no-pointer">
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
            <ion-card v-for="n in 5" :key="'skeleton-l-' + n" class="discover-item">
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

      <!-- === Latest News === -->
      <ion-card class="no-pointer">
        <ion-card-header>
          <div class="card-header-row">
            <ion-card-title>
              {{ $t('home.latestNews') }}
            </ion-card-title>

            <ion-button
                fill="clear"
                size="small"
                color="carrot"
                @click="viewMoreNews"
            >
              {{ $t('home.viewMore') }}
            </ion-button>
          </div>
        </ion-card-header>

        <ion-card-content>
          <!-- 🔹 Skeleton -->
          <div v-if="loadingNews" class="discover-grid">
            <ion-card
                v-for="n in 5"
                :key="'news-skeleton-' + n"
                class="discover-item"
            >
              <ion-skeleton-text animated style="width:100%;height:140px;border-radius:12px;" />
              <ion-skeleton-text animated style="width:90%;height:14px;margin:6px auto;" />
              <ion-skeleton-text animated style="width:60%;height:12px;margin:0 auto;" />
            </ion-card>
          </div>

          <!-- 🔹 Real News -->
          <div v-else class="discover-grid">
            <ion-card
                v-for="news in recentNews"
                :key="news.id"
                class="discover-item"
                style="height: 210px"
                button
                @click="openNews(news)"
            >
              <img
                  :src="news.cover || 'https://placehold.co/400x250?text=News'"
                  class="discover-img"
                  alt="news"
              />

              <ion-label class="discover-label">
                <h3 class="discover-name">
                  {{ news.title }}
                </h3>

                <p style="font-size:12px;color:var(--ion-color-medium);">
                  {{ fromNowToTaipei(news.created_at) }}
                </p>
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
      <ion-card >
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
import {ref, nextTick, computed, onBeforeUnmount, watch} from 'vue'
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
import {barcodeOutline, locationOutline, scanOutline} from "ionicons/icons"
import { useLeaderboard } from "@/composables/useLeaderboard";
import {getLevelColor, getLevelLabel} from "@/composables/useLevels";
import {ActivityLogService} from "@/services/ActivityLogService";
import { refreshSubscriptionStatus} from "@/composables/useSubscriptionStatus";
import {Capacitor} from "@capacitor/core";
import { Geolocation } from '@capacitor/geolocation'
import { PrayTime } from 'praytime'

let timeInterval: number | null = null

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
const loadingNews = ref(true)
const recentNews = ref<any[]>([])

const userLocation = ref<{
  lat: number
  lng: number
  city?: string
} | null>(null)


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

const halalPartners = ref<any[]>([])
const loadingPartners = ref(true)

type PrayerTimes = {
  fajr: string
  sunrise: string
  dhuhr: string
  asr: string
  maghrib: string
  isha: string
}

const prayerTimes = ref<PrayerTimes | null>(null)
const loadingPrayerTimes = ref(true)
const prayerScroll = ref<HTMLElement | null>(null)

/* ---------------- Utilities ---------------- */
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

const userTimezone = ref(dayjs.tz.guess())

function fromNowToTaipei(dateString?: string) {
  if (!dateString) return ''
  return dayjs.utc(dateString).tz(userTimezone.value).fromNow()
}

const nowTime = ref(dayjs().tz(userTimezone.value))

function startClock() {
  timeInterval = window.setInterval(() => {
    nowTime.value = dayjs().tz(userTimezone.value)
  }, 1000)
}

async function fetchRecentNews() {
  loadingNews.value = true

  const { data, error } = await supabase
      .from('news')
      .select('id, title, header_image, created_at') // 👈 FIX HERE
      .order('created_at', { ascending: false })
      .limit(RECENT_DISCOVER_LIMIT)

  if (!error && data) {
    recentNews.value = data.map(n => ({
      id: n.id,
      title: n.title,
      cover: n.header_image || 'https://placehold.co/400x250?text=News', // 👈 FIX
      created_at: n.created_at
    }))
  }

  loadingNews.value = false
}

const TIER_PRIORITY: Record<string, number> = {
  gold: 3,
  silver: 2,
  bronze: 1
}

const displayedPartners = computed(() => {
  return [...halalPartners.value].sort((a, b) => {
    return (TIER_PRIORITY[b.partner_tier] || 0)
        - (TIER_PRIORITY[a.partner_tier] || 0)
  })
})

async function getUserLocation(): Promise<{
  lat: number
  lng: number
  city?: string
}> {
  // 1️⃣ Cached first
  const cached = localStorage.getItem('hf_user_location')
  if (cached) {
    const parsed = JSON.parse(cached) as {
      lat: number
      lng: number
      city?: string
    }

    userLocation.value = parsed
    return parsed
  }

  try {
    let lat: number
    let lng: number

    if (Capacitor.isNativePlatform()) {
      // 📱 Native app
      const permission = await Geolocation.requestPermissions()

      if (permission.location !== 'granted') {
        throw new Error('Location permission denied')
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true
      })

      lat = position.coords.latitude
      lng = position.coords.longitude

    } else {
      // 🌐 Web browser fallback
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })

      lat = position.coords.latitude
      lng = position.coords.longitude
    }

    let city = 'Current Location'

    try {
      const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'HalalFormosaApp/1.0'
            }
          }
      )

      console.log('Reverse status:', res.status)

      const data = await res.json()

      city =
          data.address?.city ||
          data.address?.town ||
          data.address?.municipality ||
          data.address?.state ||
          'Current Location'

    } catch (e) {
      console.warn('[Reverse Geocode Failed]', e)
    }

    userLocation.value = { lat, lng, city }


    localStorage.setItem(
        'hf_user_location',
        JSON.stringify(userLocation.value)
    )

    return userLocation.value

  } catch (error) {
    console.warn('[GPS] Using fallback Taipei')

    userLocation.value = {
      lat: 25.0330,
      lng: 121.5654,
      city: 'Taipei'
    }

    return userLocation.value
  }
}

async function fetchPrayerTimes() {
  loadingPrayerTimes.value = true

  const location = await getUserLocation()

  const praytime = new PrayTime('MWL')

  praytime
      .location([location.lat, location.lng])
      .timezone(userTimezone.value)
      .format('24h')
      .adjust({ highLats: 'AngleBased' })

  const times = praytime.getTimes(new Date())

  prayerTimes.value = {
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha
  }

  loadingPrayerTimes.value = false
}


const prayerList = computed(() => {
  if (!prayerTimes.value) return []

  return [
    { key: 'fajr', label: 'Fajr', time: prayerTimes.value.fajr },
    { key: 'dhuhr', label: 'Dhuhr', time: prayerTimes.value.dhuhr },
    { key: 'asr', label: 'Asr', time: prayerTimes.value.asr },
    { key: 'maghrib', label: 'Maghrib', time: prayerTimes.value.maghrib },
    { key: 'isha', label: 'Isha', time: prayerTimes.value.isha }
  ]
})

const currentPrayerKey = computed(() => {
  if (!prayerTimes.value) return null

  const now = nowTime.value
  const today = now.format('YYYY-MM-DD')

  const prayers = prayerList.value.map(p => ({
    ...p,
    timeObj: dayjs.tz(
        `${today} ${p.time}`,
        'YYYY-MM-DD HH:mm',
        userTimezone.value
    )
  }))

  for (let i = 0; i < prayers.length; i++) {
    const current = prayers[i]
    const next = prayers[i + 1]

    if (next) {
      if (now.isAfter(current.timeObj) && now.isBefore(next.timeObj)) {
        return current.key
      }
    } else {
      // Last prayer (Isha)
      if (now.isAfter(current.timeObj)) {
        return current.key
      }
    }
  }

  // If before Fajr
  return 'isha'
})



const nextPrayer = computed(() => {
  if (!prayerTimes.value) return null

  const now = nowTime.value

  for (const p of prayerList.value) {
    const prayerTime = dayjs.tz(
        `${now.format('YYYY-MM-DD')} ${p.time}`,
        'YYYY-MM-DD HH:mm',
        userTimezone.value
    )

    if (prayerTime.isAfter(now)) {
      return {
        ...p,
        timeObj: prayerTime
      }
    }
  }

  // All passed → next is Fajr tomorrow
  const fajrTime = dayjs
      .tz(
          `${now.add(1, 'day').format('YYYY-MM-DD')} ${prayerTimes.value.fajr}`,
          'YYYY-MM-DD HH:mm',
          userTimezone.value
      )

  return {
    key: 'fajr',
    label: 'Fajr',
    time: prayerTimes.value.fajr,
    timeObj: fajrTime
  }
})

const scrollPrayerKey = computed(() => {
  if (nextPrayer.value) return nextPrayer.value.key
  return currentPrayerKey.value
})


watch(
    () => scrollPrayerKey.value,
    async (key) => {
      if (!key) return

      // wait for DOM + Ionic layout
      await nextTick()
      requestAnimationFrame(() => {
        const container = prayerScroll.value
        if (!container) return

        const target = container.querySelector(
            `.prayer-pill[data-key="${key}"]`
        ) as HTMLElement

        if (!target) return

        const offset =
            target.offsetLeft -
            container.clientWidth / 2 +
            target.clientWidth / 2

        container.scrollTo({
          left: offset,
          behavior: 'smooth'
        })
      })
    },
    { immediate: true }
)

const upcomingCountdown = computed(() => {
  if (!nextPrayer.value) return ''

  const totalSeconds = nextPrayer.value.timeObj.diff(nowTime.value, 'second')
  if (totalSeconds <= 0) return '00:00:00'

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [
    hours,
    minutes,
    seconds
  ]
      .map(v => String(v).padStart(2, '0'))
      .join(':')
})


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

async function fetchHomePartners() {
  loadingPartners.value = true

  const { data, error } = await supabase
      .from('partners')
      .select(`
    id,
    name,
    logo_url,
    partner_tier
  `)
      .eq('is_active', true)
      .order('partner_tier', { ascending: false }) // tiers still float up
      .limit(6)

  if (error) {
    console.error('[Home Partners]', error)
    loadingPartners.value = false
    return
  }

  halalPartners.value = (data ?? []).map(b => ({
    id: b.id,
    name: b.name,
    partner_tier: b.partner_tier,
    logo:
        b.logo_url ||
        `https://placehold.co/300x300?text=${encodeURIComponent(b.name)}`
  }))

  loadingPartners.value = false
}




/* ---------------- Lifecycle ---------------- */

onIonViewWillEnter(async () => {
  ActivityLogService.log("home_page_open");

  fetchPrayerTimes()
  startClock()

  fetchStats()
  fetchLocationCategoryStats()
  fetchRecentProducts()
  fetchRecentLocations()
  fetchRecentNews()
  fetchLeaderboard()
  fetchHomePartners()

  if (Capacitor.isNativePlatform()) refreshSubscriptionStatus();
})

onBeforeUnmount(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
    timeInterval = null
  }
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

function goQibla() {
  ActivityLogService.log("home_find_qibla_click")
  router.push({ path: '/qibla', query: { from: 'home' } })
}

function openLocations() {
  ActivityLogService.log("home_open_locations");
  router.push('/explore');
}

function viewMorePartners() {
  ActivityLogService.log("home_viewmore_partners")
  router.push('/partners')
}

function viewMoreProducts() {
  ActivityLogService.log("home_viewmore_products");
  router.push('/search');
}


function viewMoreLocations() {
  ActivityLogService.log("home_viewmore_locations");
  router.push('/explore');
}

function viewMoreNews() {
  ActivityLogService.log("home_viewmore_news")
  router.push('/news')
}

function openNews(news: any) {
  ActivityLogService.log("home_news_click", {
    id: news.id,
    title: news.title
  })

  router.push(`/news/${news.id}`)
}



async function openProduct(p: any) {
  ActivityLogService.log("home_product_click", {
    barcode: p.barcode,
    name: p.name,
    status: p.status
  });

  router.push(`/item/${p.barcode}`);
}


async function openLocation(loc: any) {
  ActivityLogService.log("home_location_click", {
    id: loc.id,
    name: loc.name,
    type: loc.type
  });

  router.push(`/place/${loc.id}`);
}

function openPartner(partner: any) {
  ActivityLogService.log("home_partner_click", {
    id: partner.id,
    name: partner.name
  })

  router.push(`/partner/${partner.id}`)
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

/* ===============================
   Partner Tier Cards
   =============================== */

.discover-item--compact {
  flex: 0 0 140px;
  position: relative;
}

/* Gold */
.discover-item--compact.gold {
  flex: 0 0 260px;
  border: 2px solid var(--ion-color-carrot);
  box-shadow: 0 4px 14px rgba(230, 126, 34, 0.25);
}

/* Silver */
.discover-item--compact.silver {
  flex: 0 0 180px;
}

/* Bronze */
.discover-item--compact.bronze {
  flex: 0 0 160px;
}

/* ===============================
   Prayer Times
   =============================== */
.prayer-card {
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

.prayer-card ion-card-header {
  padding: 4px 4px 2px;
}

.prayer-card ion-card-title {
  font-size: 1rem;
  font-weight: 600;
}
.prayer-card ion-card-content {
  padding: 0;

}

.prayer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-time {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--ion-color-medium);
  letter-spacing: 0.04em;
}


.prayer-horizontal {
  display: flex;
  gap: 12px;

  overflow-x: auto;
  overflow-y: hidden;

  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;        /* Firefox */
  -ms-overflow-style: none;     /* IE / Edge */

  padding: 4px 4px 2px;
}

.prayer-horizontal::-webkit-scrollbar {
  display: none;                /* Chrome / Safari / iOS */
}

/* Inner track */
.prayer-track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(80px, 1fr);
  gap: 12px;

  width: 100%;
  padding: 4px 12px 2px;
}

@media (min-width: 1024px) {
  .prayer-track {
    grid-auto-columns: minmax(100px, 1fr);
  }
}

.prayer-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.qibla-header-btn {
  font-weight: 600;
  --padding-start: 10px;
  --padding-end: 10px;
}


.prayer-pill {
  flex: 0 0 80px;
  scroll-snap-align: center;

  border-radius: 6px;
  padding: 7px 6px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  transition: all 0.25s ease;
  flex-shrink: 0;
}

.prayer-pill.now {
  border: 1px dashed rgba(217, 119, 6, 0.6);
}

.prayer-pill .label {
  font-size: 0.7rem;
  color: var(--ion-color-medium);
}

.prayer-pill .time {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0;
}

/* 🔥 Active / Nearest Prayer */
.prayer-pill.active {
  background: rgba(217, 119, 6, 0.18);
  color: var(--ion-color-carrot);
  transform: scale(1.05);
  box-shadow: 0 0 0 1px rgba(217, 119, 6, 0.4),
  0 6px 18px rgba(217, 119, 6, 0.25);
}

.prayer-pill.active .label {
  color: var(--ion-color-carrot);
}

.qibla-row {
  display: flex;
  justify-content: center;
  padding: 6px 12px 4px;   /* horizontal padding = card padding feel */
}

.qibla-btn {
  font-size: 0.75rem;
  height: 28px;
  --padding-start: 12px;
  --padding-end: 12px;
}

.qibla-btn--block {
  width: 100%;
  height: 32px;
  font-size: 0.8rem;
}

.prayer-title-main {
  font-size: 1rem;
  font-weight: 600;
}

.prayer-title-location {
  font-size: 0.75rem;
  color: var(--ion-color-medium);
  margin-top: 2px;
}

</style>
