<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title class="title-large">Halal & Islam News</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
            placeholder="Search news..."
            :debounce="800"
            v-model="searchQuery"
            @ionInput="handleSearch"
            class="rounded"
            style="flex: 1;"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- ✅ Pull-to-refresh like SearchView -->
      <ion-refresher style="margin-top: 15px;" slot="fixed" @ionRefresh="refreshNews">
        <ion-refresher-content
            :pulling-icon="chevronDownCircleOutline"
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
        />
      </ion-refresher>

      <ion-list>
        <ion-item
            v-for="(item, index) in filteredNews"
            :key="index"
            button
            detail
            @click="openNews(item)"
            style="--padding-start: 8px; --inner-padding-end: 8px;"
        >
          <ion-thumbnail slot="start" style="width: 115px; height: 115px; border-radius: 10px; overflow: hidden;">
            <img :src="item.thumbnail" alt="news-thumbnail" style="width: 100%; height: 100%; object-fit: cover;" />
          </ion-thumbnail>
          <ion-label>
            <h2>{{ item.title }}</h2>
            <p style="color: var(--ion-background-color-step-800)">{{ item.summary }}</p>
            <p><small>{{ fromNowToTaipei(item.created_at) }}</small></p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- Infinite Scroll -->
      <ion-infinite-scroll threshold="100px" @ionInfinite="loadMore" :disabled="allLoaded">
        <ion-infinite-scroll-content
            loading-spinner="bubbles"
            loading-text="Loading more news..."
        />
      </ion-infinite-scroll>

      <!-- ✅ FAB for Admin Only -->
      <ion-fab v-if="isAdmin" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="carrot" @click="goToAddNews">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonSearchbar, IonContent,
  IonList, IonItem, IonLabel, IonThumbnail,
  IonInfiniteScroll, IonInfiniteScrollContent,
  IonRefresher, IonRefresherContent, IonBackButton, IonButtons, IonTitle, IonIcon, IonFab, IonFabButton
} from '@ionic/vue';
import { supabase } from '@/plugins/supabaseClient';
import {addOutline, chevronDownCircleOutline} from 'ionicons/icons';

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  thumbnail: string;
  created_at: string;
}


const router = useRouter();
const isAdmin = ref(false);

const allNews = ref<NewsItem[]>([]);
const displayedNews = ref<NewsItem[]>([]);
const searchQuery = ref('');
const allLoaded = ref(false);
const pageSize = 10;
let currentOffset = 0;

import relativeTime from 'dayjs/plugin/relativeTime'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Extend dayjs
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

function fromNowToTaipei(dateString?: string) {
  if (!dateString) return ''
  return dayjs.utc(dateString).tz('Asia/Taipei').fromNow()
}

onMounted(async () => {
  await checkAdmin();
  await loadInitialNews();
});

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

  if (!error && data && data.role === 'admin') {
    isAdmin.value = true;
  }
}

async function loadInitialNews() {
  currentOffset = 0;
  allNews.value = [];
  displayedNews.value = [];
  allLoaded.value = false;
  await fetchNewsBatch();
}

async function fetchNewsBatch() {
  const { data, error } = await supabase
      .from('news')
      .select('id, title, header_image, content, created_at')
      .order('created_at', { ascending: false })
      .range(currentOffset, currentOffset + pageSize - 1);

  if (!error && data) {
    const mappedData = data.map((item: any) => ({
      id: item.id,
      title: truncateText(item.title, 12),
      summary: generateSummary(item.content, item.title, 10),
      thumbnail: item.header_image || 'https://placehold.co/600x400',
      created_at: item.created_at
    }));

    allNews.value.push(...mappedData);
    displayedNews.value = allNews.value;
    currentOffset += pageSize;

    if (mappedData.length < pageSize) {
      allLoaded.value = true;
    }
  }
}

async function loadMore(event: any) {
  await fetchNewsBatch();
  event.target.complete();
}

async function refreshNews(event: any) {
  await loadInitialNews();
  event.detail.complete();
}

function truncateText(text: string, wordLimit = 10) {
  const words = text.trim().split(/\s+/);
  return words.slice(0, wordLimit).join(' ') + (words.length > wordLimit ? '…' : '');
}

function generateSummary(content: string, title: string, wordLimit = 20) {
  const text = content.replace(/<[^>]+>/g, '').trim();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const filtered = lines.filter(line => !line.includes(title)).join(' ');
  const allWords = filtered.split(/\s+/);
  return allWords.slice(0, wordLimit).join(' ') + (allWords.length > wordLimit ? '…' : '');
}

function handleSearch() {
  // Computed handles filtering
}

const filteredNews = computed(() => {
  if (!searchQuery.value) return displayedNews.value;
  return displayedNews.value.filter(item =>
      item.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

function openNews(item: NewsItem) {
  router.push(`/news/${item.id}`);
}

function goToAddNews() {
  router.push('/news/add'); // ✅ define route to Write News page
}
</script>

<style scoped>
ion-searchbar.rounded {
  --border-radius: 8px;
  --box-shadow: 0 1px 3px rgba(41, 40, 40, 0.1);
}
</style>
