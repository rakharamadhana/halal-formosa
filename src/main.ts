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
import { fetchDonorStatus } from '@/composables/donorStatus'
import { scheduleBannerUpdate } from '@/plugins/admob'
import { initSafeArea } from "@/plugins/safeArea";

defineCustomElements(window)

// ✅ Init safe areas & system bars
initSafeArea()

/* Native-only setup */
if (Capacitor.isNativePlatform()) {
    Keyboard.setResizeMode({ mode: 'body' as KeyboardResize })
    Keyboard.setScroll({ isDisabled: false })
    Keyboard.addListener('keyboardWillShow', () => document.body.classList.add('keyboard-visible'))
    Keyboard.addListener('keyboardWillHide', () => document.body.classList.remove('keyboard-visible'))
    initAdMob().catch((e) => console.warn('AdMob init skipped/failed:', e))
}

const i18n = createI18n({
    legacy: false, // you must set `false`, to use Composition API,
    locale: localStorage.getItem('lang') || 'en',
    fallbackLocale: 'en',
    messages: { en, id, zh }
})

/* Create app */
const app = createApp(App).use(IonicVue).use(router).use(i18n)

// AdMob refresh after route changes
router.afterEach(() => scheduleBannerUpdate())
if (Capacitor.isNativePlatform()) {
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) scheduleBannerUpdate()
    })
}

// ✅ Auth events
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
        fetchDonorStatus(session.user.id).catch(console.error)

        if (['/login', '/signup'].includes(router.currentRoute.value.path)) {
            const rawRedirect = router.currentRoute.value.query.redirect
            router.push(typeof rawRedirect === 'string' && rawRedirect.trim() ? rawRedirect : '/profile')
        }
    }

    if (event === 'SIGNED_OUT') {
        fetchDonorStatus('').catch(console.error)
        router.push('/login')
    }
})

// Handle deep link
CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    if (!url?.startsWith('myapp://callback')) return
    const hash = new URL(url).hash.substring(1)
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token })
    }
})

/* Mount */
router.isReady().then(() => {
    app.mount('#app')
    scheduleBannerUpdate()
})
