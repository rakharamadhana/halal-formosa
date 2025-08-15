import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import App from './App.vue'
import router from './router'

import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { supabase } from '@/plugins/supabaseClient'
import {hideBanner, initAdMob, moveBanner } from '@/lib/admob'

import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
import '@ionic/vue/css/palettes/dark.class.css'
import './theme/variables.css'

import { defineCustomElements } from '@ionic/pwa-elements/loader'
import {setDonorStatus, setDonorType} from "@/composables/userProfile";
defineCustomElements(window)

/* Native-only setup */
if (Capacitor.isNativePlatform()) {
    Keyboard.setResizeMode({ mode: 'body' as KeyboardResize })
    Keyboard.setScroll({ isDisabled: false })
    Keyboard.addListener('keyboardWillShow', () => document.body.classList.add('keyboard-visible'))
    Keyboard.addListener('keyboardWillHide', () => document.body.classList.remove('keyboard-visible'))
    initAdMob().catch((e) => console.warn('AdMob init skipped/failed:', e))
} else {
    console.log('ℹ️ Web — skipping native-only plugins.')
}

/* Create app */
const app = createApp(App).use(IonicVue).use(router)

function scheduleBannerUpdate() {
    if (!Capacitor.isNativePlatform()) return

    clearTimeout((window as any).__adT)
    ;(window as any).__adT = setTimeout(async () => {
        const r = router.currentRoute.value
        const noAds   = !!r.meta?.noAds
        const spaceId = r.meta?.adSpaceId as string | undefined
        const adId    = (r.meta?.adId as string | undefined) || import.meta.env.VITE_ADMOB_BANNER_ID

        if (noAds || !spaceId) {
            await hideBanner().catch(() => {})
            return
        }
        await moveBanner(adId, spaceId, import.meta.env.VITE_ADMOB_TESTING)
    }, 70) // small delay to let Ion transition mount the view
}

// expose for pages that flip loaders -> can ping when ready
(window as any).scheduleBannerUpdate = scheduleBannerUpdate

router.afterEach(() => scheduleBannerUpdate())

if (Capacitor.isNativePlatform()) {
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) scheduleBannerUpdate()
    })
}

// Keep fetchDonorStatus exactly as you have it
async function fetchDonorStatus(userId: string) {

    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('is_donor, donor_type')
            .eq('id', userId)
            .maybeSingle(); // ✅ use maybeSingle() instead of single()

        if (error) {
            console.error('❌ Error fetching donor status:', error.message);
            return;
        }

        if (data) {
            setDonorStatus(data.is_donor);
            setDonorType(data.donor_type);
        } else {
            console.warn('⚠️ No donor data found for userId:', userId);
        }
    } catch (err) {
        console.error('💥 fetchDonorStatus failed:', err);
    }
}

/* onAuthStateChange — single source of truth for redirect */
supabase.auth.onAuthStateChange((event, session) => {

    if (event === 'SIGNED_IN' && session?.user) {

        // Fetch donor status
        fetchDonorStatus(session.user.id).catch(err => {
            console.error('💥 Error fetching donor status:', err);
        });

        // Only redirect if currently on login or signup page
        if (['/login', '/signup'].includes(router.currentRoute.value.path)) {
            const rawRedirect = router.currentRoute.value.query.redirect;
            const redirectTo =
                typeof rawRedirect === 'string' && rawRedirect.trim() !== ''
                    ? rawRedirect
                    : '/profile';

            router.push(redirectTo);
        }
    }

    if (event === 'SIGNED_OUT') {
        setDonorStatus(false);
        setDonorType('');
        router.push('/login');
    }
});

/* appUrlOpen — only set session, no redirect */
CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    if (!url?.startsWith('myapp://callback')) return;

    const hash = new URL(url).hash.substring(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) console.error('❌ Error setting session:', error.message);
        // 🚫 No redirect here — onAuthStateChange will handle it
    }
});


/* Start app + apply once for initial route */
router.isReady().then(() => {
    app.mount('#app')
    scheduleBannerUpdate()
})
