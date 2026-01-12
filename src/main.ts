import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import App from './App.vue'
import router from './router'

import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { supabase } from '@/plugins/supabaseClient'
import { initAdMob } from '@/lib/admob'
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import id from './locales/id.json'
import zh from './locales/zh.json'

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
import { scheduleBannerUpdate } from '@/plugins/admob'
import { initSafeArea } from "@/plugins/safeArea";
import { initRevenueCat } from '@/plugins/RevenueCat';
import { Purchases } from '@revenuecat/purchases-capacitor';

// ✅ unified user profile composable
import {
    loadDonorFromCache,
    loadUserRoleFromCache,
    loadPublicLeaderboardFromCache,
    loadUserProfile,
    currentUser, resetUserProfileState
} from "@/composables/userProfile"

import { loadCountriesFromCache } from "@/composables/useCountries"
import OneSignal from 'onesignal-cordova-plugin';
import { refreshSubscriptionStatus} from "@/composables/useSubscriptionStatus";

defineCustomElements(window)

// ✅ Init safe areas & system bars
if (Capacitor.isNativePlatform()) {
    try {
        initSafeArea()
    } catch (e) {
        console.warn('[SafeArea] init skipped:', e)
    }
}

/* Native-only setup */
if (Capacitor.isNativePlatform()) {
    try {
        Keyboard.setResizeMode({ mode: 'body' as KeyboardResize })
    } catch (e) {
        console.warn('[Keyboard] setResizeMode not available:', e)
    }

    try {
        Keyboard.setScroll({ isDisabled: false })
    } catch (e) {
        console.warn('[Keyboard] setScroll not available:', e)
    }

    Keyboard.addListener('keyboardWillShow', () => document.body.classList.add('keyboard-visible'))
    Keyboard.addListener('keyboardWillHide', () => document.body.classList.remove('keyboard-visible'))

    initAdMob().catch((e) => console.warn('AdMob init skipped/failed:', e))
}

const i18n = createI18n({
    legacy: false,
    locale: localStorage.getItem('lang') || 'en',
    fallbackLocale: 'en',
    messages: { en, id, zh }
})

/* Create app */
const app = createApp(App).use(IonicVue).use(router).use(i18n)

// AdMob refresh after route changes
router.afterEach(() => scheduleBannerUpdate())

// 1. Load from cache first → no flicker
loadCountriesFromCache()


/* Native: refresh on resume */
if (Capacitor.isNativePlatform()) {
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
            scheduleBannerUpdate();
            supabase.auth.getSession().then(async ({ data }) => {
                const session = data.session;
                if (session?.user) {
                    currentUser.value = session.user;
                    await loadUserProfile(session.user.id);
                }
            });
        }
    });
}


// ✅ Restore session once on boot
supabase.auth.getSession().then(async ({ data }) => {
    const session = data.session;

    if (session?.user) {
        currentUser.value = session.user;

        loadDonorFromCache(session.user.id);
        loadUserRoleFromCache(session.user.id);
        loadPublicLeaderboardFromCache(session.user.id);

        await loadUserProfile(session.user.id);

        if (Capacitor.isNativePlatform()) await refreshSubscriptionStatus({ syncToServer: true });

    } else {
        currentUser.value = null;
    }
});



// ✅ Auth events (lightweight & Android-safe)
let hasHandledSignIn = false

supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 [AUTH] Event:', event)
    console.log('👤 [AUTH] Session user:', session?.user?.id)

    /* ------------------------
       SIGNED OUT
    ------------------------ */
    if (event === 'SIGNED_OUT') {
        console.log('🚪 [AUTH] Handling SIGNED_OUT')

        hasHandledSignIn = false

        // 🔒 Fire-and-forget native cleanup
        if (Capacitor.isNativePlatform()) {
            Purchases.logOut().catch(e =>
                console.warn('⚠️ [RC] logOut failed:', e)
            )
        }

        resetUserProfileState()
        currentUser.value = null

        console.log('➡️ [ROUTER] Redirecting to /login')
        router.replace('/login')
        return
    }

    /* ------------------------
       IGNORE INITIAL SESSION
    ------------------------ */
    if (event === 'INITIAL_SESSION') {
        console.log('ℹ️ [AUTH] INITIAL_SESSION ignored')
        return
    }

    /* ------------------------
       SIGNED IN (HANDLE ONCE)
    ------------------------ */
    if (event !== 'SIGNED_IN' || !session?.user) {
        console.log('ℹ️ [AUTH] Event ignored:', event)
        return
    }

    if (hasHandledSignIn) {
        console.log('⏭️ [AUTH] SIGNED_IN already handled')
        return
    }

    hasHandledSignIn = true

    const user = session.user
    currentUser.value = user

    console.log('✅ [AUTH] SIGNED_IN basic state set for:', user.id)

    /* ------------------------------------------------
       🔁 DEFER EVERYTHING ELSE (CRITICAL FIX)
       This avoids Android native-plugin race crashes
    ------------------------------------------------ */
    queueMicrotask(() => {
        console.log('⏳ [DEFERRED] Post-auth tasks starting')

        /* ------------------------
           LOAD CACHED DATA (SAFE)
        ------------------------ */
        try {
            loadDonorFromCache(user.id)
            loadUserRoleFromCache(user.id)
            loadPublicLeaderboardFromCache(user.id)
            console.log('✅ [CACHE] Loaded')
        } catch (e) {
            console.warn('⚠️ [CACHE] Failed:', e)
        }

        /* ------------------------
           NATIVE SIDE EFFECTS (NON-BLOCKING)
        ------------------------ */
        if (Capacitor.isNativePlatform()) {
            Purchases.logIn({ appUserID: user.id })
                .then(() => console.log('✅ [RC] logIn success'))
                .catch(e => console.warn('⚠️ [RC] logIn failed:', e))

            refreshSubscriptionStatus({ syncToServer: true })
                .then(() => console.log('✅ [RC] refreshSubscriptionStatus success'))
                .catch(e => console.warn('⚠️ [RC] refreshSubscriptionStatus failed:', e))
        }

        /* ------------------------
           ROUTING DECISION
           (profile loading happens in views)
        ------------------------ */
        const rawRedirect = router.currentRoute.value.query.redirect
        router.replace(
            typeof rawRedirect === 'string' && rawRedirect.trim()
                ? rawRedirect
                : '/profile'
        )

        console.log('🏁 [DEFERRED] Post-auth tasks completed')
    })
})

