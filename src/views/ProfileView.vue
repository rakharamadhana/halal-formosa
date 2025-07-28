<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title class="title-large">
          <ion-icon :icon="personCircleOutline" style="vertical-align: middle; "></ion-icon>
          Profile
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Profile</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-card class="profile-card ion-text-center">
        <div v-if="userAvatar" class="avatar-wrapper">
          <img
              :src="userAvatar"
              alt="Profile Picture"
              class="avatar"
          />
        </div>

        <ion-text v-if="userDisplayName" class="profile-name">
          <h2>{{ userDisplayName }}</h2>
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
          Logout
        </ion-button>

        <div v-else class="login-prompt">
          <p>No user logged in</p>
          <ion-button
              color="carrot"
              expand="block"
              @click="goToLogin"
          >
            Login
          </ion-button>
        </div>
      </ion-card>

      <ion-list class="profile-menu" style="border-radius: 10px">
        <ion-item button @click="goToSettings">
          <ion-icon :icon="settingsOutline"></ion-icon>&nbsp;
          <ion-label>Settings</ion-label>
        </ion-item>

        <ion-item button @click="goToLegal" style="--inner-border-width: 0">
          <ion-icon :icon="documentTextOutline"></ion-icon>&nbsp;
          <ion-label>Legal</ion-label>
        </ion-item>
      </ion-list>

      <ion-card class="app-info-card ion-text-center">
        <ion-card-header>
          <ion-card-title>App Info</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-label>App Name</ion-label>
              <ion-note slot="end">Halal Formosa</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Version</ion-label>
              <ion-note slot="end">1.0.0</ion-note> <!-- Replace with actual version if dynamic -->
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

    </ion-content>
  </ion-page>
</template>

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

.logout-button, .login-prompt ion-button {
  margin-top: 1rem;
}

.login-prompt p {
  margin-bottom: 1rem;
  font-size: 1rem;
  color: var(--ion-color-medium);
}
</style>


<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/plugins/supabaseClient';
import { onIonViewWillEnter } from '@ionic/vue';
import {settingsOutline, documentTextOutline, personCircleOutline} from 'ionicons/icons';
import {
  IonPage,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonContent,
  IonButton,
    IonCard,
    IonText,
    IonLabel,
    IonItem,
    IonList,
  IonIcon,
    IonCardContent,
    IonNote,
    IonCardTitle,
  IonCardHeader,
} from '@ionic/vue';

export default defineComponent({
  components: {
    IonPage,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonContent,
    IonButton,
    IonCard,
    IonText,
    IonLabel,
    IonItem,
    IonList,
    IonIcon,
    IonCardContent,
    IonNote,
    IonCardTitle,
    IonCardHeader,
  },
  setup() {
    const userEmail = ref('');
    const userDisplayName = ref('');
    const userAvatar = ref('')
    const router = useRouter();

    async function updateUser() {
      try {
        const { data } = await supabase.auth.getUser()
        if (data?.user) {
          userEmail.value = data.user.email || ''
          userDisplayName.value = data.user.user_metadata?.full_name || data.user.user_metadata?.display_name || ''
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

    onIonViewWillEnter(() => {
      updateUser();
    });

    async function handleLogout() {
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert('Logout failed: ' + error.message);
      } else {
        userEmail.value = '';
        router.push('/login');
      }
    }

    function goToLogin() {
      router.push('/login');
    }

    function goToSettings() {
      router.push('/settings');
    }

    function goToLegal() {
      router.push('/legal');
    }


    return {
      userEmail,
      userDisplayName,
      userAvatar,
      handleLogout,
      goToLogin,
      goToSettings,
      goToLegal,
      settingsOutline,
      documentTextOutline,
      personCircleOutline
    }
  },
});
</script>

