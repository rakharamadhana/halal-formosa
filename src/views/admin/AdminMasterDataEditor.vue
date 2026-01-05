<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>
          {{ config?.label || 'Master Data' }}
        </ion-title>

        <ion-buttons slot="start">
          <ion-back-button default-href="/admin/master-data" />
        </ion-buttons>

        <ion-buttons slot="end">
          <ion-button
              v-if="editingId"
              color="medium"
              size="small"
              @click="resetForm"
          >
            Cancel Edit
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- =======================
           ADD / EDIT FORM
      ======================== -->
      <ion-card v-if="config">
        <ion-card-header>
          <ion-card-title>
            {{ editingId ? 'Edit' : 'Add New' }} {{ config.label }}
          </ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <ion-item
              v-for="field in config.fields"
              :key="field.key"
              lines="full"
          >
            <ion-label position="stacked">
              {{ field.label }}
              <span v-if="field.required" style="color: red">*</span>
            </ion-label>

            <!-- TEXT / URL / NUMBER -->
            <ion-input
                v-if="['text','url','number'].includes(field.type)"
                v-model="form[field.key]"
                :type="getIonInputType(field.type)"
                :placeholder="field.label"
            />

            <!-- COLOR (semantic select) -->
            <ion-select
                v-else-if="field.type === 'select' && field.options"
                v-model="form[field.key]"
                interface="popover"
            >
              <ion-select-option
                  v-for="opt in field.options"
                  :key="opt.value"
                  :value="opt.value"
              >
                {{ opt.label }}
              </ion-select-option>
            </ion-select>

            <!-- 🔎 PREVIEW CHIP (ONLY for ingredient_highlights.color) -->
            <ion-chip
                v-if="field.key === 'color' && form.color"
                :color="form.color"
                style="margin-top: 8px"
            >
              {{
                field.options?.find(o => o.value === form.color)?.label
              }}
            </ion-chip>

            <!-- SELECT (FOREIGN KEY) -->
            <ion-select
                v-else-if="field.type === 'select' && field.relation"
                v-model="form[field.key]"
                interface="popover"
            >
              <ion-select-option
                  v-for="opt in relations[field.key]"
                  :key="opt[getRelationValue(field)]"
                  :value="opt[getRelationValue(field)]"
              >
                {{ opt[getRelationLabel(field)] }}
              </ion-select-option>
            </ion-select>
          </ion-item>


          <ion-button
              expand="block"
              color="carrot"
              style="margin-top: 1rem"
              :disabled="saving"
              @click="save"
          >
            {{ editingId ? 'Update' : 'Add' }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- =======================
           LIST
      ======================== -->
      <ion-card v-if="rows.length">
        <ion-card-header>
          <ion-card-title>Existing {{ config.label }}</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <ion-list>
            <ion-item
                v-for="row in rows"
                :key="row[config.pk]"
                lines="full"
            >
              <ion-label>
                <!-- =========================
                     INGREDIENT HIGHLIGHTS
                ========================== -->
                <template v-if="table === 'ingredient_highlights'">
                  <div class="highlight-row">
                    <strong>{{ row.keyword }}</strong>
                  </div>

                  <div class="meta" v-if="row.keyword_zh">
                    {{ row.keyword_zh }}
                  </div>

                  <ion-chip
                      v-if="row.color"
                      :color="normalizeIonColor(row.color)"
                      size="small"
                  >
                    {{ getHighlightLabel(row.color) }}
                  </ion-chip>
                </template>

                <!-- =========================
                     GENERIC MASTER DATA
                ========================== -->
                <template v-else>
                  <strong>{{ displayPrimary(row) }}</strong>

                  <div class="meta" v-if="displaySecondary(row)">
                    {{ displaySecondary(row) }}
                  </div>
                </template>
              </ion-label>


              <ion-buttons slot="end">
                <ion-button
                    size="small"
                    fill="clear"
                    color="primary"
                    @click="editRow(row)"
                >
                  Edit
                </ion-button>

                <ion-button
                    size="small"
                    fill="clear"
                    color="danger"
                    @click="remove(row[config.pk])"
                >
                  Delete
                </ion-button>
              </ion-buttons>
            </ion-item>

          </ion-list>
        </ion-card-content>

        <!-- =======================
     PAGINATION
======================= -->
        <div
            v-if="totalCount > pageSize"
            style="display:flex;justify-content:center;gap:12px;margin:1rem 0;"
        >
          <ion-button
              size="small"
              fill="outline"
              :disabled="page === 1"
              @click="prevPage"
          >
            Previous
          </ion-button>

          <ion-text style="align-self:center">
            Page {{ page }} of {{ totalPages }}
          </ion-text>

          <ion-button
              size="small"
              fill="outline"
              :disabled="page >= totalPages"
              @click="nextPage"
          >
            Next
          </ion-button>
        </div>

      </ion-card>

      <ion-text v-if="!rows.length && !loading" color="medium">
        <p style="text-align:center;margin-top:2rem;">
          No data yet.
        </p>
      </ion-text>

      <ion-spinner v-if="loading" class="center-spinner" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/plugins/supabaseClient'
import { masterDataConfig } from '@/config/masterDataConfig'

// Ionic
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonList,
  IonText,
  IonSpinner,
    IonChip,
    IonBackButton
} from '@ionic/vue'

