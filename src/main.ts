import { createApp } from 'vue';
import { IonicVue } from '@ionic/vue';

import App from './App.vue';
import router from './router';

import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/plugins/supabaseClient';

/* Ionic CSS */
import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* Dark theme */
import '@ionic/vue/css/palettes/dark.class.css';

/* Custom variables */
import './theme/variables.css';

/* PWA Elements (for camera, file upload, etc.) */
import { defineCustomElements } from '@ionic/pwa-elements/loader';
defineCustomElements(window);

/* Create and configure app */
const app = createApp(App)
    .use(IonicVue)
    .use(router);

/* ✅ OAuth Redirect Handler for Native Apps */
CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
  console.log('🔗 appUrlOpen event fired:', url); // <--- Add this
  if (url?.startsWith('myapp://callback')) {
    console.log('📦 App URL Open triggered:', url);

    const hash = new URL(url).hash.substring(1);
    const params = new URLSearchParams(hash);

    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const next = new URL(url).searchParams.get('next') || '/profile';

    if (access_token && refresh_token) {
      console.log('🔑 Tokens extracted');
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error('❌ Failed to set session:', error.message);
        return;
      }

      // 🔁 Wait a bit and verify user
      setTimeout(async () => {
        const userResult = await supabase.auth.getUser();
        if (userResult.data?.user) {
          console.log('✅ User now logged in:', userResult.data.user.email);
          router.push(next);
        } else {
          console.warn('⚠️ Still no user after session set, retrying...');
        }
      }, 300); // delay a bit to allow hydration
    } else {
      console.warn('⚠️ No tokens found in callback URL.');
    }
  }
});


/* Start app */
router.isReady().then(() => {
  app.mount('#app');
});
