<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
import { supabase } from '@/plugins/supabaseClient';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel,
  IonTextarea, IonButton, IonInput, IonCard, IonCardHeader, IonCardContent, IonCardTitle, IonToast
} from '@ionic/vue';

const route = useRoute();
const router = useRouter();

const showToast = ref(false);
const toastMessage = ref('');
const toastColor = ref<'success' | 'danger'>('success');

const barcode = route.params.barcode as string;
const product = ref<any>(null);
const reportDescription = ref('');
const currentUser = ref<any>(null);

async function fetchProduct() {
  const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();

  if (error) {
    toastMessage.value = '❌ Product not found.';
    toastColor.value = 'danger';
    showToast.value = true;
    setTimeout(() => router.back(), 1500);
  } else {
    product.value = data;
  }
}

const loading = ref(false);

async function submitReport() {
  if (!product.value || !reportDescription.value.trim()) return;
  loading.value = true;

  const { error } = await supabase.from('product_reports').insert([{
    barcode: product.value.barcode,
    description: reportDescription.value.trim(),
    created_at: new Date().toISOString(),
    reported_by: currentUser.value?.id ?? null,
  }]);

  loading.value = false;
  if (error) {
    toastMessage.value = 'Failed to submit report.';
    toastColor.value = 'danger';
  } else {
    toastMessage.value = 'Report submitted!';
    toastColor.value = 'success';
    setTimeout(() => router.back(), 1000);
  }

  showToast.value = true;
}


onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser.value = user;
  if (barcode) fetchProduct();
});
</script>


<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Report Product</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-card v-if="product">
        <ion-card-header>
          <ion-card-title>{{ product.name }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label position="stacked">Barcode</ion-label>
            <ion-input :value="product.barcode" readonly />
          </ion-item>

          <ion-item>
            <ion-textarea
                label="Reason"
                label-placement="floating"
                v-model="reportDescription"
                auto-grow
                placeholder="Explain the issue"
            />
          </ion-item>

          <ion-button
              expand="block"
              color="danger"
              @click="submitReport"
              :disabled="!reportDescription.trim() || loading"
          >
            Submit Report
          </ion-button>


          <ion-button expand="block" fill="clear" @click="router.back()">
            Cancel
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-toast
          :is-open="showToast"
          :message="toastMessage"
          :color="toastColor"
          duration="2000"
          @didDismiss="showToast = false"
          style="transform: translateY(-55px);"
      />
    </ion-content>
  </ion-page>
</template>

<style scoped>

</style>