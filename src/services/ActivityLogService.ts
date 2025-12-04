import { supabase } from '@/plugins/supabaseClient'

export class ActivityLogService {
    static async log(activity: string, detail: object = {}) {
        const user = (await supabase.auth.getUser()).data.user;

        if (!user) {
            console.warn("[ActivityLogService] No user logged in");
            return;
        }

        const { data, error } = await supabase
            .from("activity_log")
            .insert({
                user_id: user.id,
                activity_type: activity,   // 👈 flexible activity name
                activity_detail: detail,
            });

        if (error) console.error("[ActivityLogService] Error:", error);
        return { data, error };
    }
}
