<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="search" href="/search">
          <ion-icon :icon="searchOutline" />
          <ion-label>Search</ion-label>
        </ion-tab-button>

        <ion-tab-button v-if="isAuthenticated" tab="add" href="/add">
          <ion-icon :icon="cameraOutline" />
          <ion-label>Add Products</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="profile" href="/profile">
          <ion-icon :icon="personCircle" />
          <ion-label>Profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>

  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { personCircle, cameraOutline, searchOutline } from 'ionicons/icons';
import { supabase } from '@/plugins/supabaseClient';

const isAuthenticated = ref(false);

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  isAuthenticated.value = !!session;
}

// Check session when component mounts
onMounted(() => {
  checkSession();

  // Optional: Listen for auth state changes to update UI dynamically
  supabase.auth.onAuthStateChange((_event, session) => {
    isAuthenticated.value = !!session;
  });
});
</script>
