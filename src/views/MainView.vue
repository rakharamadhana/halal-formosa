<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title class="title-brand">
          <img
              src="/favicon-32x32.png"
              alt="Halal Formosa"
              style="height: 28px; vertical-align: middle; margin-right: 6px;"
          />
          Halal Formosa
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

    <ion-tabs>
      <ion-router-outlet />

      <!-- ✅ Bottom tab bar without profile -->
      <ion-tab-bar slot="bottom" id="footer-tabs">
        <ion-tab-button tab="home" href="/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="search" href="/search">
          <ion-icon :icon="searchOutline" />
          <ion-label>Search</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="explore" href="/explore">
          <ion-icon :icon="compassOutline" />
          <ion-label>Explore</ion-label>
        </ion-tab-button>

        <ion-tab-button
            v-if="!isRoleLoading && userRole === 'admin'"
            tab="add"
            href="/add"
        >
          <ion-icon :icon="cameraOutline" />
          <ion-label>Add Products</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>



<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonRouterOutlet, IonPage } from '@ionic/vue';
import {
  personCircle,
  cameraOutline,
  searchOutline,
  compassOutline,
  homeOutline
} from 'ionicons/icons';
import { supabase } from '@/plugins/supabaseClient';

const isAuthenticated = ref(false);

const userRole = ref<string | null>(null);
const isRoleLoading = ref(true);
const profilePic = ref<string | null>(null);


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

async function fetchProfilePic(session?: any) {
  profilePic.value = null; // ✅ Clear first

  if (!session) {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  }

  if (session?.user) {
    profilePic.value = session.user.user_metadata?.avatar_url || null;
  }
}

// Check session when component mounts
onMounted(() => {
  checkSession();
  fetchUserRole();
  fetchProfilePic();

  // Optional: Listen for auth state changes to update UI dynamically
  supabase.auth.onAuthStateChange((_event, session) => {
    isAuthenticated.value = !!session;

    if (session) {
      fetchUserRole();
      fetchProfilePic(session); // ✅ Pass session for instant update
    } else {
      userRole.value = null;
      isRoleLoading.value = false;
      profilePic.value = null;
    }
  });
});
</script>

<style>
ion-tab-button img.tab-profile-img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-top: 6px;
  margin-bottom: 2px;
  transition: border 0.2s ease; /* smooth transition */
}

/* ✅ Apply carrot border only if tab is selected */
ion-tab-button.tab-selected img.tab-profile-img {
  border: 1px solid var(--ion-color-carrot);
}

.toolbar-profile-img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--ion-color-carrot);
}
</style>
