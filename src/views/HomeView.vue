<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom" id="footer-tabs">
        <ion-tab-button tab="search" href="/search">
          <ion-icon :icon="searchOutline" />
          <ion-label>Search</ion-label>
        </ion-tab-button>

        <ion-tab-button
            v-if="!isRoleLoading && userRole === 'admin'"
            tab="add"
            href="/add"
        >
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
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonRouterOutlet, IonPage } from '@ionic/vue';
import { personCircle, cameraOutline, searchOutline } from 'ionicons/icons';
import { supabase } from '@/plugins/supabaseClient';

const isAuthenticated = ref(false);

const userRole = ref<string | null>(null);
const isRoleLoading = ref(true);

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  isAuthenticated.value = !!session;

  if (!session) {
    userRole.value = null;
    isRoleLoading.value = false;
  }
}

async function fetchUserRole() {
  isRoleLoading.value = true;
  try {
    const user = supabase.auth.getUser();
    const userId = (await user).data.user?.id;
    if (userId) {
      const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

      if (error) {
        console.error('Failed to fetch user role:', error);
        userRole.value = null;
      } else {
        userRole.value = data?.role || null;
      }
    }
  } catch (err) {
    console.error('Error fetching user role:', err);
    userRole.value = null;
  } finally {
    isRoleLoading.value = false;
  }
}

// Check session when component mounts
onMounted(() => {
  checkSession();
  fetchUserRole();

  // Optional: Listen for auth state changes to update UI dynamically
  supabase.auth.onAuthStateChange((_event, session) => {
    isAuthenticated.value = !!session;

    if (session) {
      fetchUserRole(); // re-fetch on login
    } else {
      // Reset role info on logout
      userRole.value = null;
      isRoleLoading.value = false;
    }
  });
});
</script>
