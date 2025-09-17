import { supabase } from "@/plugins/supabaseClient";

export function useNotifier() {
    const notifyDiscord = async (
        action: string,
        details: string,
        image?: string
    ) => {
        try {
            // 🔑 Get current session
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                console.warn("⚠️ No session found, skipping notifyDiscord");
                return { success: false, error: "Not authenticated" };
            }

            // 🔗 Call Edge Function
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-discord`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`, // 👈 pass session token
                    },
                    body: JSON.stringify({ action, details, image }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ notifyDiscord failed:", errorText);
                return { success: false, error: errorText };
            }

            return { success: true };
        } catch (err: any) {
            console.error("❌ notifyDiscord exception:", err);
            return { success: false, error: String(err) };
        }
    };

    return { notifyDiscord };
}
