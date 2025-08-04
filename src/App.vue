<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
  <ion-alert
      :is-open="showUpdateAlert"
      header="Update Available"
      message="A new version is available. Update now?"
      :buttons="alertButtons"
      @didDismiss="showUpdateAlert = false"
  />
  <Analytics mode="production" />
  <SpeedInsights/>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, IonAlert } from '@ionic/vue';
import { supabase } from "@/plugins/supabaseClient";
import { useRouter } from 'vue-router';
import { onMounted, ref } from 'vue';
import { Analytics } from "@vercel/analytics/vue";
import { SpeedInsights } from '@vercel/speed-insights/vue';
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';
import { AppReview } from '@capawesome/capacitor-app-review';

const router = useRouter();
const askedKey = 'askedLocationPermission';
const showUpdateAlert = ref(false);

const alertButtons = [
  {
    text: 'Later',
    role: 'cancel',
  },
  {
    text: 'Update Now',
    handler: async () => {
      const info = await AppUpdate.getAppUpdateInfo();
      if (info.flexibleUpdateAllowed) {
        await AppUpdate.startFlexibleUpdate();
        await AppUpdate.completeFlexibleUpdate();
      } else if (info.immediateUpdateAllowed) {
        await AppUpdate.performImmediateUpdate();
      }
    },
  },
];

// 1️⃣ Restore session and redirect if needed
const restoreSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user && router.currentRoute.value.fullPath === '/login') {
    console.log('🔒 Session found on app start:', session.user.email);
    router.push('/profile');
  }
};

// 2️⃣ Request geolocation permission once
const askGeolocationPermission = async () => {
  if (!Capacitor.isNativePlatform()) return;

  const alreadyAsked = localStorage.getItem(askedKey);
  if (alreadyAsked) return;

  try {
    const permStatus = await Geolocation.checkPermissions();
    if (permStatus.location !== 'granted') {
      const result = await Geolocation.requestPermissions();
      console.log('🔑 Geolocation permission result:', result);
    }
    localStorage.setItem(askedKey, 'true');
  } catch (err) {
    console.error('❌ Error requesting location permission:', err);
  }
};


const APP_OPEN_KEY = 'app_open_count';

const checkAppUpdate = async () => {
  // ✅ Only run on native Android
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

  try {
    const info = await AppUpdate.getAppUpdateInfo();
    console.log('App update info:', info);
    if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
      showUpdateAlert.value = true;
    }
  } catch (err) {
    console.error('❌ Error checking app update:', err);
  }
};


const checkAndAskForReview = async () => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

  // Increment app open count
  let count = parseInt(localStorage.getItem(APP_OPEN_KEY) || '0', 10);
  count++;
  localStorage.setItem(APP_OPEN_KEY, count.toString());

  console.log('📱 App opened times:', count);

  // Ask for review after 5 opens
  if (count === 5 || count === 15 || count === 30) {
    try {
      await AppReview.requestReview();
      console.log('⭐ In-app review requested');
    } catch (err) {
      console.error('❌ Error requesting in-app review:', err);

      // Optional fallback: open the app store page if review dialog fails
      await AppReview.openAppStore();
    }
  }
};

// ✅ Restore session on app mount (non-blocking)
onMounted(async () => {
  await restoreSession();
  await askGeolocationPermission();
  await checkAppUpdate();
  await checkAndAskForReview();
});

// ✅ Logout handler
supabase.auth.onAuthStateChange(async (event) => {
  if (event === 'SIGNED_OUT') {
    console.log('🔓 User signed out');
    router.push('/login');
  }
});
</script>

