<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
  <Analytics mode="production" />
  <SpeedInsights/>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { supabase } from "@/plugins/supabaseClient";
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';
import { Analytics } from "@vercel/analytics/vue";
import { SpeedInsights } from '@vercel/speed-insights/vue';
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

const router = useRouter();
const askedKey = 'askedLocationPermission';

// ✅ Restore session on app mount (non-blocking)
onMounted(async () => {

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user && router.currentRoute.value.fullPath === '/login') {
    console.log('🔒 Session found on app start:', session.user.email);
    router.push('/profile');
  }

  if (Capacitor.isNativePlatform()) {
    const alreadyAsked = localStorage.getItem(askedKey);
    if (!alreadyAsked) {
      try {
        const permStatus = await Geolocation.checkPermissions()
        if (permStatus.location !== 'granted') {
          const result = await Geolocation.requestPermissions()
          console.log('🔑 Geolocation permission result:', result)
        }
        localStorage.setItem(askedKey, 'true');
      } catch (err) {
        console.error('❌ Error requesting location permission:', err)
      }
    }
  }
});

// ✅ Logout handler
supabase.auth.onAuthStateChange(async (event) => {
  if (event === 'SIGNED_OUT') {
    console.log('🔓 User signed out');
    router.push('/login');
  }
});
</script>