/* ======================
   ROUTE & CONFIG
====================== */
type MasterRow = Record<string, any>

interface MasterField {
  key: string
  label: string
  type: 'text' | 'url' | 'number' | 'color' | 'select'
  required?: boolean

  // 🔗 for FK
  relation?: {
    table: string
    value: string
    label: string
  }

  // ✅ for static select (ingredient highlights)
  options?: {
    value: string | number
    label: string
  }[]
}


interface MasterConfig {
  label: string
  pk: string
  fields: MasterField[]
}


const route = useRoute()
const table = route.params.table as string
const config = masterDataConfig[table] as MasterConfig


if (!config) {
  throw new Error('Invalid master data table')
}

/* ======================
   STATE
====================== */
const rows = ref<MasterRow[]>([])
const relations = ref<Record<string, MasterRow[]>>({})

const form = ref<Record<string, any>>({})
const editingId = ref<number | string | null>(null)
const loading = ref(false)
const saving = ref(false)
const page = ref(1)
const pageSize = 10
const totalCount = ref(0)


/* ======================
   FETCH DATA
====================== */
async function fetchRows(): Promise<void> {
  loading.value = true

  const from = (page.value - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .order(config.pk, { ascending: true })
      .range(from, to) as {
    data: MasterRow[] | null
    count: number | null
    error: any
  }


  if (!error) {
    rows.value = data || []
    totalCount.value = count || 0
  }

  loading.value = false
}


async function fetchRelations(): Promise<void> {
  for (const field of config.fields) {
    if (field.relation) {
      const { table, value, label } = field.relation
      const { data } = await supabase
          .from(table)
          .select(`${value}, ${label}`)
          .order(label) as {
        data: MasterRow[] | null
      }


      relations.value[field.key] = data || []
    }
  }
}

/* ======================
   CRUD
====================== */
async function save() {
  saving.value = true

  const payload = { ...form.value }

  if (table === 'ingredient_highlights' && payload.color) {
    payload.color = toCssColor(payload.color)
  }

  if (editingId.value) {
    await supabase.from(table).update(payload).eq(config.pk, editingId.value)
  } else {
    await supabase.from(table).insert(payload)
  }

  resetForm()
  page.value = 1
  await fetchRows()
  saving.value = false
}



function editRow(row: any) {
  editingId.value = row[config.pk]

  const cloned = { ...row }

  // ✅ Normalize color ONLY for ingredient highlights
  if (table === 'ingredient_highlights' && cloned.color) {
    cloned.color = normalizeIonColor(cloned.color)
  }

  form.value = cloned
}


function resetForm() {
  editingId.value = null
  form.value = {}
}

async function remove(id: number | string) {
  if (!confirm('Are you sure you want to delete this item?')) return

  await supabase.from(table).delete().eq(config.pk, id)

  if (rows.value.length === 1 && page.value > 1) {
    page.value--       // 👈 avoid empty page
  }

  await fetchRows()
}


const totalPages = computed(() =>
    Math.ceil(totalCount.value / pageSize)
)

function nextPage() {
  if (page.value < totalPages.value) {
    page.value++
    fetchRows()
  }
}

function prevPage() {
  if (page.value > 1) {
    page.value--
    fetchRows()
  }
}


/* ======================
   DISPLAY HELPERS
====================== */
function displayPrimary(row: any) {
  return row.name || row.keyword || row.id
}

function displaySecondary(row: any) {
  if (row.keyword_zh) return row.keyword_zh
  if (row.website) return row.website
  if (row.category_id && relations.value.category_id) {
    const cat = relations.value.category_id.find(
        c => c.id === row.category_id
    )
    return cat?.name || ''
  }
  return ''
}

function getHighlightLabel(color: string): string {
  switch (color) {
    case '--ion-color-primary':
      return 'Muslim-friendly'
    case '--ion-color-warning':
      return 'Syubhah'
    case '--ion-color-danger':
      return 'Haram'
    default:
      return color
  }
}

function normalizeIonColor(color: string): string {
  if (!color) return 'medium'
  return color.replace('--ion-color-', '')
}

function toCssColor(color: string): string {
  if (color.startsWith('--ion-color-')) return color
  return `--ion-color-${color}`
}

function getIonInputType(
    type: MasterField['type']
): 'text' | 'url' | 'number' {
  if (type === 'number') return 'number'
  if (type === 'url') return 'url'
  return 'text'
}

function getRelationValue(field: MasterField) {
  return field.relation?.value as string
}

function getRelationLabel(field: MasterField) {
  return field.relation?.label as string
}

/* ======================
   INIT
====================== */
onMounted(async () => {
  await fetchRelations()
  await fetchRows()
})
</script>

<style scoped>
.center-spinner {
  display: block;
  margin: 2rem auto;
}

.meta {
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}

.highlight-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

ion-chip {
  --padding-start: 8px;
  --padding-end: 8px;
}

</style>
