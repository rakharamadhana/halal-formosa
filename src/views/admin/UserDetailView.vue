<template>
  <ion-page>
    <ion-header>
      <app-header
          title="User Detail"
          :icon="listOutline"
          :showBack="true"
      />
    </ion-header>

    <ion-content class="ion-padding">

      <!-- ================= USER HEADER ================= -->
      <ion-card v-if="user">
        <ion-item lines="none">
          <ion-avatar slot="start">
            <img v-if="user.avatar_url" :src="user.avatar_url" />
            <div v-else class="avatar-placeholder">👤</div>
          </ion-avatar>

          <ion-label>
            <h2>{{ user.display_name || 'Unknown User' }}</h2>
            <p>{{ user.email }}</p>
          </ion-label>
        </ion-item>
      </ion-card>

      <!-- ================= USER STATS ================= -->
      <ion-card v-if="summary">
        <ion-card-content class="stats-card">

          <div class="stats-row">
            <div class="stat-item">
              <strong>{{ summary.total_activities }}</strong>
              <span>Activities</span>
            </div>

            <div class="stat-item">
              <strong>{{ fromNow(summary.last_active) }}</strong>
              <span>Last Active</span>
            </div>
          </div>

          <div class="stats-row">
            <div class="stat-item">
              <strong>{{ summary.points }}</strong>
              <span>Points</span>
            </div>

            <div class="stat-item">
              <strong>{{ summary.donor_type }}</strong>
              <span>Account Type</span>
            </div>
          </div>

        </ion-card-content>
      </ion-card>

      <!-- ================= USER PROFILE DETAILS ================= -->
      <ion-card v-if="user">
        <ion-card-header>
          <ion-card-title>Profile Details</ion-card-title>
        </ion-card-header>

        <ion-list lines="none">

          <ion-item>
            <ion-label>Date of Birth</ion-label>
            <ion-note slot="end">
              {{ user.date_of_birth || '—' }}
            </ion-note>
          </ion-item>

          <ion-item>
            <ion-label>Nationality</ion-label>
            <ion-note slot="end" v-if="getNationality(user.nationality)">
              <img
                  :src="getNationality(user.nationality)?.flag"
                  alt="flag"
                  style="width:20px;height:14px;margin-right:6px;vertical-align:middle;"
              />
              {{ getNationality(user.nationality)?.name }}
            </ion-note>
            <ion-note slot="end" v-else>—</ion-note>
          </ion-item>


          <ion-item>
            <ion-label>Gender</ion-label>
            <ion-note slot="end">
              {{ user.gender || '—' }}
            </ion-note>
          </ion-item>

          <ion-item>
            <ion-label>Bio</ion-label>
            <ion-note slot="end" class="bio-text">
              {{ user.bio || 'No bio provided' }}
            </ion-note>
          </ion-item>

          <ion-item>
            <ion-label>Public Leaderboard</ion-label>
            <ion-note slot="end">
              {{ user.public_leaderboard ? 'Yes' : 'No' }}
            </ion-note>
          </ion-item>

          <ion-item>
            <ion-label>Profile Completed</ion-label>
            <ion-note slot="end">
              {{ user.profile_completed_notified ? 'Yes' : 'No' }}
            </ion-note>
          </ion-item>

        </ion-list>
      </ion-card>


      <!-- ================= ADMIN METADATA ================= -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Technical Details</ion-card-title>
        </ion-card-header>

        <ion-list lines="none">

          <ion-item>
            <ion-label>User ID</ion-label>
            <ion-note slot="end" class="mono">{{ userId }}</ion-note>
          </ion-item>

          <ion-item v-if="user?.created_at">
            <ion-label>Account Created</ion-label>
            <ion-note slot="end">
              {{ new Date(user.created_at).toLocaleDateString() }}
            </ion-note>
          </ion-item>

          <ion-item v-if="user?.created_at">
            <ion-label>Member Since</ion-label>
            <ion-note slot="end">
              {{ sinceUser(user.created_at) }}
            </ion-note>
          </ion-item>


          <ion-item v-if="user?.last_sign_in_at">
            <ion-label>Last Sign In (Auth)</ion-label>
            <ion-note slot="end">
              {{ fromNow(user.last_sign_in_at) }}
            </ion-note>
          </ion-item>

          <ion-item v-if="lastDevice?.last_scan_at">
            <ion-label>Last Scan Activity</ion-label>
            <ion-note slot="end">
              {{ fromNow(lastDevice.last_scan_at) }}
            </ion-note>
          </ion-item>

          <ion-item v-if="lastDevice?.platform">
            <ion-label>Platform</ion-label>
            <ion-note slot="end">
              {{ lastDevice.platform }}
            </ion-note>
          </ion-item>

          <ion-item v-if="lastDevice?.device_model">
            <ion-label>Device</ion-label>
            <ion-note slot="end">
              {{ lastDevice.device_model }}
            </ion-note>
          </ion-item>

          <ion-item v-if="lastDevice?.app_version">
            <ion-label>App Version</ion-label>
            <ion-note slot="end">
              {{ lastDevice.app_version }}
            </ion-note>
          </ion-item>

        </ion-list>
      </ion-card>

      <ion-card v-if="recentSearches.length">
        <ion-card-header>
          <ion-card-title>Recent Searches</ion-card-title>
        </ion-card-header>

        <ion-list lines="none">
          <ion-item v-for="(s, i) in recentSearches" :key="i">
            <ion-label>
              <strong>{{ s.search_text }}</strong>
              <p class="activity-time">{{ fromNow(s.searched_at) }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card>


      <ion-card v-if="recentProducts.length">
        <ion-card-header>
          <ion-card-title>Recent Products</ion-card-title>
        </ion-card-header>

        <ion-list lines="none">
          <ion-item v-for="(p, i) in recentProducts" :key="i">
            <ion-thumbnail slot="start" v-if="p.product_image">
              <img :src="p.product_image" />
            </ion-thumbnail>

            <ion-label>
              <strong>{{ p.product_name ?? `Barcode: ${p.product_id}` }}</strong>
              <p class="activity-time">{{ fromNow(p.viewed_at) }}</p>
            </ion-label>
          </ion-item>

        </ion-list>
      </ion-card>

      <ion-card v-if="recentPlaces.length">
        <ion-card-header>
          <ion-card-title>Recent Places</ion-card-title>
        </ion-card-header>

        <ion-list lines="none">
          <ion-item v-for="(p, i) in recentPlaces" :key="i">
            <ion-thumbnail slot="start" v-if="p.place_image">
              <img :src="p.place_image" />
            </ion-thumbnail>

            <ion-label>
              <strong>{{ p.place_name ?? `Place #${p.place_id}` }}</strong>
              <p class="activity-time">{{ fromNow(p.interacted_at) }}</p>
            </ion-label>
          </ion-item>

        </ion-list>
      </ion-card>


      <!-- ================= ACTIVITY TIMELINE ================= -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Activity Timeline</ion-card-title>
        </ion-card-header>

        <ion-list>
          <ion-item
              v-for="log in logs"
              :key="log.id"
              lines="full"
          >
            <ion-label>
              <h3 class="activity-title">
                {{ describeActivity(log) }}
              </h3>

              <p class="activity-meta">
                {{ log.activity_group || 'general' }}
                <span v-if="log.entity_type">
                  • {{ log.entity_type }} {{ log.entity_id }}
                </span>
              </p>

              <p class="activity-time">
                {{ fromNow(log.created_at) }}
              </p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card>

      <!-- ================= INFINITE SCROLL ================= -->
      <ion-infinite-scroll
          threshold="100px"
          @ionInfinite="loadMore"
          :disabled="noMoreData"
      >
        <ion-infinite-scroll-content
            loading-spinner="bubbles"
            loading-text="Loading activity..."
        />
      </ion-infinite-scroll>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/plugins/supabaseClient'
import { countries, loadCountries } from '@/composables/useCountries'

import {
  IonPage,
  IonHeader,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonAvatar,
  IonList,
  IonNote,
    IonThumbnail,
    IonCardContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent
} from '@ionic/vue'

import AppHeader from '@/components/AppHeader.vue'
import { listOutline } from 'ionicons/icons'

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const route = useRoute()
const userId = route.params.id as string

const user = ref<any | null>(null)
const summary = ref<any | null>(null)
const logs = ref<any[]>([])

const limit = 20
const noMoreData = ref(false)
const loadingMore = ref(false)
const recentSearches = ref<any[]>([])
const recentProducts = ref<any[]>([])
const recentPlaces = ref<any[]>([])

async function fetchRecents() {
  const [searchRes, productRes, placeRes] = await Promise.all([
    supabase.rpc('get_user_recent_searches', {
      p_user_id: userId,
      p_limit: 20
    }),
    supabase.rpc('get_user_recent_products', {
      p_user_id: userId,
      p_limit: 20
    }),
    supabase.rpc('get_user_recent_places', {
      p_user_id: userId,
      p_limit: 20
    }),
  ])


  if (!searchRes.error) recentSearches.value = searchRes.data ?? []
  if (!productRes.error) recentProducts.value = productRes.data ?? []
  if (!placeRes.error) recentPlaces.value = placeRes.data ?? []

}

/* Helpers */
const sinceUser = (date: string) => {
  return dayjs(date).fromNow(true) + ' ago'
}

const fromNow = (date?: string) =>
    date ? dayjs(date).fromNow() : 'Never'

const lastDevice = ref<any | null>(null)

async function fetchLastDevice() {
  const { data, error } = await supabase.rpc(
      'get_user_last_device',
      { p_user_id: userId }
  )

  if (error) {
    console.error('❌ Failed to load device info', error)
    return
  }

  lastDevice.value = data?.[0] ?? null
}

function getNationality(code?: string) {
  if (!code) return null
  const c = countries.value.find(c => c.cca2 === code)
  if (!c) return null
  return {
    name: c.name.common,
    flag: c.flags.png
  }
}

function parseDetail(detail: any) {
  if (!detail) return {}
  if (typeof detail === 'string') {
    try {
      return JSON.parse(detail)
    } catch {
      return {}
    }
  }
  return detail
}

function describeActivity(log: any) {
  const d = parseDetail(log.activity_detail)

  switch (log.activity_type) {

      /* ---------- HOME ---------- */
    case 'home_page_open':
      return 'Opened Home page'

    case 'home_scan_ingredient':
      return 'Opened ingredient scanner from Home'

    case 'home_viewmore_products':
      return 'Viewed more products on Home'

    case 'home_open_locations':
      return 'Opened locations from Home'

    case 'home_leaderboard_profile':
      return `Viewed leaderboard profile: ${d.display_name ?? 'Unknown user'}`


      /* ---------- EXPLORE ---------- */
    case 'explore_page_open':
      return 'Opened Explore page'

    case 'explore_center_user':
      return 'Centered map to current location'

    case 'explore_filter_category':
      return `Filtered category: ${d.category_name ?? 'Unknown category'}`

    case 'explore_marker_click':
      return `Clicked map marker: ${d.name ?? 'Unknown place'} (${d.type ?? 'Unknown'})`

    case 'explore_place_card_click':
      return `Opened place card: ${d.name ?? 'Unknown place'} (${d.type ?? 'Unknown'})`

    case 'explore_place_detail_open':
      return `Opened place details: ${d.name ?? 'Unknown place'}`

    case 'explore_place_detail_view':
      return `Viewed place details: ${d.name ?? 'Unknown place'}`

    case 'explore_detail_open_image':
      return `Viewed place image: ${d.name ?? 'Unknown place'}`


      /* ---------- SEARCH ---------- */
    case 'search_page_open':
      return 'Opened Search page'

    case 'search_product_click':
      return `Opened product: ${d.product_name ?? 'Unknown product'} (${d.status ?? 'Unknown'})`

    case 'search_sort_change':
      return `Sort product by ${d.sort ?? 'Unknown product'}`

    case 'search_filter_status':
      return `Filter product by ${d.status ?? 'Unknown product'}`

    case 'search_filter_category':
      return `Filter product by ${d.category_name ?? 'Unknown product'}`


      /* ---------- PRODUCT ---------- */
    case 'product_details_open':
      return `Viewed product: ${d.product_name ?? 'Unknown product'} (${d.status ?? 'Unknown'})`


      /* ---------- SCAN ---------- */
    case 'scan_ingredients_start':
      return `Started ingredient scan (${d.source ?? 'unknown source'})`

    case 'scan_ingredients_success':
      return `Scan result: ${d.product_name ?? 'Unknown product'} • ${d.auto_status} • ${d.ingredient_count ?? 0} ingredients`

    case 'scan_ingredients_error':
      return `Scan failed: ${d.error ?? 'Unknown error'}`


      /* ---------- PROFILE ---------- */
    case 'profile_page_open':
      return 'Opened Profile page'

    case 'social_link_click':
      return `Clicked social link (${d.platform ?? 'unknown'})`


      /* ---------- FALLBACK ---------- */
    default:
      return log.activity_type.replace(/_/g, ' ')
  }
}



/* Fetch user profile */
async function fetchUser() {
  const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

  user.value = data
}

/* Fetch summary (reuse admin list logic via RPC) */
async function fetchSummary() {
  const { data } = await supabase.rpc(
      'get_admin_user_summary',
      { p_user_id: userId }
  )


  summary.value = data?.find((u: any) => u.user_id === userId)
}

/* Fetch activity logs */
async function fetchLogs(reset = false) {
  if (reset) {
    logs.value = []
    noMoreData.value = false
  }

  const offset = logs.value.length

  const { data, error } = await supabase.rpc(
      'get_user_activity_logs',
      {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      }
  )


  if (error) {
    console.error('❌ Failed to load activity logs', error)
    return
  }

  if (!data || data.length < limit) {
    noMoreData.value = true
  }

  logs.value.push(...data)
}

async function loadMore(event: any) {
  if (loadingMore.value || noMoreData.value) {
    event.target.complete()
    return
  }

  loadingMore.value = true
  await fetchLogs()
  loadingMore.value = false
  event.target.complete()
}

onMounted(async () => {
  if (!countries.value.length) {
    await loadCountries()
  }

  await fetchUser()
  await fetchSummary()
  await fetchLastDevice()
  await fetchRecents()
  await fetchLogs(true)
})


</script>

<style scoped>
.avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--ion-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-card {
  padding: 8px 4px;
}

.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.stats-row:last-child {
  margin-bottom: 0;
}

.stat-item {
  flex: 1;
  background: var(--ion-background-color-step-50);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}

.stat-item strong {
  display: block;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--ion-text-color);
}

.stat-item span {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}


.activity-title {
  font-weight: 600;
}

.activity-meta {
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}

.activity-time {
  font-size: 0.75rem;
  color: var(--ion-color-medium);
}

.mono {
  font-family: monospace;
  font-size: 0.75rem;
}
</style>

