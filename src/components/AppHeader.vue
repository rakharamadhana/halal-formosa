<template>
  <ion-toolbar>
    <!-- Back button -->
    <ion-buttons slot="start" v-if="showBack">
      <ion-back-button
          v-if="useRouterBack"
          :default-href="backRoute || '/home'"
      />
      <ion-button v-else @click="$emit('back')">
        <ion-icon :icon="arrowBackOutline" style="font-size: 24px;" />
      </ion-button>
    </ion-buttons>

    <!-- Title + Icon -->
    <ion-title class="title-large">
      <template v-if="icon === 'none'"></template>
      <template v-else-if="!icon">
        <img src="/favicon-32x32.png" alt="Halal Formosa" style="height: 28px; margin-right: 6px;" />
      </template>
      <template v-else>
        <ion-icon :icon="icon" style="margin-right: 6px; font-size: 22px;" />
      </template>
      {{ title }}
    </ion-title>

    <!-- ✅ NEW: custom action buttons slot -->
    <ion-buttons slot="end">
      <slot name="actions"></slot>
    </ion-buttons>

    <!-- Profile button (optional) -->
    <ion-buttons slot="end" v-if="showProfile">
      <ion-button @click="$router.push('/profile')">
        <template v-if="isAuthenticated && profilePic">
          <img :src="profilePic" alt="Profile" class="toolbar-profile-img" />
        </template>
        <template v-else>
          <ion-icon :icon="personCircle" />
        </template>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IonToolbar, IonButton, IonTitle, IonButtons, IonIcon, IonBackButton } from '@ionic/vue'
import {arrowBackOutline, chevronBackOutline, personCircle} from 'ionicons/icons'
import { supabase } from '@/plugins/supabaseClient'
withDefaults(defineProps<{
  title: string
  icon?: string
  showBack?: boolean
  backRoute?: string
  showProfile?: boolean
  useRouterBack?: boolean   // 👈
}>(), {
  useRouterBack: true       // 👈 default to true
})
const isAuthenticated = ref(false)
const profilePic = ref<string | null>(null)

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession()
  isAuthenticated.value = !!session
  profilePic.value = session?.user?.user_metadata?.avatar_url || null
}

onMounted(() => {
  checkSession()
  supabase.auth.onAuthStateChange((_event, session) => {
    isAuthenticated.value = !!session
    profilePic.value = session?.user?.user_metadata?.avatar_url || null
  })
})
</script>

<style>
.toolbar-profile-img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--ion-color-carrot);
}
</style>
