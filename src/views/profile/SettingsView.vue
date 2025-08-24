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
      <ion-list style="border-radius: 12px;">
        <ion-list-header>{{ $t('settings.appearance')}}</ion-list-header>
        <ion-list :inset="true">
          <ion-item>
            <ion-toggle
                :checked="paletteToggle"
                @ionChange="(e) => {paletteToggle = e.detail.checked; toggleDarkPalette(e.detail.checked);}"
            >
              {{ $t('settings.darkMode')}}
            </ion-toggle>
          </ion-item>
        </ion-list>
      </ion-list>

      <!-- 🌐 Language section -->
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
} from '@ionic/vue';
import type { ToggleCustomEvent } from '@ionic/vue';
import { personCircle, personCircleOutline, sunnyOutline, sunny } from 'ionicons/icons';
import { defineComponent, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

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
    const { locale } = useI18n();
    const lang = ref(locale.value);

    const changeLanguage = () => {
      locale.value = lang.value;
      localStorage.setItem('lang', lang.value);
    };

    const paletteToggle = ref(false);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    const toggleDarkPalette = (enabled: boolean) => {
      document.documentElement.classList.toggle('ion-palette-dark', enabled);
      localStorage.setItem('preferred-theme', enabled ? 'dark' : 'light');
    };

    const initializeDarkPalette = (isDark: boolean) => {
      paletteToggle.value = isDark;
      toggleDarkPalette(isDark);
    };

    const toggleChange = (event: ToggleCustomEvent) => {
      const isDark = event.detail.checked;
      toggleDarkPalette(isDark);
      localStorage.setItem('preferred-theme', isDark ? 'dark' : 'light');
    };

    const savedTheme = localStorage.getItem('preferred-theme');
    if (savedTheme === 'dark') {
      initializeDarkPalette(true);
    } else if (savedTheme === 'light') {
      initializeDarkPalette(false);
    } else {
      initializeDarkPalette(prefersDark.matches);
    }

    prefersDark.addEventListener('change', (mediaQuery) =>
        initializeDarkPalette(mediaQuery.matches)
    );

    onMounted(() => {
      if (savedTheme === 'dark') paletteToggle.value = true;
      else if (savedTheme === 'light') paletteToggle.value = false;
      else paletteToggle.value = prefersDark.matches;
    });

    return {
      personCircle,
      personCircleOutline,
      sunnyOutline,
      sunny,
      toggleChange,
      toggleDarkPalette,
      paletteToggle,
      changeLanguage,
      lang
    };
  },
});
</script>

