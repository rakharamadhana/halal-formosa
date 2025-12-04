// src/plugins/revenuecat.ts
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export async function initRevenueCat(userId?: string) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

    const apiKey = ""

    await Purchases.configure({ apiKey });

    if (userId) {
        await Purchases.logIn({ appUserID: userId });
    }

    console.log("📦 RevenueCat configured!");
}
