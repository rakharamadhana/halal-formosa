import { StatusBar, Style } from '@capacitor/status-bar'
import { NavigationBar } from '@capgo/capacitor-navigation-bar'
import { Capacitor } from '@capacitor/core'

export async function initSystemBars() {
    if (!Capacitor.isNativePlatform()) return

    // Status bar (white icons on dark bg)
    try {
        await StatusBar.setStyle({ style: Style.Light }) // white text/icons
        await StatusBar.setBackgroundColor({ color: '#000000' })
    } catch (e) {
        console.warn('StatusBar not available', e)
    }

    // Navigation bar (white icons on dark bg)
    try {
        await NavigationBar.setNavigationBarColor({
            color: '#000000',
            darkButtons: false, // false = white icons
        })
    } catch (e) {
        console.warn('NavigationBar not available', e)
    }
}