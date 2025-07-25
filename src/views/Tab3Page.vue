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
        <p>Loading user info...</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonPage, IonHeader, IonTitle, IonToolbar, IonContent, IonButton } from '@ionic/vue';
import { defineComponent } from 'vue';

export default defineComponent({
  components: { IonPage, IonHeader, IonTitle, IonToolbar, IonContent, IonButton },
});
</script>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/plugins/supabaseClient'  // adjust path if needed

const userEmail = ref('')
const router = useRouter()

onMounted(async () => {
  const { data } = await supabase.auth.getUser()
  if (data?.user?.email) {
    userEmail.value = data.user.email
  } else {
    userEmail.value = 'No user logged in'
  }
})

async function handleLogout() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    alert('Logout failed: ' + error.message)
  } else {
    // Redirect to login page after logout
    router.push('/login')
  }
}
</script>
