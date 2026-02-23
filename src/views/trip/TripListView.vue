<template>
  <ion-page>

    <!-- ================= HEADER ================= -->
    <ion-header>

      <!-- Top App Header -->
      <app-header
          :title="$t('trip.title')"
          :icon="compassOutline"
          :showProfile="true"
      />

      <!-- Search Bar -->
      <ion-toolbar class="toolbar-search">
        <ion-searchbar
            v-model="searchQuery"
            :placeholder="$t('trip.searchPlaceholder')"
            :debounce="500"
            class="rounded"
            @ionInput="handleSearchInput"
        />
      </ion-toolbar>

      <!-- Filters + Sort Toolbar -->
      <ion-toolbar class="search-toolbar">

        <div class="toolbar-row">

          <!-- Sort Button -->
          <ion-button fill="clear" size="small" class="sort-button">
            <ion-text class="toolbar-label ion-padding-horizontal">
              {{ sortLabel }}
            </ion-text>
            <ion-icon :icon="chevronDownOutline" />

            <!-- Hidden Select -->
            <ion-select
                v-model="sortBy"
                interface="popover"
                class="hidden-select"
                :interface-options="{ cssClass: 'sort-popover' }"
            >
              <ion-select-option value="recent">
                {{ $t('trip.sortRecent') }}
              </ion-select-option>
              <ion-select-option value="views">
                {{ $t('trip.sortViews') }}
              </ion-select-option>
            </ion-select>
          </ion-button>

          <!-- Filter Toggle Button -->
          <ion-button
              fill="clear"
              size="small"
              @click="showFilters = !showFilters"
          >
            <ion-text class="toolbar-label ion-padding-horizontal">
              <ion-icon
                  :icon="funnelOutline"
                  class="icon-inline"
              />
              {{ $t('common.filters') }}
            </ion-text>
            <ion-icon
                :icon="showFilters ? chevronUpOutline : chevronDownOutline"
            />
          </ion-button>

        </div>

        <!-- Collapsible Filters -->
        <transition name="collapse">
          <div v-show="showFilters" class="filter-section">

            <!-- Categories -->
            <div class="filter-title">
              <ion-icon :icon="mapOutline" />
              {{ $t('trip.categories') }}
            </div>

            <div class="category-bar">
              <ion-chip
                  v-for="cat in categories"
                  :key="cat.id"
                  class="category-chip"
                  :class="{ active: activeCategoryIds.includes(cat.id) }"
                  @click="toggleCategory(cat.id)"
              >
                <ion-label>
                  {{ cat.emoji }} {{ $t(cat.name) }}
                </ion-label>
              </ion-chip>
            </div>

            <!-- Cities -->
            <div class="filter-title">
              <ion-icon :icon="locationOutline" />
              {{ $t('trip.cities') }}
            </div>

            <div class="category-bar">
              <ion-chip
                  v-for="city in cities"
                  :key="city.slug"
                  class="category-chip"
                  :class="{ active: activeCityIds.includes(city.slug) }"
                  @click="toggleCity(city.slug)"
              >
                <ion-label>
                  {{ city.emoji }}
                  {{ $i18n.locale === 'zh-tw' ? city.name_zh : city.name }}
                </ion-label>
              </ion-chip>
            </div>

            <!-- Clear Filters -->
            <div
                v-if="activeCategoryIds.length || activeCityIds.length"
                class="filter-clear-row"
            >
              <ion-chip
                  class="clear-chip"
                  @click="clearFilters"
              >
                ✕ {{ $t('common.clearFilters') }}
              </ion-chip>
            </div>

          </div>
        </transition>

      </ion-toolbar>
    </ion-header>

    <!-- ================= CONTENT ================= -->
    <ion-content class="ion-padding">

      <!-- Loading Skeleton -->
      <template v-if="loading">
        <ion-card v-for="n in 4" :key="'skeleton-' + n">
          <ion-skeleton-text
              animated
              style="width:100%;height:140px;border-radius:12px;"
          />
          <ion-skeleton-text
              animated
              style="width:70%;height:16px;margin:10px;"
          />
        </ion-card>
      </template>

      <!-- No Trips -->
      <template v-else-if="filteredTrips.length === 0">
        <ion-card>
          <ion-card-content>
            🧭 {{ $t('trip.noTripsFound') }}
          </ion-card-content>
        </ion-card>
      </template>

      <!-- Trip List -->
      <template v-else>
        <ion-card
            v-for="trip in filteredTrips"
            :key="trip.id"
            class="trip-card"
            @click="openTrip(trip)"
        >

          <!-- Gold Partner Badge -->
          <ion-badge
              v-if="trip.provider?.partner_tier === 'gold'"
              color="warning"
              class="partner-badge"
          >
            {{ $t('partner.goldPartner') }}
          </ion-badge>

          <!-- Cover -->
          <img
              :src="trip.cover"
              :alt="trip.title"
              class="trip-cover"
          />

          <ion-card-content>

            <!-- Title -->
            <h3 class="trip-title">
              {{
                $i18n.locale === 'zh-tw'
                    ? (trip.title_zh || trip.title)
                    : trip.title
              }}
            </h3>

            <!-- Provider -->
            <p class="trip-provider">
              {{ $t('trip.providedBy') }}
              <strong>{{ trip.provider?.name }}</strong>
            </p>

            <!-- Tags -->
            <div class="chip-row">
              <ion-chip
                  v-for="tag in trip.categories"
                  :key="tag"
                  color="primary"
              >
                {{ tag }}
              </ion-chip>
            </div>

            <!-- Location + Duration -->
            <p class="trip-meta">
              📍
              {{
                (trip.trip_cities ?? [])
                    .filter(tc => tc.cities)
                    .map(tc =>
                        $i18n.locale === 'zh-tw'
                            ? tc.cities.name_zh
                            : tc.cities.name
                    )
                    .join(' + ')
              }}
              · 🕒 {{ trip.duration }}
            </p>

            <!-- Views -->
            <p class="trip-meta">
              👁️ {{ trip.view_count ?? 0 }} {{ $t('common.views') }}
            </p>

          </ion-card-content>
        </ion-card>
      </template>

    </ion-content>

  </ion-page>
