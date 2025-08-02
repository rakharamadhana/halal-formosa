import { createApp } from 'vue';
import { IonicVue } from '@ionic/vue';

import App from './App.vue';
import router from './router';

import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
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

/* PWA Elements */
import { defineCustomElements } from '@ionic/pwa-elements/loader';
defineCustomElements(window);

/* ✅ Setup keyboard behavior */
// set resize mode to "body"
Keyboard.setResizeMode({ mode: 'body' as KeyboardResize });
Keyboard.setScroll({ isDisabled: false }); // optional to enable auto-scroll

Keyboard.addListener('keyboardWillShow', () => {
  document.body.classList.add('keyboard-visible');
});

Keyboard.addListener('keyboardWillHide', () => {
  document.body.classList.remove('keyboard-visible');
});

/* Create app */
const app = createApp(App).use(IonicVue).use(router);

/* OAuth Redirect Handler */
CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
  console.log('🔗 appUrlOpen event fired:', url);
  if (url?.startsWith('myapp://callback')) {
    const hash = new URL(url).hash.substring(1);
    const params = new URLSearchParams(hash);

    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const next = new URL(url).searchParams.get('next') || '/profile';

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (!error) router.push(next);
    }
  }
});

/* Start app */
router.isReady().then(() => {
  app.mount('#app');
});