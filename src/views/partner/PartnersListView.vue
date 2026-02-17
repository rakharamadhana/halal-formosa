<template>
  <ion-page>
    <ion-header>
      <app-header
          :title="$t('partner.title')"
          :showBack="true"
          backRoute="/home"
          icon="none"
      />

      <!-- Search bar -->
      <ion-toolbar style="padding: 8px;">
        <ion-searchbar
            v-model="searchQuery"
            :placeholder="$t('partner.searchPlaceholder')"
            :debounce="500"
            class="rounded"
            @ionInput="handleSearchInput"
        />
      </ion-toolbar>

      <!-- Filter toggle -->
      <ion-toolbar class="search-toolbar">
        <ion-button fill="clear" size="small" @click="showFilters = !showFilters">
          <ion-icon :icon="funnelOutline" />
          <ion-text class="toolbar-label">
            &nbsp; {{ $t('common.filters') }}
          </ion-text>
          <ion-icon :icon="showFilters ? chevronUpOutline : chevronDownOutline" />
        </ion-button>

        <transition name="collapse">
          <div v-show="showFilters" class="filter-section">
            <!-- Categories -->
            <div class="filter-title">
              <ion-icon :icon="pricetagsOutline" />
              {{ $t('partner.categories') }}
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
                  {{ cat.name }}
                </ion-label>
              </ion-chip>

            </div>
          </div>
        </transition>
      </ion-toolbar>
    </ion-header>



    <ion-content class="ion-padding">

      <ion-button
          v-if="activeCategoryIds.length"
          size="small"
          fill="clear"
          color="medium"
          @click="clearFilters"
      >
        Clear filters
      </ion-button>



      <!-- List -->
      <div class="discover-grid">

        <!-- Skeleton -->
        <template v-if="loading">
          <ion-card
              v-for="n in 4"
              :key="'skeleton-' + n"
              class="discover-item"
          >
            <ion-skeleton-text
                animated
                style="width:100%;height:140px;border-radius:12px;"
            />
            <ion-skeleton-text
                animated
                style="width:80%;height:16px;margin:8px auto;"
            />
          </ion-card>
        </template>

        <!-- Data -->
        <template v-else>
          <ion-card
              v-for="body in filteredBodies"
              :key="body.id"
              :class="['discover-item', body.tier]"
              @click="openPartner(body)"
          >



          <ion-badge
                v-if="body.tier"
                :class="['tier-badge', body.tier]"
            >
              {{ body.tier.toUpperCase() }} PARTNER
            </ion-badge>



            <img
                :src="body.logo || `https://placehold.co/300x300?text=${encodeURIComponent(body.name)}`"
                :alt="body.name"
                class="discover-img"
            />

            <ion-label class="discover-label">
              <div class="chip-row">
                <ion-chip
                    v-for="s in body.scopes.slice(0, 2)"
                    :key="s"
                    color="primary"
                >
                  {{ s }}
                </ion-chip>

                <ion-chip
                    v-if="body.scopes.length > 2"
                    color="medium"
                    class="more-chip"
                >
                  +{{ body.scopes.length - 2 }}
                </ion-chip>
              </div>

              <p class="discover-name">
                {{ body.name }}
              </p>
            </ion-label>
          </ion-card>
        </template>

      </div>


      <p
          v-if="!loading && filteredBodies.length === 0"
          class="text-center text-sm text-gray-500 mt-8"
      >
        No partner found
      </p>


    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  IonPage,
  IonContent,
  IonSearchbar,
  IonChip,
  IonCard,
  IonLabel,
  IonSkeletonText,
  IonIcon,
    IonHeader,
    IonButton,
    IonToolbar,
    IonText,
    IonBadge
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import {chevronDownOutline, chevronUpOutline, funnelOutline, pricetagsOutline} from "ionicons/icons";
import {ActivityLogService} from "@/services/ActivityLogService";

/* ---------------- State ---------------- */
const router = useRouter()
const loading = ref(true)
const activeCategoryIds = ref<string[]>([])

import { supabase } from '@/plugins/supabaseClient'
const searchQuery = ref('')
const showFilters = ref(false)

const TIER_PRIORITY: Record<string, number> = {
  gold: 3,
  silver: 2,
  bronze: 1
}

/* ---------------- Scopes ---------------- */
type PartnerCategory = {
  id: string
  name: string
  slug: string
  icon?: string | null
  color?: string | null
}


const categories = ref<PartnerCategory[]>([])


async function fetchCategories() {
  const { data, error } = await supabase
      .from('partner_scopes')
      .select('id, name, slug, icon, color')
      .eq('is_active', true)
      .order('name')

  if (error) {
    console.error('[Scopes]', error)
    return
  }

  categories.value = data ?? []
}