</template>


<script setup lang="ts">
import {ref, computed, onMounted, watch} from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonPage, IonContent, IonSearchbar, IonToolbar,
  IonButton, IonIcon, IonText,
  IonCard, IonCardContent, IonChip, IonSkeletonText, IonLabel, IonHeader, IonBadge, IonSelect,IonSelectOption,

} from '@ionic/vue'

import {
  funnelOutline, chevronUpOutline, chevronDownOutline, mapOutline, compassOutline, locationOutline
} from 'ionicons/icons'
import AppHeader from '@/components/AppHeader.vue'
import { ActivityLogService } from '@/services/ActivityLogService'
import { supabase } from '@/plugins/supabaseClient'
import { Browser } from '@capacitor/browser'


const loading = ref(true)
const searchQuery = ref('')
const showFilters = ref(false)
const activeCategoryIds = ref<number[]>([])
const sortBy = ref<'recent' | 'views'>('recent')

const { t } = useI18n()

const sortLabel = computed(() => {
  if (sortBy.value === 'views') return t('trip.sortViews')
  return t('trip.sortRecent')
})

/* Categories using i18n keys */
const categories = ref([
  { id: 1, name: 'trip.catCity', emoji: '🏙️' },
  { id: 2, name: 'trip.catNature', emoji: '🌿' },
  { id: 3, name: 'trip.catFamily', emoji: '👨‍👩‍👧‍👦' },
])

/* Cities using i18n keys */
const cities = ref<any[]>([])

const activeCityIds = ref<string[]>([])

const loadingCities = ref(true)

async function fetchCities() {
  loadingCities.value = true

  const { data, error } = await supabase
      .from('cities')
      .select('id, slug, name, name_zh, emoji')
      .order('sort_order', { ascending: true })

  if (!error && data) {
    cities.value = data
  }

  loadingCities.value = false
}


/* Trips (placeholder → Supabase later) */
interface Trip {
  id: string
  title: string
  title_zh?: string
  cover: string
  duration: string
  categories: string[]
  external_url: string
  provider: any
  view_count?: number
  created_at?: string
  trip_cities?: {
    cities: {
      id: string
      slug: string
      name: string
      name_zh: string
      emoji: string
    }
  }[]

}


// Change your ref to use the interface
const trips = ref<Trip[]>([])

async function fetchTrips() {
  loading.value = true

  const { data, error } = await supabase
      .from('trips')
      .select(`
        id,
        title,
        title_zh,
        duration,
        cover_url,
        external_url,
        created_at,
        view_count,
        provider:partners (
          id,
          name,
          partner_tier
        ),
        trip_cities (
          city_id,
          cities:city_id (
            id,
            slug,
            name,
            name_zh,
            emoji
          )
        )
      `)
      .eq('is_active', true)

  if (error) {
    console.error('[Trips]', error)
    loading.value = false
    return
  }

  // Use a type assertion to help the compiler handle the Supabase join structure
  trips.value = (data as any[] ?? []).map(t => ({
    id: t.id,
    title: t.title,
    title_zh: t.title_zh,
    cover: t.cover_url,
    duration: t.duration,
    categories: [], // Initialized as empty
    external_url: t.external_url,
    provider: Array.isArray(t.provider) ? t.provider[0] : t.provider,
    created_at: t.created_at,
    view_count: t.view_count,
    trip_cities: t.trip_cities || []
  }))

  loading.value = false
}

