<template>
  <ion-page>
    <ion-header>
      <app-header
          title="Analytics Dashboard"
          :icon="listOutline"
          :showBack="true"
      />
    </ion-header>

    <ion-content class="ion-padding">

      <!-- ============================
           TODAY STATS
      ============================ -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Today’s Activity</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>
            <strong>DAU</strong>
            <ion-icon
                :icon="informationCircleOutline"
                id="dau-info"
                color="medium"
                style="margin-left: 6px; cursor: help;"
            ></ion-icon>

            <ion-popover trigger="dau-info" trigger-action="click">
              <ion-content class="ion-padding">
                <b>DAU</b> = Daily Active Users<br>
                Number of unique users who opened the app today.
              </ion-content>
            </ion-popover>
            : {{ dau }}
          </p>


          <p><strong>Total Events:</strong> {{ totalEvents }}</p>
        </ion-card-content>
      </ion-card>

      <!-- ============================
           MOST USED FEATURES
      ============================ -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>🔥 Most Used Features</ion-card-title>
        </ion-card-header>

        <ion-card-content>

          <!-- Bar Chart -->
          <div class="chart-container">
            <Bar
                v-if="featureChartData && featureChartData.labels.length"
                :data="featureChartData"
                :options="chartOptions"
            />

          </div>

          <!-- Feature list -->
          <ion-list class="ion-margin-top">
            <ion-item
                v-for="f in (showAllFeatures ? topFeatures : topFeatures.slice(0, 5))"
                :key="f.activity_type"
            >
              <ion-label>{{ f.activity_type }}</ion-label>
              <ion-badge slot="end" color="primary">{{ f.count }}</ion-badge>
            </ion-item>
          </ion-list>

          <!-- Toggle -->
          <div style="text-align:center; margin-top: 10px;">
            <ion-button
                fill="clear"
                color="carrot"
                size="small"
                @click="showAllFeatures = !showAllFeatures"
            >
              {{ showAllFeatures ? "Show Less" : "View More" }}
            </ion-button>
          </div>

        </ion-card-content>
      </ion-card>


      <!-- ============================
           MOST VIEWED PRODUCTS
      ============================ -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>🥘 Most Viewed Products</ion-card-title>
        </ion-card-header>
        <ion-card-content>

          <div class="chart-container">
            <Bar
                v-if="productChartData && productChartData.labels && productChartData.labels.length"
                :data="productChartData"
                :options="chartOptions"
            />
          </div>

          <ion-list class="ion-margin-top">
            <ion-item v-for="p in topProducts" :key="p.barcode">
              <ion-label>{{ p.product_name }}</ion-label>
              <ion-badge slot="end" color="success">{{ p.count }}</ion-badge>
            </ion-item>
          </ion-list>

        </ion-card-content>
      </ion-card>



      <!-- ============================
           MOST VIEWED LOCATIONS
      ============================ -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>🕌 Most Viewed Locations</ion-card-title>
        </ion-card-header>
        <ion-card-content>

          <div class="chart-container">
            <Bar
                v-if="locationChartData && locationChartData.labels && locationChartData.labels.length"
                :data="locationChartData"
                :options="chartOptions"
            />
          </div>


          <ion-list class="ion-margin-top">
            <ion-item v-for="l in topLocations" :key="l.place_id">
              <ion-label>{{ l.place_name }}</ion-label>
              <ion-badge slot="end" color="tertiary">{{ l.count }}</ion-badge>
            </ion-item>
          </ion-list>

        </ion-card-content>
      </ion-card>


      <!-- ============================
           HOURLY ACTIVITY
      ============================ -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>⏳ Activity by Hour (Today)</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="chart-container">
            <Line
                v-if="hourlyChartData && hourlyChartData.labels && hourlyChartData.labels.length"
                :data="hourlyChartData"
                :options="lineChartOptions"
            />
          </div>

        </ion-card-content>
      </ion-card>


      <!-- ============================
           RECENT SEARCHES
      ============================ -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>🔍 Recent Searches</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item v-for="s in recentSearches" :key="s.id">
              <ion-label>{{ s.activity_detail?.query || '-' }}</ion-label>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

    </ion-content>
  </ion-page>
</template>



<script setup lang="ts">
/* -----------------------------------
   Imports
----------------------------------- */
import {
  IonPage, IonHeader, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonIcon
} from "@ionic/vue";

import { ref, onMounted } from "vue";
import { supabase } from "@/plugins/supabaseClient";
import { isAdmin } from "@/composables/userProfile";
import { useRouter } from "vue-router";
import {informationCircleOutline, listOutline} from "ionicons/icons";
import AppHeader from "@/components/AppHeader.vue";

