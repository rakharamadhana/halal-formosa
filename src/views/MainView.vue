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
  compassOutline,
  homeOutline, newspaperOutline, gridOutline
} from 'ionicons/icons';
import { supabase } from '@/plugins/supabaseClient';
import { setUserRole, loadUserRoleFromCache } from '@/composables/userProfile'

const isAuthenticated = ref(false);
const isRoleLoading = ref(true);
const profilePic = ref<string | null>(null);

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  isAuthenticated.value = !!session;

  if (!session) {
    setUserRole(null); // clear role globally
    isRoleLoading.value = false;
  }
}

async function fetchUserRole() {
  isRoleLoading.value = true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

      if (!error && data?.role) {
        setUserRole(data.role); // ✅ update global composable
      } else {
        setUserRole(null);
      }
    }
  } catch (err) {
    console.error('Error fetching user role:', err);
    setUserRole(null);
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
  loadUserRoleFromCache();  // 🟢 restore role from localStorage
  checkSession();
  fetchUserRole();
  fetchProfilePic();

  supabase.auth.onAuthStateChange((_event, session) => {
    isAuthenticated.value = !!session;
    if (session) {
      fetchUserRole();
      fetchProfilePic(session);
    } else {
      setUserRole(null);
      isRoleLoading.value = false;
      profilePic.value = null;
    }
  });
});
</script>
