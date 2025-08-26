<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title class="title-large">
          <ion-icon :icon="personCircleOutline" style="vertical-align: middle;" />
          {{ $t('profile.title') }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ $t('profile.title') }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <!-- Profile Card -->
      <ion-card class="profile-card ion-text-center">
        <div v-if="userAvatar" class="avatar-wrapper">
          <img :src="userAvatar" alt="Profile Picture" class="avatar" />
        </div>

        <ion-text v-if="userDisplayName" class="profile-name">
          <h2>{{ userDisplayName }}</h2>
          <ion-badge :color="donorBadge.color" style="margin-left: 6px;">
            {{ donorBadge.emoji }} {{ donorBadge.label }}
          </ion-badge>
        </ion-text>

        <ion-text v-if="userEmail" class="profile-email">
          <p>{{ userEmail }}</p>
        </ion-text>

        <ion-button
            v-if="userEmail"
            color="danger"
            expand="block"
            class="logout-button"
            @click="handleLogout"
        >
          {{ $t('profile.logout') }}
        </ion-button>

        <div v-else class="login-prompt">
          <p>{{ $t('profile.noUserLogged') }}</p>
          <ion-button color="carrot" expand="block" @click="goToLogin">
            {{ $t('profile.login') }}
          </ion-button>
        </div>
      </ion-card>

      <!-- Review Submissions -->
      <ion-list
          v-if="isAdmin"
          class="profile-menu"
          style="border-radius: 10px"
      >
        <ion-item button @click="goToReviewSubmissions" style="--inner-border-width: 0">
          <ion-icon :icon="listOutline" />&nbsp;
          <ion-label>{{ $t('profile.review') }}</ion-label>
        </ion-item>

        <!-- ✅ Pending badge -->
        <ion-badge
            v-if="pendingCount > 0"
            color="danger"
            style="position: absolute; top: 13px; left: 8px; border-radius: 50%; font-size: 10px; min-width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; z-index: 99;"
        >
          {{ pendingCount }}
        </ion-badge>
      </ion-list>

      <!-- Menu -->
      <ion-list class="profile-menu" style="border-radius: 10px; margin-top: 20px">
        <ion-item button @click="goToSettings">
          <ion-icon :icon="settingsOutline" />&nbsp;
          <ion-label>{{ $t('profile.settings') }}</ion-label>
        </ion-item>

        <ion-item button @click="goToLegal" >
          <ion-icon :icon="documentTextOutline" />&nbsp;
          <ion-label>{{ $t('profile.legal') }}</ion-label>
        </ion-item>

        <ion-item button @click="goToCredits" style="--inner-border-width: 0">
          <ion-icon :icon="peopleOutline" />&nbsp;
          <ion-label>{{ $t('profile.credits') }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Support -->
      <ion-card class="app-info-card ion-text-center">
        <ion-card-header>
          <ion-card-title>{{ $t('profile.support') }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>{{ $t('profile.supportDescription') }}</p>

          <a href="https://halalformosa.bobaboba.me" target="_blank" class="boba-button">
            <img
                src="https://s3.ap-southeast-1.amazonaws.com/media.anyonelab.com/images/boba/boba-embed-icon.png"
                alt="boba-icon"
                style="height: 100%; margin-right: 8px;"
            />
            {{ $t('profile.bobaMe') }}
          </a>

          <p class="support-thank">{{ $t('profile.supportThank') }}</p>
          <p><small>{{ $t('profile.voluntary') }}</small></p>
        </ion-card-content>
      </ion-card>

      <!-- App Info -->
      <ion-card class="app-info-card ion-text-center">
        <ion-card-header>
          <ion-card-title>{{ $t('profile.appInfo') }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-label>{{ $t('profile.appNameTitle') }}</ion-label>
              <ion-note slot="end">{{ $t('profile.appName') }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>{{ $t('profile.appVersion') }}</ion-label>
              <ion-note slot="end">1.2.1</ion-note>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/plugins/supabaseClient'
import { onIonViewWillEnter } from '@ionic/vue'

// ✅ Ionic components
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonText,
  IonNote,
  IonBadge,
} from '@ionic/vue'

// ✅ Icons
import {
  settingsOutline,
  documentTextOutline,
  personCircleOutline,
  peopleOutline, listOutline,
} from 'ionicons/icons'

// ✅ Composables
import { donorBadge, isAdmin } from '@/composables/userProfile'

// State
const userEmail = ref('')
const userDisplayName = ref('')
const userAvatar = ref('')
const router = useRouter()
const pendingCount = ref(0)

async function fetchPendingCount() {
  if (!isAdmin.value) {
    pendingCount.value = 0
    return
  }

  const { count, error } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("approved", false)

  if (!error && count !== null) {
    pendingCount.value = count
  }
}

// Fetch user info
const updateUser = async () => {
  try {
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      userEmail.value = data.user.email || ''
      userDisplayName.value =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.display_name ||
          ''
      userAvatar.value = data.user.user_metadata?.avatar_url || ''
    } else {
      userEmail.value = ''
      userDisplayName.value = ''
      userAvatar.value = ''
    }
  } catch (error) {
    userEmail.value = ''
    userDisplayName.value = ''
    userAvatar.value = ''
    console.error('Failed to fetch user:', error)
  }
}

onIonViewWillEnter(async () => {
  await updateUser()

  // ✅ Only admins need the pending count
  if (isAdmin.value) {
    await fetchPendingCount()
  }
})


// Actions
const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    alert('Logout failed: ' + error.message)
  } else {
    userEmail.value = ''
    router.push('/login')
  }
}
const goToReviewSubmissions = () => {
  router.push('/admin/review-products')
}
const goToLogin = () => router.push('/login')
const goToSettings = () => router.push('/settings')
const goToLegal = () => router.push('/legal')
const goToCredits = () => router.push('/credits')
</script>

<style scoped>
.profile-card {
  margin: 2rem auto;
  padding: 2rem 1.5rem;
  border-radius: 10px;
}
.app-info-card {
  margin: 2rem auto;
  border-radius: 10px;
}
.avatar-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}
.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--ion-color-tertiary);
}
.profile-name h2 {
  margin: 0 0 0.25rem;
  font-weight: 700;
  color: var(--ion-color-tertiary);
}
.profile-email p {
  margin: 0 0 1.5rem;
  font-size: 1rem;
  color: var(--ion-color-medium);
}
.logout-button,
.login-prompt ion-button {
  margin-top: 1rem;
}
.login-prompt p {
  margin-bottom: 1rem;
  font-size: 1rem;
  color: var(--ion-color-medium);
}
.boba-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 44px;
  margin: 1rem auto;
  padding: 8px 16px;
  background-color: #ad5138;
  color: #f8e0be;
  border-radius: 12px;
  text-decoration: none;
  font-weight: bold;
}
.support-thank {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}
</style>
