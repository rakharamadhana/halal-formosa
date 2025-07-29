<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/profile" />
        </ion-buttons>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list style="border-radius: 12px;">
        <ion-list-header>Appearance</ion-list-header>
        <ion-list :inset="true">
          <ion-item>
            <ion-toggle
                :checked="paletteToggle"
                @ionChange="(e) => {paletteToggle = e.detail.checked; toggleDarkPalette(e.detail.checked);}"
            >
              Dark Mode
            </ion-toggle>
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
  IonPage
} from '@ionic/vue';
import type { ToggleCustomEvent } from '@ionic/vue';
import { personCircle, personCircleOutline, sunnyOutline, sunny } from 'ionicons/icons';
import {defineComponent, onMounted, ref} from 'vue';

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
    IonPage
  },
  setup() {
    const paletteToggle = ref(false);

    // Use matchMedia to check the user preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');


    const initializeTheme = () => {
      if (savedTheme === 'dark') {
        paletteToggle.value = true;
        toggleDarkPalette(true);
      } else if (savedTheme === 'light') {
        paletteToggle.value = false;
        toggleDarkPalette(false);
      } else {
        // default to system preference
        paletteToggle.value = prefersDark.matches;
        toggleDarkPalette(prefersDark.matches);
      }
    };

    // Add or remove the "dark" class on the body
    const toggleDarkPalette = (enabled: boolean) => {
      document.documentElement.classList.toggle('ion-palette-dark', enabled);
      localStorage.setItem('preferred-theme', enabled ? 'dark' : 'light');
    };

    // Update the toggle and theme class
    const initializeDarkPalette = (isDark: boolean) => {
      paletteToggle.value = isDark;
      toggleDarkPalette(isDark);
    };

    // Toggle listener
    const toggleChange = (event: ToggleCustomEvent) => {
      const isDark = event.detail.checked;
      toggleDarkPalette(isDark);
      localStorage.setItem('preferred-theme', isDark ? 'dark' : 'light');
    };

    // === ✅ APPLY THE THEME BASED ON SAVED PREFERENCE OR SYSTEM DEFAULT ===
    const savedTheme = localStorage.getItem('preferred-theme');
    if (savedTheme === 'dark') {
      initializeDarkPalette(true);
    } else if (savedTheme === 'light') {
      initializeDarkPalette(false);
    } else {
      initializeDarkPalette(prefersDark.matches); // system preference
    }

    // Optional: listen for system theme changes
    prefersDark.addEventListener('change', (mediaQuery) =>
        initializeDarkPalette(mediaQuery.matches)
    );

    onMounted(() => {
      initializeTheme();
    });

    return {
      personCircle,
      personCircleOutline,
      sunnyOutline,
      sunny,
      initializeDarkPalette,
      toggleChange,
      toggleDarkPalette,
      paletteToggle,
      initializeTheme
    };
  },
});
</script>
