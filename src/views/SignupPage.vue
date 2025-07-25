<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Sign Up</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form @submit.prevent="signup">
        <ion-item>
          <ion-label position="floating">Email</ion-label>
          <ion-input type="email" v-model="email" required></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="floating">Password</ion-label>
          <ion-input type="password" v-model="password" required></ion-input>
        </ion-item>

        <ion-button
            type="submit"
            expand="block"
            :disabled="loading"
            class="ion-margin-top"
        >
          {{ loading ? 'Creating account...' : 'Sign Up' }}
        </ion-button>

        <ion-text color="danger" v-if="errorMsg" class="ion-padding">
          {{ errorMsg }}
        </ion-text>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/plugins/supabaseClient' // adjust path if needed

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)
const router = useRouter()

async function signup() {
  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
  })

  loading.value = false

  if (error) {
    errorMsg.value = error.message
  } else {
    // Optional: Redirect to login or home after signup
    router.push('/login')
  }
}
</script>