let lastHandledUrl: string | null = null;

/* 🧩 OneSignal v5 Initialization (Capacitor Native + Vue) */
document.addEventListener('deviceready', async () => {
    try {
        // Enable verbose logs (disable in production)
        OneSignal.Debug.setLogLevel(6);

        // Initialize your OneSignal App ID
        await OneSignal.initialize(import.meta.env.VITE_ONESIGNAL_APP_ID);

        // Wait for OneSignal to finish setting up the push service
        const deviceState = await OneSignal.User.pushSubscription.getIdAsync();
        console.log('📱 OneSignal Player ID:', deviceState);

        // Prompt for permission if needed
        const hasPermission = await OneSignal.Notifications.hasPermission();
        if (!hasPermission) {
            const accepted = await OneSignal.Notifications.requestPermission(false);
            console.log('🔔 User accepted notifications:', accepted);
        }

        // 🧭 Handle incoming push when tapped/opened

        // 🧭 Handle incoming push when tapped/opened
        OneSignal.Notifications.addEventListener('click', (event: any) => {
            console.log('📬 Notification opened (full event):', JSON.stringify(event, null, 2));

            const link =
                event?.notification?.additionalData?.link ||
                event?.notification?.url ||
                event?.notification?.launchURL;

            console.log('🔍 Extracted link:', link);

            if (link) {
                // 🛑 Prevent duplicate routing if already handled by appUrlOpen
                if (lastHandledUrl === link) {
                    console.log('⏭️ Skipping duplicate navigation for', link);
                    return;
                }
                lastHandledUrl = link;

                try {
                    const path = new URL(link).pathname;
                    console.log('🔗 Navigating to:', path);
                    import('@/router').then(({ default: router }) => router.push(path));
                } catch (err) {
                    console.warn('⚠️ Invalid deep link:', link, err);
                }
            } else {
                console.warn('⚠️ No link field found in notification payload');
            }
        });

        // 🏷️ Tag the logged-in user for targeting
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await OneSignal.User.addTag('user_id', user.id);
            console.log('🏷️ Tagged user_id:', user.id);
        }

        console.log('✅ OneSignal v5 initialized');
    } catch (err) {
        console.warn('⚠️ OneSignal init failed:', err);
    }
});

// 🔗 Handle OS-level deep link (when app cold-starts)
CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    if (!url) return;
    console.log('🌐 appUrlOpen:', url);

    lastHandledUrl = url; // ✅ Mark this as already handled

    if (url.startsWith('myapp://item/') || url.startsWith('myapp://place/') || url.startsWith('myapp://news/')) {
        const path = url.replace('myapp://', '/');
        console.log('➡️ Navigating to:', path);
        import('@/router').then(({ default: router }) => router.push(path));
        return;
    }

    if (url.startsWith('myapp://callback')) {
        const hash = new URL(url).hash.substring(1);
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
            supabase.auth.setSession({ access_token, refresh_token });
            console.log('🔐 OAuth session restored.');
        }
    }
});


async function bootstrap() {
    const { data: { session } } = await supabase.auth.getSession();

    if (Capacitor.isNativePlatform()) {
        await initRevenueCat(session?.user?.id);
        await refreshSubscriptionStatus({ syncToServer: true });
    }

    router.isReady().then(() => {
        app.mount('#app');
        scheduleBannerUpdate();
    });
}

bootstrap();