<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Profile</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Profile</ion-title>
        </ion-toolbar>
      </ion-header>

      <div v-if="userEmail">
        <p><strong>Email:</strong> {{ userEmail }}</p>
        <ion-button color="danger" @click="handleLogout" expand="block">
          Logout
        </ion-button>
      </div>

      <div v-else>
        <p>No user logged in</p>
        <ion-button color="primary" @click="goToLogin" expand="block">
          Login
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/plugins/supabaseClient';
import { onIonViewWillEnter } from '@ionic/vue';
import {
  IonPage,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonContent,
  IonButton,
} from '@ionic/vue';

export default defineComponent({
  components: {
    IonPage,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonContent,
    IonButton,
  },
  setup() {
    const userEmail = ref('');
    const router = useRouter();

    async function updateUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.email) {
          userEmail.value = data.user.email;
        } else {
          userEmail.value = '';
        }
      } catch (error) {
        userEmail.value = '';
        console.error('Failed to fetch user:', error);
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

    return {
      userEmail,
      handleLogout,
      goToLogin,
    };
  },
});
</script>

