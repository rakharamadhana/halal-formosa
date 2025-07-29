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

const router = useRouter();

// ✅ Restore session on app mount (non-blocking)
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user && router.currentRoute.value.fullPath === '/login') {
    console.log('🔒 Session found on app start:', session.user.email);
    router.push('/profile');
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

