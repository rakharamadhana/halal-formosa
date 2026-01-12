<template>
  <ion-page>
    <ion-content fullscreen class="auth-page">
      <div class="auth-container">

        <!-- Logo -->
        <div class="logo-wrapper">
          <img
              src="/android-chrome-512x512.png"
              alt="App logo"
              class="app-logo"
          />
        </div>

        <!-- Title -->
        <h1 class="auth-title">Login</h1>
        <p class="auth-subtitle">
          Please login to continue using our app.
        </p>

        <!-- Form -->
        <form @submit.prevent="login">
          <!-- Email -->
          <div class="input-card">
            <ion-input
                fill="outline"
                label="Email"
                label-placement="floating"
                type="email"
                v-model="email"
                required
            />
          </div>

          <!-- Password -->
          <div class="input-card">
            <ion-input
                fill="outline"
                label="Password"
                label-placement="floating"
                type="password"
                v-model="password"
                required
            >
              <ion-input-password-toggle slot="end" />
            </ion-input>
          </div>

          <!-- Error -->
          <ion-text color="danger" v-if="errorMsg" class="error-text">
            {{ errorMsg }}
          </ion-text>

          <!-- Login button -->
          <ion-button
              type="submit"
              expand="block"
              color="carrot"
              class="primary-btn"
              :disabled="loading"
          >
            {{ loading ? 'Logging in...' : 'Login' }}
          </ion-button>

          <!-- Divider -->
          <div class="divider">
            <span>OR</span>
          </div>

          <!-- Google -->
          <ion-button
              expand="block"
              fill="outline"
              color="carrot"
              @click="loginWithGoogle"
          >
            Continue with Google
          </ion-button>

          <!-- Back -->
          <div class="back-divider" @click="goHome">
            <span>BACK TO HOME</span>
          </div>

        </form>

      </div>
    </ion-content>
  </ion-page>
</template>


<script lang="ts">
import {
  IonPage,
  IonInput,
  IonButton,
  IonText,
  IonInputPasswordToggle,
    IonContent
} from '@ionic/vue';
import { defineComponent } from 'vue';

export default defineComponent({
  components: {
    IonPage,
    IonInput,
    IonButton,
    IonText,
    IonInputPasswordToggle,
    IonContent
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
/* =========================
   AUTH PAGE BASE
========================= */
.auth-page {
  --background: radial-gradient(
      120% 120% at 50% -10%,
      #2a2a2a 0%,
      #1e1e1e 55%,
      #181818 100%
  );
}

/* =========================
   CONTAINER
========================= */
.auth-container {
  min-height: 100%;
  max-width: 420px;
  margin: auto;
  padding: 36px 22px 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* =========================
   LOGO
========================= */
.logo-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}

.app-logo {
  width: 150px;
  height: 150px;
  border-radius: 28px;
}


/* =========================
   TYPOGRAPHY
========================= */
.auth-title {
  margin-top: 6px;
  margin-bottom: 6px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #ffffff;
}

.auth-subtitle {
  font-size: 14px;
  line-height: 1.5;
  color: #b8b8b8;
  margin-bottom: 40px;
}

/* =========================
   INPUTS
========================= */
.input-card {
  margin-bottom: 0;
}

.input-card + .input-card {
  margin-top: 16px;
}

ion-input {
  --min-height: 56px;
  --padding-start: 16px;
  --padding-end: 16px;

  --border-radius: 14px;
  --border-color: #3a3a3a;
  --highlight-color-focused: var(--ion-color-carrot);

  --color: #ffffff;
  --placeholder-color: #9a9a9a;

  background: rgba(255, 255, 255, 0.015);
}

/* Floating label */
ion-input::part(label) {
  font-size: 14px;
  color: #b5b5b5;
  transition: color 0.15s ease;
}

ion-input.has-focus::part(label),
ion-input.has-value::part(label) {
  color: var(--ion-color-carrot);
}

/* =========================
   ERROR MESSAGE
========================= */
.error-text {
  display: block;
  margin-top: 12px;
  margin-bottom: 6px;
  font-size: 13px;
}

/* =========================
   PRIMARY BUTTON
========================= */
.primary-btn {
  margin-top: 22px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.primary-btn::part(native):active {
  transform: scale(0.98);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45);
}

/* =========================
   DIVIDER
========================= */
.divider {
  display: flex;
  align-items: center;
  margin: 28px 0 24px;
  font-size: 11px;
  letter-spacing: 1px;
  color: #8f8f8f;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #2f2f2f;
}

.divider span {
  padding: 0 12px;
  opacity: 0.7;
}

/* =========================
   SMALL SCREEN ADJUSTMENTS
========================= */
@media (max-height: 620px) {
  .logo-wrapper {
    margin-bottom: 10px;
  }

  .app-logo {
    width: 96px;
    height: 96px;
    border-radius: 20px;
  }

  .auth-subtitle {
    margin-bottom: 28px;
  }
}

.back-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 22px;
  font-size: 12px;
  letter-spacing: 1px;
  color: #8f8f8f;
  cursor: pointer;
}

.back-divider span {
  opacity: 0.7;
  transition: opacity 0.15s ease;
}

.back-divider:hover span {
  opacity: 1;
}

</style>