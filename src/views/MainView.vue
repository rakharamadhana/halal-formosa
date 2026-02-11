<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <!-- Bottom tab bar -->
      <ion-tab-bar slot="bottom" id="footer-tabs">
        <ion-tab-button tab="home" href="/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>{{ $t('main.home') }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="search" href="/search">
          <ion-icon :icon="gridOutline" />
          <ion-label>{{ $t('main.product') }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="explore" href="/explore">
          <ion-icon :icon="mapOutline" />
          <ion-label>{{ $t('main.explore') }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="trip" href="/trip">
          <ion-icon :icon="compassOutline" />
          <ion-label>{{ $t('main.trip') }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonRouterOutlet, IonPage
} from '@ionic/vue'
import {
  compassOutline,
  homeOutline,
  newspaperOutline,
  gridOutline, airplaneOutline, sendOutline, globeOutline, mapSharp, mapOutline
} from 'ionicons/icons'
import { supabase } from '@/plugins/supabaseClient'

const isAuthenticated = ref(false)
const profilePic = ref<string | null>(null)

let authSub: any = null

async function syncSession(session?: any) {
  if (!session) {
    const res = await supabase.auth.getSession()
    session = res.data.session
  }

  isAuthenticated.value = !!session
  profilePic.value = session?.user?.user_metadata?.avatar_url ?? null
}

onMounted(async () => {
  await syncSession()

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    syncSession(session)
  })

  authSub = data.subscription
})

onBeforeUnmount(() => {
  authSub?.unsubscribe()
})
</script>

