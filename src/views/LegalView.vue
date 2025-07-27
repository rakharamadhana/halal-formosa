<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/profile" />
        </ion-buttons>
        <ion-title>Legal</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="coming-soon-container">
        <ion-text color="medium">
          <h2>🚧 This page is coming soon.</h2>
        </ion-text>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonText,
} from '@ionic/vue';
</script>

<style scoped>
.coming-soon-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
}
</style>
