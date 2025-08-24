<template>
  <ion-toolbar>
    <!-- ✅ Back button (optional) -->
    <ion-buttons slot="start" v-if="showBack">
      <ion-back-button :default-href="backRoute || '/home'" />
    </ion-buttons>

    <ion-title class="title-large">
      <!-- Case 1: icon explicitly set to "none" → nothing -->
      <template v-if="icon === 'none'">
        <!-- nothing -->
      </template>

      <!-- Case 2: no icon provided → show default logo -->
      <template v-else-if="!icon">
        <img src="/favicon-32x32.png" alt="Halal Formosa" style="height: 28px; margin-right: 6px;" />
      </template>

      <!-- Case 3: icon provided → show that ion-icon -->
      <template v-else>
        <ion-icon :icon="icon" style="margin-right: 6px; font-size: 22px;" />
      </template>

      {{ title }}
    </ion-title>

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
import { personCircle } from 'ionicons/icons'
import { supabase } from '@/plugins/supabaseClient'
defineProps<{
  title: string
  icon?: string
  showBack?: boolean       // NEW: show a back button on the left
  backRoute?: string       // NEW: fallback route if there’s no history
  showProfile?: boolean    // optional: allow hiding the profile button if needed
}>();
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
