<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Login</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form @submit.prevent="login">
        <div class="form-container">
          <ion-item-group>
            <ion-item>
              <ion-input
                  label="Email"
                  label-placement="stacked"
                  placeholder="Enter email"
                  type="email"
                  v-model="email"
                  required
              ></ion-input>
            </ion-item>

            <ion-item style="--inner-border-width: 0">
              <ion-input
                  label="Password"
                  label-placement="stacked"
                  placeholder="Enter password"
                  type="password"
                  v-model="password"
                  required
              >
                <ion-input-password-toggle slot="end" />
              </ion-input>
            </ion-item>
          </ion-item-group>
        </div>

        <ion-button
            type="submit"
            expand="block"
            :disabled="loading"
            color="carrot"
            class="ion-margin-top"
        >
          {{ loading ? 'Logging in...' : 'Login' }}
        </ion-button>

        <ion-button
            expand="block"
            fill="outline"
            class="ion-margin-top"
            color="carrot"
            @click="loginWithGoogle"
        >
          Continue with Google
        </ion-button>


        <ion-button
            id="home"
            expand="block"
            fill="clear"
            class="ion-margin-top"
            color="medium"
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
  IonInputPasswordToggle,IonItemGroup,
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
    IonContent,IonItemGroup
  },
});
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '@/plugins/supabaseClient';
import { Capacitor } from '@capacitor/core';

// form fields
const email = ref('');
const password = ref('');
const errorMsg = ref('');
const loading = ref(false);

// router helpers
const router = useRouter();
const route = useRoute();

// email/password login
async function login() {
  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  loading.value = false

  if (error) {
    errorMsg.value = error.message
  }
}



async function loginWithGoogle() {
  errorMsg.value = '';

  const r = route.query.redirect;
  const safeRedirect: string =
      typeof r === 'string'
          ? r
          : Array.isArray(r) && r.length > 0
              ? r[0] ?? '/'
              : '/';

  const redirectUrl = Capacitor.isNativePlatform()
      ? 'myapp://callback'
      : window.location.origin + safeRedirect;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: { next: safeRedirect },
    },
  });

  if (error) {
    errorMsg.value = error.message;
  }
}

function goHome() {
  router.push('/');
}
</script>


<style>
ion-item {
  --background: transparent;
}

.form-container {
  border-radius: 10px;
  background-color: var(--ion-color-light); /* optional background */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* optional elevation */
}
</style>