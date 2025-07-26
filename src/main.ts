import { createApp } from 'vue'
import App from './App.vue'
import router from './router';

import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/plugins/supabaseClient';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
import '@ionic/vue/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

// Above the createApp() line
import { defineCustomElements } from '@ionic/pwa-elements/loader';
defineCustomElements(window);

const app = createApp(App)
  .use(IonicVue)
  .use(router);

CapacitorApp.addListener('appUrlOpen', async (data) => {
  if (data && data.url && data.url.includes('myapp://callback')) {
    try {
      const url = new URL(data.url);
      const hash = url.hash.substring(1); // remove leading '#'
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        // Optionally, you can do router navigation or emit events here
        console.log('User session restored from deep link!');
      }
    } catch (err) {
      console.error('Failed to handle deep link:', err);
    }
  }
});


router.isReady().then(() => {
  app.mount('#app');
});