async function fetchPartners() {
  const { data, error } = await supabase
      .from('partners')
      .select(`
      id,
      name,
      logo_url,
      partner_tier,
      partners_scopes (
        scope_id,
        partner_scopes (
          id,
          name
        )
      )
    `)
      .eq('is_active', true)

  if (error) {
    console.error('[Partners]', error)
    return
  }

  bodies.value = (data ?? []).map((b: any) => ({
    id: b.id as string,
    name: b.name as string,
    logo: b.logo_url as string | null,
    tier: b.partner_tier as 'gold' | 'silver' | 'bronze' | null,
    scopeIds: (b.partners_scopes ?? []).map(
        (s: any) => s.scope_id as string
    ),
    scopes: (b.partners_scopes ?? []).map(
        (s: any) => s.partner_scopes.name as string
    )
  }))
}

/* ---------------- Placeholder Data ---------------- */
const bodies = ref<any[]>([])


/* ---------------- Computed ---------------- */
const filteredBodies = computed(() => {
  return bodies.value
      .filter(body => {
        const matchesSearch =
            body.name.toLowerCase().includes(searchQuery.value.toLowerCase())

        if (!activeCategoryIds.value.length) {
          return matchesSearch
        }

        const matchesCategory = body.scopeIds.some((id: string) =>
            activeCategoryIds.value.includes(id)
        )

        return matchesSearch && matchesCategory
      })
      .sort((a, b) => {
        const tierA = TIER_PRIORITY[a.tier ?? ''] ?? 0
        const tierB = TIER_PRIORITY[b.tier ?? ''] ?? 0

        // 🔥 Tier first
        if (tierA !== tierB) {
          return tierB - tierA
        }

        // 🔤 Then name
        return a.name.localeCompare(b.name)
      })
})




/* ---------------- Methods ---------------- */
function handleSearchInput(ev: Event) {
  const q = (ev.target as HTMLInputElement).value.trim()
  searchQuery.value = q

  if (q.length > 1) {
    ActivityLogService.log('partner_search', { query: q })
  }
}


function toggleCategory(id: string) {
  const idx = activeCategoryIds.value.indexOf(id)

  if (idx === -1) {
    activeCategoryIds.value.push(id)
    ActivityLogService.log('partner_filter_add', { category_id: id })
  } else {
    activeCategoryIds.value.splice(idx, 1)
    ActivityLogService.log('partner_filter_remove', { category_id: id })
  }
}





function openPartner(partner: any) {
  ActivityLogService.log('partner_click', {
    source: 'partners_page',
    partner_id: partner.id,
    partner_name: partner.name,
    partner_tier: partner.tier,
    active_categories: activeCategoryIds.value,
    search_query: searchQuery.value || null
  })

  router.push(`/partner/${partner.id}`)
}

function clearFilters() {
  ActivityLogService.log('partner_filter_clear', {
    cleared_categories: activeCategoryIds.value
  })

  activeCategoryIds.value = []
}

/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  ActivityLogService.log('partners_page_open')

  loading.value = true
  await Promise.all([
    fetchCategories(),
    fetchPartners()
  ])
  loading.value = false
})


</script>

<style scoped>
/* =========================
   Page helpers
   ========================= */

.page-description {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  margin-bottom: 8px;
}

/* =========================
   Grid & Card
   ========================= */

.discover-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* mobile-safe */
  gap: 14px;
}

@media (min-width: 768px) {
  .discover-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

/* =========================
   Logo
   ========================= */

.discover-img {
  width: 100%;
  height: 160px;
  object-fit: contain;
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  flex-shrink: 0;
}

/* =========================
   Name
   ========================= */

.discover-name {
  margin-top: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.3;
  text-align: center;
}

/* =========================
   Scopes / Chips
   ========================= */

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  margin-bottom: 6px;
  opacity: 0.9;
}

.more-chip {
  font-size: 12px;
  opacity: 0.7;
}




/* =========================
   Filters & categories
   ========================= */

.category-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.category-bar::-webkit-scrollbar {
  display: none;
}

.category-chip {
  --background: transparent;
  --color: var(--ion-color-medium);
  --border-color: var(--ion-color-medium);

  border: 1.5px solid var(--border-color);
  border-radius: 999px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.category-chip.active {
  --background: var(--ion-color-carrot);
  --color: #ffffff;
  --border-color: var(--ion-color-carrot);
}

.category-chip:hover {
  filter: brightness(1.1);
}

/* =========================
   Search
   ========================= */

ion-searchbar.rounded {
  --border-radius: 8px;
  --box-shadow: 0 1px 3px rgba(0,0,0,.1);
}

</style>
