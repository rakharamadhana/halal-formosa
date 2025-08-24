<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <!-- Bottom tab bar -->
      <ion-tab-bar slot="bottom" id="footer-tabs">
        <ion-tab-button tab="home" href="/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>{{ $t('main.home') }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="search" href="/search">
          <ion-icon :icon="gridOutline" />
          <ion-label>{{ $t('main.product') }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="explore" href="/explore">
          <ion-icon :icon="compassOutline" />
          <ion-label>{{ $t('main.explore') }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="news" href="/news">
          <ion-icon :icon="newspaperOutline" />
          <ion-label>{{ $t('main.news') }}</ion-label>
        </ion-tab-button>

        <ion-tab-button
            v-if="!isRoleLoading && userRole === 'admin'"
            tab="add"
            href="/add"
        >
          <ion-icon :icon="cameraOutline" />
          <ion-label>{{ $t('main.add') }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonRouterOutlet, IonPage
} from '@ionic/vue';
import {
  cameraOutline,
  compassOutline,
  homeOutline, newspaperOutline, gridOutline
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
  profilePic.value = null;
  if (!session) {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  }
  if (session?.user) {
    profilePic.value = session.user.user_metadata?.avatar_url || null;
  }
}

onMounted(() => {
  checkSession();
  fetchUserRole();
  fetchProfilePic();

  supabase.auth.onAuthStateChange((_event, session) => {
    isAuthenticated.value = !!session;
    if (session) {
      fetchUserRole();
      fetchProfilePic(session);
    } else {
      userRole.value = null;
      isRoleLoading.value = false;
      profilePic.value = null;
    }
  });
});
</script>