const filteredTrips = computed(() => {
  const list = trips.value.filter(trip => {
    const matchesSearch =
        trip.title.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesCategory =
        activeCategoryIds.value.length === 0 ||
        trip.categories.some((cat: string) =>
            categories.value
                .filter(c => activeCategoryIds.value.includes(c.id))
                .map(c => c.name)
                .includes(cat)
        )

    const matchesCity =
        activeCityIds.value.length === 0 ||
        trip.trip_cities?.some(tc =>
            activeCityIds.value.includes(tc.cities.slug)
        )

    return matchesSearch && matchesCategory && matchesCity
  })

  // 🔥 Sort logic (basic UI-level for now)
  if (sortBy.value === 'views') {
    return [...list].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
  }

  return [...list].sort((a, b) => {
    return new Date(b.created_at ?? '').getTime()
        - new Date(a.created_at ?? '').getTime()
  })
})


function clearFilters() {
  ActivityLogService.log("trip_filter_clear", {
    categories: activeCategoryIds.value,
    cities: activeCityIds.value
  })

  activeCategoryIds.value = []
  activeCityIds.value = []
}



function toggleCategory(id: number) {
  const i = activeCategoryIds.value.indexOf(id)

  if (i === -1) {
    activeCategoryIds.value.push(id)
    ActivityLogService.log("trip_filter_category_add", { category_id: id })
  } else {
    activeCategoryIds.value.splice(i, 1)
    ActivityLogService.log("trip_filter_category_remove", { category_id: id })
  }
}


function toggleCity(id: string) {
  const i = activeCityIds.value.indexOf(id)

  if (i === -1) {
    activeCityIds.value.push(id)
    ActivityLogService.log("trip_filter_city_add", { city_slug: id })
  } else {
    activeCityIds.value.splice(i, 1)
    ActivityLogService.log("trip_filter_city_remove", { city_slug: id })
  }
}

let searchTimeout: number | null = null

function handleSearchInput(ev: Event) {
  const q = (ev.target as HTMLInputElement).value.trim()
  searchQuery.value = q

  if (searchTimeout) clearTimeout(searchTimeout)

  if (q.length > 1) {
    searchTimeout = window.setTimeout(() => {
      ActivityLogService.log("trip_search", { query: q })
    }, 800)
  }
}


async function openTrip(trip: any) {

  ActivityLogService.log("trip_click", {
    trip_id: trip.id,
    trip_title: trip.title,
    provider_id: trip.provider?.id,
    provider_name: trip.provider?.name,
    provider_tier: trip.provider?.partner_tier,
    current_sort: sortBy.value,
    active_categories: activeCategoryIds.value,
    active_cities: activeCityIds.value,
    search_query: searchQuery.value || null
  })

  await supabase.rpc('increment_trip_view', {
    p_trip_id: trip.id
  })

  await Browser.open({
    url: trip.external_url,
    windowName: '_self',
    toolbarColor: '#e67e22',
    presentationStyle: 'fullscreen',
  })
}

watch(sortBy, (val) => {
  ActivityLogService.log("trip_sort_change", {
    sort_by: val
  })
})

onMounted(() => {
  ActivityLogService.log("trip_page_open", {
    source: "main_navigation"
  })

  fetchTrips()
  fetchCities()
})



</script>

<style scoped>

/* ===============================
   TRIP CARD
================================= */

.trip-card {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.trip-card:active {
  transform: scale(0.98);
}

.trip-cover {
  width: 100%;
  height: 240px;
  object-fit: cover;
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
}

/* ===============================
   TYPOGRAPHY
================================= */

.trip-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.trip-provider {
  margin: 2px 0 8px;
  font-size: 12px;
  color: var(--ion-color-medium);
}

.trip-meta {
  margin: 4px 0;
  font-size: 13px;
  color: var(--ion-color-medium);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

/* ===============================
   CHIP ROW
================================= */

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.category-chip {
  font-size: 12px;
}

.category-chip.active {
  background: var(--ion-color-carrot);
  color: #fff;
  border-color: var(--ion-color-carrot);
}

/* ===============================
   PARTNER BADGE
================================= */

.partner-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 8px;
  backdrop-filter: blur(6px);
}

/* ===============================
   FILTER AREA
================================= */

.filter-clear-row {
  display: flex;
  justify-content: flex-start;
  padding: 6px 6px 10px;
}

.clear-chip {
  --background: rgba(255, 255, 255, 0.08);
  --color: var(--ion-color-medium);
  border: 1px dashed var(--ion-color-medium);
  border-radius: 999px;
  font-weight: 500;
  font-size: 13px;
  padding: 0 10px;
}

/* ===============================
   TOOLBAR IMPROVEMENTS
================================= */

.toolbar-search {
  padding: 8px 12px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.icon-inline {
  vertical-align: middle;
  margin-right: 6px;
}

/* ===============================
   SMALL POLISH
================================= */

ion-card-content {
  padding-top: 12px;
}

</style>

