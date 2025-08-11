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

/* OAuth redirect handler (unchanged) */
CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    if (!url?.startsWith('myapp://callback')) return
    const hash = new URL(url).hash.substring(1)
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    const next = new URL(url).searchParams.get('next') || '/profile'
    if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (!error) router.push(next)
    }
})

/* Start app + apply once for initial route */
router.isReady().then(() => {
    app.mount('#app')
    scheduleBannerUpdate()
})
