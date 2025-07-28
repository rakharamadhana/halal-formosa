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
      <ion-accordion-group expand="first">
        <!-- Terms of Service -->
        <ion-accordion value="tos">
          <ion-item slot="header" color="light">
            <ion-label>Terms of Service</ion-label>
          </ion-item>
          <div slot="content" class="ion-padding">
            <TermsOfService />
          </div>
        </ion-accordion>

        <!-- Privacy Policy -->
        <ion-accordion value="privacy">
          <ion-item slot="header" color="light">
            <ion-label>Privacy Policy</ion-label>
          </ion-item>
          <div slot="content" class="ion-padding">
            <PrivacyPolicy />
          </div>
        </ion-accordion>
      </ion-accordion-group>
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
  IonItem,
  IonLabel,
  IonAccordion,
  IonAccordionGroup,
} from '@ionic/vue';
import TermsOfService from "@/components/TermsOfService.vue";
import PrivacyPolicy from "@/components/PrivacyPolicy.vue";
</script>

<style scoped>
h3 {
  margin-top: 16px;
  font-size: 18px;
  font-weight: bold;
}
p {
  margin-bottom: 12px;
  font-size: 15px;
  line-height: 1.6;
}
</style>
