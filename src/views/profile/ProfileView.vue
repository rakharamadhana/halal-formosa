<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title class="title-large">
          <ion-icon :icon="personCircleOutline" style="vertical-align: middle;" />
          {{ $t('profile.title') }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ $t('profile.title') }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <!-- ✅ Skeleton while loading -->
      <div v-if="loading" class="ion-text-center">
        <ion-card class="profile-card ion-text-center">
          <!-- Avatar -->
          <ion-skeleton-text
              animated
              style="width: 120px; height: 120px; border-radius: 50%; margin: 0 auto;"
          />

          <!-- Name -->
          <ion-skeleton-text
              animated
              style="width: 60%; height: 20px; margin: 1rem auto;"
          />

          <!-- Badge -->
          <ion-skeleton-text
              animated
              style="width: 80px; height: 20px; border-radius: 5px; margin: 0 auto;"
          />

          <!-- Email -->
          <ion-skeleton-text
              animated
              style="width: 70%; height: 16px; margin: 0.5rem auto;"
          />

          <!-- Button -->
          <ion-skeleton-text
              animated
              style="width: 100%; height: 36px; border-radius: 6px; margin: 1.5rem auto;"
          />
        </ion-card>
      </div>

      <!-- ✅ Real content -->
      <div v-else>
        <!-- Profile Card -->
        <ion-card class="profile-card ion-text-center">
          <div v-if="userAvatar" class="avatar-wrapper">
            <img :src="userAvatar" alt="Profile Picture" class="avatar" />
          </div>

          <ion-text v-if="userDisplayName" class="profile-name">
            <h2>{{ userDisplayName }}</h2>
            <ion-badge :color="donorBadge.color" style="margin-left: 6px;">
              {{ donorBadge.emoji }} {{ donorBadge.label }}
            </ion-badge>
          </ion-text>


          <ion-text v-if="userEmail" class="profile-email">
            <p>{{ userEmail }}</p>
          </ion-text>

          <ion-button
              v-if="userEmail"
              color="danger"
              expand="block"
              class="logout-button"
              @click="handleLogout"
          >
            {{ $t('profile.logout') }}
          </ion-button>

          <div v-else class="login-prompt">
            <p>{{ $t('profile.noUserLogged') }}</p>
            <ion-button color="carrot" expand="block" @click="goToLogin">
              {{ $t('profile.login') }}
            </ion-button>
          </div>
        </ion-card>
      </div>

      <ion-card v-if="userEmail" class="profile-card">
        <ion-card-header>
          <ion-toolbar class="profile-toolbar">
            <ion-title class="profile-title">
              {{ $t('profile.aboutMe') }}
            </ion-title>

            <!-- Edit button -->
            <ion-buttons slot="end">
              <ion-button color="carrot" size="small" @click="goToEditProfile">
                <ion-icon :icon="createOutline" slot="start" />
                {{ $t('profile.edit') }}
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-card-header>

        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-label>{{ $t('profile.bio') }}</ion-label>
              <ion-note slot="end">
                <template v-if="userBio">
                  {{ userBio }}
                </template>
                <template v-else>
                  No bio added yet
                </template>
              </ion-note>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="userEmail" class="profile-card ion-text-center">
        <ion-card-header>
          <ion-card-title>{{ $t('profile.experiencePoints') }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <h2 style="font-size: 2rem; margin: 0; color: var(--ion-color-primary);">
            {{ currentPoints }}
          </h2>
          <p>Level {{ level }}</p>
          <ion-progress-bar
              :value="progressPercent / 100"
              color="success"
              style="margin-top: 10px; border-radius: 8px;"
          ></ion-progress-bar>
          <small>{{ currentPoints }} / {{ nextLevelXp }} XP</small>
        </ion-card-content>
      </ion-card>



      <!-- Review Submissions -->
      <ion-list v-if="isAdmin" class="profile-menu" style="border-radius: 10px">
        <ion-item button @click="goToReviewSubmissions" style="--inner-border-width: 0">
          <ion-icon :icon="listOutline" />&nbsp;
          <ion-label>{{ $t('profile.review') }}</ion-label>

          <!-- ✅ Put badge at end slot -->
          <ion-badge
              v-if="pendingCount > 0"
              color="danger"
              slot="end"
          >
            {{ pendingCount }}
          </ion-badge>
        </ion-item>

        <!-- ✅ Admin Test Button -->
        <ion-item button color="danger" @click="testAwardPoints">
          <ion-icon :icon="giftOutline" />&nbsp;
          <ion-label>Test Add Points</ion-label>
        </ion-item>

        <ion-item button @click="goToPointsLogs">
          <ion-icon :icon="listOutline" />&nbsp;
          <ion-label>View Points Logs</ion-label>
        </ion-item>

      </ion-list>

      <!-- Menu -->
      <ion-list class="profile-menu" style="border-radius: 10px; margin-top: 20px">
        <ion-item button @click="goToSettings">
          <ion-icon :icon="settingsOutline" />&nbsp;
          <ion-label>{{ $t('profile.settings') }}</ion-label>
        </ion-item>
        <ion-item button @click="goToLegal" >
          <ion-icon :icon="documentTextOutline" />&nbsp;
          <ion-label>{{ $t('profile.legal') }}</ion-label>
        </ion-item>
        <ion-item button @click="goToCredits" style="--inner-border-width: 0">
          <ion-icon :icon="peopleOutline" />&nbsp;
          <ion-label>{{ $t('profile.credits') }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Support -->
      <ion-card class="profile-card ion-text-center">
        <ion-card-header>
          <ion-card-title>{{ $t('profile.support') }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>{{ $t('profile.supportDescription') }}</p>
          <a href="https://halalformosa.bobaboba.me" target="_blank" class="boba-button">
            <img
                src="https://s3.ap-southeast-1.amazonaws.com/media.anyonelab.com/images/boba/boba-embed-icon.png"
                alt="boba-icon"
                style="height: 100%; margin-right: 8px;"
            />
            {{ $t('profile.bobaMe') }}
          </a>
          <p class="support-thank">{{ $t('profile.supportThank') }}</p>
          <p><small>{{ $t('profile.voluntary') }}</small></p>
        </ion-card-content>
      </ion-card>

      <!-- ✅ Social Media / Follow Us -->
      <ion-card class="profile-card ion-text-center">
        <ion-card-header>
          <ion-card-title>{{ $t('profile.followUs') }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="social-links">
            <!-- Instagram -->
            <!-- Instagram -->
            <a
                href="https://www.instagram.com/halalformosa/"
                target="_blank"
                class="social-button instagram"
            >
              <ion-icon :icon="logoInstagram" class="social-icon"></ion-icon>
              <span>Instagram</span>
            </a>

            <!-- LINE -->
            <a
                href="https://line.me/R/ti/p/@975schpu"
                target="_blank"
                class="social-button line"
            >
              <img src="/social-logo/line-logo.png" alt="LINE" class="social-icon" />
              <span>LINE</span>
            </a>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- App Info -->
      <ion-card class="profile-card ion-text-center">
        <ion-card-header>
          <ion-card-title>{{ $t('profile.appInfo') }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-label>{{ $t('profile.appNameTitle') }}</ion-label>
              <ion-note slot="end">{{ $t('profile.appName') }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>{{ $t('profile.appVersion') }}</ion-label>
              <ion-note slot="end">{{ appVersion }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
import {useRouter} from "vue-router";
import {supabase} from "@/plugins/supabaseClient";
// ✅ Ionic components
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonProgressBar,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";

// ✅ Icons
import {
  chatbubbleEllipses,
  createOutline,
  documentTextOutline,
  giftOutline,
  listOutline, logoInstagram,
  peopleOutline,
  personCircleOutline,
  settingsOutline,
} from "ionicons/icons";

// ✅ Composables
import {donorBadge, isAdmin} from "@/composables/userProfile";
import {Subscription} from "@supabase/supabase-js";
import {usePoints} from "@/composables/usePoints";
import {xpForLevel} from "@/utils/xp"

// @ts-expect-error – injected global
const appVersion = __APP_VERSION__;

const userEmail = ref("");
const userDisplayName = ref("");
const userAvatar = ref("");
const router = useRouter();
const pendingCount = ref(0);
const loading = ref(true);

const userDOB = ref<string | null>(null);
const userNationality = ref<string | null>(null);
const userGender = ref<string | null>(null);
const userBio = ref<string | null>(null);

// ✅ Points composable
const { awardAndCelebrate, currentPoints, fetchCurrentPoints } = usePoints();

let authSubscription: Subscription | null = null;

const level = computed(() => {
  const points = currentPoints.value || 0
  let lvl = 1

  // keep leveling up until next requirement is higher than points
  while (points >= xpForLevel(lvl + 1)) {
    lvl++
  }
  return lvl
})

const nextLevelXp = computed(() => xpForLevel(level.value + 1))
const prevLevelXp = computed(() => xpForLevel(level.value))

const progressPercent = computed(() => {
  const points = currentPoints.value || 0
  return ((points - prevLevelXp.value) / (nextLevelXp.value - prevLevelXp.value)) * 100
})

const countriesList = ref<any[]>([]);
const resolvedNationality = ref<string | null>(null);
const resolvedFlag = ref<string | null>(null);

async function fetchCountries() {
  const response = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2,flags");
  countriesList.value = await response.json();
}

// 🎁 Simplified test button handler
async function testAwardPoints() {
  console.log("🚀 testAwardPoints called with action = add_product");

  await awardAndCelebrate("add_product", 10000); // now it updates global overlay
}

async function fetchPendingCount() {
  if (!isAdmin.value) {
    pendingCount.value = 0;
    return;
  }

  const { count, error } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("approved", false);

  if (!error && count !== null) {
    pendingCount.value = count;
  }
}

async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
      .from("user_profiles")
      .select("date_of_birth, nationality, gender, bio")
      .eq("id", userId)
      .single();

  if (!error && data) {
    userDOB.value = data.date_of_birth;
    userNationality.value = data.nationality;
    userGender.value = data.gender;
    userBio.value = data.bio;

    // 🚀 If missing required fields → redirect to EditProfile
    if (!data.date_of_birth || !data.nationality || !data.gender) {
      router.replace({ name: "EditProfile" });
      return;
    }

    // ✅ resolve nationality flag if available
    if (countriesList.value.length > 0 && data.nationality) {
      const match = countriesList.value.find(c => c.cca2 === data.nationality);
      if (match) {
        resolvedNationality.value = match.name.common;
        resolvedFlag.value = match.flags.png;
      }
    }
  }
}


// ✅ Always refresh when ProfileView becomes active
onIonViewWillEnter(async () => {
  const { data } = await supabase.auth.getUser();
  if (data?.user) {
    await fetchCurrentPoints(data.user.id);
    await fetchUserProfile(data.user.id); // 👈 enforceProfileCompletion runs only here
  }
});

onMounted(async () => {
  await fetchCountries();
  const { data } = await supabase.auth.getUser();
  if (data?.user) {
    const u = data.user;
    userEmail.value = u.email || "";
    userDisplayName.value =
        u.user_metadata?.full_name || u.user_metadata?.display_name || "";
    userAvatar.value = u.user_metadata?.avatar_url || "";

    // ✅ fetch initial points
    await fetchCurrentPoints(u.id);
  } else {
    userEmail.value = "";
    userDisplayName.value = "";
    userAvatar.value = "";
  }

  if (isAdmin.value) await fetchPendingCount();

  loading.value = false;

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const u = session.user;
      userEmail.value = u.email || "";
      userDisplayName.value =
          u.user_metadata?.full_name || u.user_metadata?.display_name || "";
      userAvatar.value = u.user_metadata?.avatar_url || "";

      // ✅ refresh points on login change
      fetchCurrentPoints(u.id);
    } else {
      userEmail.value = "";
      userDisplayName.value = "";
      userAvatar.value = "";
      currentPoints.value = null;
    }

    if (isAdmin.value) fetchPendingCount();
  });

  authSubscription = subscription;
});

onBeforeUnmount(() => {
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }
});

// Actions
const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (!error) {
    userEmail.value = "";
    currentPoints.value = null; // reset points
    router.push("/login");
  }
};
const goToReviewSubmissions = () => router.push("/admin/review-products");
const goToLogin = () => router.push("/login");
const goToSettings = () => router.push("/settings");
const goToLegal = () => router.push("/legal");
const goToCredits = () => router.push("/credits");
const goToPointsLogs = () => router.push("/admin/points-logs");
const goToEditProfile = () => router.push({ name: "EditProfile" });

</script>



<style scoped>
.profile-card {
  margin: 1rem auto;
  padding: 1rem 1rem;
  border-radius: 10px;
}

.avatar-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}
.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--ion-color-tertiary);
}

.profile-name h2 {
  margin: 0 0 0.25rem;
  font-weight: 700;
  color: var(--ion-color-tertiary);
}
.profile-email p {
  margin: 0 0 1.5rem;
  font-size: 1rem;
  color: var(--ion-color-medium);
}
.logout-button,
.login-prompt ion-button {
  margin-top: 1rem;
}
.login-prompt p {
  margin-bottom: 1rem;
  font-size: 1rem;
  color: var(--ion-color-medium);
}
.boba-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 44px;
  margin: 1rem auto;
  padding: 8px 16px;
  background-color: #ad5138;
  color: #f8e0be;
  border-radius: 12px;
  text-decoration: none;
  font-weight: bold;
}
.support-thank {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}
.profile-toolbar {
  --padding-start: 0;
  --padding-end: 0;
  --min-height: 40px;
}

.profile-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ion-color-dark);
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.social-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s ease;
  color: #fff;
}

.social-icon {
  width: 30px;
  height: 30px;
}


.social-button:hover {
  transform: translateY(-2px);
}

.social-button.instagram {
  background: linear-gradient(45deg, #f58529, #dd2a7b, #8134af, #515bd4);
}

.social-button.line {
  background-color: #06c755;
}

</style>
