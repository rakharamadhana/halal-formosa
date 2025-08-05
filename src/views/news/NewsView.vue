<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>{{ newsItem?.title || (loading ? 'Loading...' : 'Not Found') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="loading">
        <ion-skeleton-text animated style="width: 100%; height: 200px;" />
        <ion-skeleton-text animated style="width: 70%; height: 20px; margin-top: 10px;" />
      </div>

      <div v-else-if="newsItem">
        <img
            v-if="newsItem.header_image"
            :src="newsItem.header_image"
            style="width: 100%; border-radius: 12px; margin-bottom: 1rem;"
        />
        <h1>{{ newsItem.title}}</h1>
        <p style="margin: 4px 0 8px 0; font-size: 13px;">Added by {{newsItem.author_name}} - {{ fromNowToTaipei(newsItem.created_at) }}</p>
        <div class="article-content" v-html="newsItem.content"></div>
        <p class="ion-text-end ion-margin-top" style="color: var(--ion-color-medium); font-size: 0.8rem;">
          Added by {{ newsItem.author_name || 'Unknown' }} • {{ new Date(newsItem.created_at).toLocaleDateString() }}
        </p>
      </div>

      <p v-else class="ion-text-center ion-margin-top">
        ❌ News not found.
      </p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton} from '@ionic/vue';
import { useRoute } from 'vue-router';
import { supabase } from '@/plugins/supabaseClient';

const route = useRoute();
const newsItem = ref<any>(null);
const loading = ref(true);

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Extend dayjs
dayjs.extend(utc)
dayjs.extend(timezone)

import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

function fromNowToTaipei(dateString?: string) {
  if (!dateString) return ''
  return dayjs.utc(dateString).tz('Asia/Taipei').fromNow()
}

onMounted(async () => {
  const id = route.params.id;
  const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('id', id)
      .single();

  if (!error && data) {
    newsItem.value = data;
  }
  loading.value = false;
});
</script>

<style>
.article-content {
  line-height: 1.7;
  font-size: 1rem;
  color: #333;
}

.article-content h2 {
  margin-top: 1.5rem;
  font-size: 1.3rem;
  font-weight: bold;
}

.article-content p {
  margin-bottom: 1rem;
}

.article-content img {
  max-width: 100%;
  border-radius: 8px;
  margin: 1rem 0;
}
</style>
