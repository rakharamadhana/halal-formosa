<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Login</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form @submit.prevent="login">
        <ion-item>
          <ion-input
              label="Email"
              label-placement="floating"
              placeholder="Enter email"
              type="email"
              v-model="email"
              required
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-input
              label="Password"
              label-placement="floating"
              placeholder="Enter password"
              type="password"
              v-model="password"
              required
          >
            <ion-input-password-toggle slot="end" />
          </ion-input>
        </ion-item>

        <ion-button
            type="submit"
            expand="block"
            :disabled="loading"
            class="ion-margin-top"
        >
          {{ loading ? 'Logging in...' : 'Login' }}
        </ion-button>

        <ion-button
            expand="block"
            fill="clear"
            class="ion-margin-top"
            @click="goHome"
        >
          Back to Home
        </ion-button>

        <ion-text color="danger" v-if="errorMsg" class="ion-padding">
          {{ errorMsg }}
        </ion-text>
      </form>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonPage,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonInput,
  IonButton,
  IonText,
  IonItem,
  IonInputPasswordToggle,
    IonContent
} from '@ionic/vue';
import { defineComponent } from 'vue';

export default defineComponent({
  components: {
    IonPage,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonInput,
    IonButton,
    IonText,
    IonItem,
    IonInputPasswordToggle,
    IonContent
  },
});
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/plugins/supabaseClient'; // adjust path if needed

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const loading = ref(false);
const router = useRouter();

async function login() {
  loading.value = true;
  errorMsg.value = '';

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });

  loading.value = false;

  if (error) {
    errorMsg.value = error.message;
  } else if (data.session) {
    router.push('/'); // redirect after login
  }
}

function goHome() {
  router.push('/');
}
</script>
