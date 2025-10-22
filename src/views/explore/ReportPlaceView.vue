<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import { supabase } from '@/plugins/supabaseClient'
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel,
  IonTextarea, IonButton, IonCard, IonCardHeader, IonCardContent, IonCardTitle, IonToast
} from '@ionic/vue'

// --- Routing + State
const route = useRoute()
const router = useRouter()

const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref<'success' | 'danger'>('success')

const locationId = Number(route.params.id)
const place = ref<any>(null)
const reportDescription = ref('')
const currentUser = ref<any>(null)
const loading = ref(false)

// --- Fetch location by ID
async function fetchPlace() {
  const { data, error } = await supabase
      .from('locations')
      .select(`id, name, image, lat, lng, location_types(name)`)
      .eq('id', locationId)
      .single()

  if (error) {
    toastMessage.value = '❌ Location not found.'
    toastColor.value = 'danger'
    showToast.value = true
    setTimeout(() => router.back(), 1500)
  } else {
    place.value = data
  }
}

// --- Submit report to Supabase
async function submitReport() {
  if (!place.value || !reportDescription.value.trim()) return
  loading.value = true

  const { error } = await supabase.from('location_reports').insert([
    {
      location_id: place.value.id,
      description: reportDescription.value.trim(),
      created_at: new Date().toISOString(),
      reported_by: currentUser.value?.id ?? null,
    },
  ])

  loading.value = false
  if (error) {
    toastMessage.value = 'Failed to submit report.'
    toastColor.value = 'danger'
  } else {
    toastMessage.value = '✅ Report submitted successfully!'
    toastColor.value = 'success'
    setTimeout(() => router.back(), 1000)
  }
  showToast.value = true
}

// --- Load user + place
onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user
  if (locationId) fetchPlace()
})
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Report Location</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-card v-if="place">
        <ion-card-header>
          <ion-card-title>{{ place.name }}</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <ion-item>
            <ion-label position="stacked">Type</ion-label>
            <ion-input :value="place.location_types?.name || 'Halal Location'" readonly />
          </ion-item>

          <ion-item>
            <ion-textarea
                label="Reason"
                label-placement="floating"
                v-model="reportDescription"
                auto-grow
                placeholder="Explain what’s wrong with this location"
            />
          </ion-item>

          <ion-button
              expand="block"
              color="danger"
              @click="submitReport"
              :disabled="!reportDescription.trim() || loading"
          >
            Submit Report
          </ion-button>

          <ion-button expand="block" fill="clear" @click="router.back()">
            Cancel
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-toast
          :is-open="showToast"
          :message="toastMessage"
          :color="toastColor"
          duration="2000"
          @didDismiss="showToast = false"
          style="transform: translateY(-55px);"
      />
    </ion-content>
  </ion-page>
</template>
