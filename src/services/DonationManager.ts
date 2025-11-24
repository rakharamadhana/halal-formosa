import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { Capacitor } from '@capacitor/core';

export class DonationManager {
    donationIds = [
        'small-support',
        'medium-support',
        'large-support',
    ];

    products: any[] = [];
    isNative = Capacitor.isNativePlatform();

    async initialize() {
        if (!this.isNative) {
            console.warn("Billing not available on Web – skipping initialization.");
            return;
        }

        try {
            const { isBillingSupported } = await NativePurchases.isBillingSupported();

            if (!isBillingSupported) {
                throw new Error("Billing not supported on this device");
            }

            await this.loadProducts();
        } catch (err) {
            console.error("Donation init failed:", err);
        }
    }

    async loadProducts() {
        if (!this.isNative) return [];

        try {
            const { products } = await NativePurchases.getProducts({
                productIdentifiers: this.donationIds,
                productType: PURCHASE_TYPE.INAPP
            });

            this.products = products.sort((a, b) => a.price - b.price);
            return products;
        } catch (err) {
            console.error("Failed loading donation products:", err);
        }
    }

    async donate(productId: string) {
        if (!this.isNative) {
            alert("In-app purchases are only available on Android/iOS.");
            return { success: false };
        }

        try {
            const result = await NativePurchases.purchaseProduct({
                productIdentifier: productId,
                productType: PURCHASE_TYPE.INAPP,
                quantity: 1
            });

            return {
                success: true,
                transactionId: result.transactionId,
                productId: result.productIdentifier
            };

        } catch (err: any) {
            console.error("Donation failed:", err);

            if (err.message?.includes("User cancelled")) {
                return { success: false, cancelled: true };
            }
            return { success: false, error: err };
        }
    }
}
