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
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '@/plugins/supabaseClient'; // adjust path if needed
import { Capacitor } from '@capacitor/core';
import {IonItemGroup} from "@ionic/vue";
import type { LocationQueryValue } from 'vue-router';

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const loading = ref(false);
const router = useRouter();
const route = useRoute(); // ✅ This is what was missing

const rawRedirect = route.query.redirect as LocationQueryValue;
const redirectTo: string =
    typeof rawRedirect === 'string' ? rawRedirect : '/';

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
    router.push(redirectTo as string);
  }
}

// ✅ Construct dynamic redirectUrl with `#next=...` for native OAuth login
const redirectUrl = Capacitor.isNativePlatform()
    ? 'myapp://callback'
    : window.location.origin + (redirectTo || '/');

async function loginWithGoogle() {
  errorMsg.value = '';
  console.log('🔁 Starting Google login');
  console.log('🔗 Redirect URL:', redirectUrl);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          next: redirectTo
        }
      },
    });

    console.log('📡 signInWithOAuth response:', { data, error });

    if (error) {
      errorMsg.value = error.message;
      console.error('❌ OAuth error:', error.message);
    } else {
      console.log('✅ OAuth login initiated, waiting for redirect...');
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'An unexpected error occurred during Google login.';
    console.error('💥 Unexpected error during OAuth login:', err);
  }
}

function goHome() {
  router.push('/');  // Navigate to parent route that includes ion-tabs and ion-router-outlet
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