<template>
  <ion-header>
    <ion-toolbar>
      <ion-title class="title-large">
        <!-- ✅ Use logo if no icon prop is passed -->
        <template v-if="!icon">
          <img
              src="/favicon-32x32.png"
              alt="Halal Formosa"
              style="height: 28px; vertical-align: middle; margin-right: 6px;"
          />
        </template>
        <!-- ✅ Use IonIcon if prop is provided -->
        <template v-else>
          <ion-icon :icon="icon" style="vertical-align: middle; margin-right: 6px; font-size: 22px;" />
        </template>

        {{ title }}
      </ion-title>

      <!-- ✅ Profile always visible -->
      <ion-buttons slot="end">
        <ion-button @click="$router.push('/profile')">
          <template v-if="isAuthenticated && profilePic">
            <img
                :key="profilePic"
                :src="profilePic"
                alt="Profile"
                class="toolbar-profile-img"
            />
          </template>
          <template v-else>
            <ion-icon :icon="personCircle" />
          </template>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonToolbar, IonHeader, IonButton, IonTitle, IonButtons, IonIcon } from '@ionic/vue';
import { personCircle } from 'ionicons/icons';
import { supabase } from '@/plugins/supabaseClient';

// ✅ Props: title (required), icon (optional)
defineProps<{
  title: string
  icon?: string // optional Ionicon
}>()

const isAuthenticated = ref(false);
const profilePic = ref<string | null>(null);

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  isAuthenticated.value = !!session;
  profilePic.value = session?.user?.user_metadata?.avatar_url || null;
}

onMounted(() => {
  checkSession();
  supabase.auth.onAuthStateChange((_event, session) => {
    isAuthenticated.value = !!session;
    profilePic.value = session?.user?.user_metadata?.avatar_url || null;
  });
});
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
