<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/profile" />
        </ion-buttons>
        <ion-title>{{ $t('settings.title')}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- 🌙 Appearance -->
      <ion-list style="border-radius: 12px;">
        <ion-list-header>{{ $t('settings.appearance')}}</ion-list-header>
        <ion-list :inset="true">
          <ion-item>
            <ion-toggle
                :checked="paletteToggle"
                @ionChange="(e) => {paletteToggle = e.detail.checked; toggleDarkPalette(e.detail.checked);}"
            >
              {{ $t('settings.darkMode') }}
            </ion-toggle>
          </ion-item>
        </ion-list>
      </ion-list>

      <!-- 🔒 Privacy: only if logged in -->
      <ion-list
          v-if="currentUser"
          style="border-radius: 12px; margin-top: 20px;"
      >
        <ion-list-header>{{ $t('settings.privacy')}}</ion-list-header>
        <ion-list :inset="true">
          <ion-item v-if="isPublicLeaderboard !== null">
            <ion-toggle
                :checked="!!isPublicLeaderboard"
                @ionChange="(e) => setPublicLeaderboard(e.detail.checked)"
            >
              {{ $t('settings.leaderboardPrivacy') }}
            </ion-toggle>
          </ion-item>
        </ion-list>
      </ion-list>

      <!-- 🌐 Language -->
      <ion-list style="border-radius: 12px; margin-top: 20px;">
        <ion-list-header>{{ $t('settings.language')}}</ion-list-header>
        <ion-list :inset="true">
          <ion-item>
            <ion-select
                interface="action-sheet"
                placeholder="Select Language"
                v-model="lang"
                @ionChange="changeLanguage"
            >
              <ion-select-option value="en">🇺🇸 English</ion-select-option>
              <ion-select-option value="id">🇮🇩 Bahasa Indonesia</ion-select-option>
              <ion-select-option value="ms">🇲🇾 Bahasa Melayu</ion-select-option>
              <ion-select-option value="zh">🇹🇼 繁體中文</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonList,
  IonListHeader,
  IonToggle,
  IonToolbar,
  IonTitle,
  IonPage,
  IonSelect,
  IonSelectOption
} from '@ionic/vue'
import { personCircle, personCircleOutline, sunnyOutline, sunny } from 'ionicons/icons'
import { defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'

// 👉 import global state directly
import {
  currentUser,
  isPublicLeaderboard,
  setPublicLeaderboard,
} from '@/composables/userProfile'

export default defineComponent({
  components: {
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonList,
    IonListHeader,
    IonToggle,
    IonToolbar,
    IonTitle,
    IonPage,
    IonSelect,
    IonSelectOption
  },
  setup() {
    const { locale } = useI18n()
    const lang = ref(locale.value)

    const changeLanguage = () => {
      locale.value = lang.value
      localStorage.setItem('lang', lang.value)
    }

    const paletteToggle = ref(false)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')

    const toggleDarkPalette = (enabled: boolean) => {
      document.documentElement.classList.toggle('ion-palette-dark', enabled)
      localStorage.setItem('preferred-theme', enabled ? 'dark' : 'light')
    }

    const initializeDarkPalette = (isDark: boolean) => {
      paletteToggle.value = isDark
      toggleDarkPalette(isDark)
    }

    const savedTheme = localStorage.getItem('preferred-theme')
    if (savedTheme === 'dark') {
      initializeDarkPalette(true)
    } else if (savedTheme === 'light') {
      initializeDarkPalette(false)
    } else {
      initializeDarkPalette(prefersDark.matches)
    }

    prefersDark.addEventListener('change', (mediaQuery) =>
        initializeDarkPalette(mediaQuery.matches)
    )

    return {
      personCircle,
      personCircleOutline,
      sunnyOutline,
      sunny,
      paletteToggle,
      toggleDarkPalette,
      changeLanguage,
      lang,
      currentUser,
      isPublicLeaderboard,
      setPublicLeaderboard
    }
  }
})
</script>