/* Chart.js */
import { Bar, Line } from "vue-chartjs";

import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,        // ⬅️ ADD THIS
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale
} from "chart.js";

ChartJS.register(
    Title,
    Tooltip,
    Legend,
    BarElement,        // ⬅️ REQUIRED FOR BAR CHARTS
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale
);


interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}


/* -----------------------------------
   State Variables
----------------------------------- */
const router = useRouter();

const dau = ref(0);
const totalEvents = ref(0);

const topFeatures = ref<any[]>([]);
const topProducts = ref<any[]>([]);
const topLocations = ref<any[]>([]);
const recentSearches = ref<any[]>([]);

const showAllFeatures = ref(false);

/* Chart Data */
const featureChartData = ref<ChartData>({
  labels: [],
  datasets: []
})

const productChartData = ref<any>(null);
const locationChartData = ref<any>(null);
const hourlyChartData = ref<any>(null);

/* Chart options */
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      ticks: {
        maxRotation: 30,
        minRotation: 0,
        autoSkip: true,
        color: "#ccc"
      }
    },
    y: { ticks: { color: "#ccc" } }
  }
};

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#ccc" } },
  },
  scales: {
    x: { ticks: { color: "#ccc" } },
    y: { ticks: { color: "#ccc" } },
  }
};


/* -----------------------------------
   Fetch Analytics Data
----------------------------------- */
async function fetchAnalytics() {
  const today = new Date().toISOString().slice(0, 10);

  /* 1. DAU + Total Events */
  const { data: eventsToday } = await supabase
      .from("activity_log")
      .select("user_id, activity_detail")
      .gte("created_at", `${today} 00:00:00`);

  if (eventsToday) {
    dau.value = new Set(eventsToday.map(e => e.user_id)).size;
    totalEvents.value = eventsToday.length;
  }

  /* 2. Top Features (RPC) */
  const { data: features } = await supabase.rpc("analytics_top_features_today");
  topFeatures.value = features || [];

  /* Build feature chart */
  featureChartData.value = {
    labels: topFeatures.value.map(f => f.activity_type),
    datasets: [
      {
        label: "Feature Usage",
        data: topFeatures.value.map(f => f.count),
        backgroundColor: "rgba(255, 159, 64, 0.8)"
      }
    ]
  };


  /* 3. Top Products */
  const { data: products } = await supabase.rpc("analytics_top_products_today");
  topProducts.value = products || [];

  productChartData.value = {
    labels: topProducts.value.map(p => shortName(p.product_name)),
    datasets: [{
      label: "Views",
      data: topProducts.value.map(p => p.count),
      backgroundColor: "#2ecc71"
    }]
  };



  /* 4. Top Locations */
  const { data: locations } = await supabase.rpc("analytics_top_locations_today");
  topLocations.value = locations || [];

  locationChartData.value = {
    labels: topLocations.value.map(l => l.place_name),
    datasets: [{
      label: "Views",
      data: topLocations.value.map(l => l.count),
      backgroundColor: "#3498db"
    }]
  };


  /* 5. Hourly Activity */
  const { data: hourly } = await supabase
      .from("activity_log")
      .select("created_at")
      .gte("created_at", `${today} 00:00:00`);

  const hours = Array(24).fill(0);
  hourly?.forEach(e => {
    const h = new Date(e.created_at).getHours();
    hours[h] += 1;
  });

  hourlyChartData.value = {
    labels: [...Array(24).keys()].map(h => `${h}:00`),
    datasets: [{
      label: "Events",
      data: hours,
      borderColor: "#bb86fc",
      backgroundColor: "rgba(187, 134, 252, 0.2)",
      borderWidth: 2,
      tension: 0.3,       // smooth curve
      pointRadius: 4,
      pointBackgroundColor: "#bb86fc"
    }]
  };



  /* 6. Recent Searches (parse JSON) */
  const { data: searchesRaw } = await supabase
      .from("activity_log")
      .select("id, activity_detail")
      .eq("activity_type", "search_query")
      .order("created_at", { ascending: false })
      .limit(10);

  recentSearches.value = (searchesRaw || []).map(s => ({
    ...s,
    activity_detail:
        typeof s.activity_detail === "string"
            ? JSON.parse(s.activity_detail)
            : s.activity_detail
  }));
}


function shortName(name: string, max = 20) {
  return name.length > max ? name.slice(0, max) + "…" : name;
}


/* -----------------------------------
   Auth check
----------------------------------- */
onMounted(() => {
  if (!isAdmin.value) {
    router.replace("/profile");
    return;
  }
  fetchAnalytics();
});
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 350px !important;
  position: relative;
}
</style>

