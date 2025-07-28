<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
  <Analytics mode="production" />
  <SpeedInsights/>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import {supabase} from "@/plugins/supabaseClient";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/vue'

async function assignDefaultRole(userId: string) {
  try {
    const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

    if (!existingRole) {
      console.log('No existing role found, assigning default role "user"');
      const { error: insertError } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: 'user' }]);

      if (insertError) {
        console.error('Error inserting default role:', insertError);
      } else {
        console.log('Default role "user" assigned successfully');
      }
    }
  } catch (error) {
    console.error('Unexpected error in assignDefaultRole:', error);
  }
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    await assignDefaultRole(session.user.id);
  }
});
</script>
