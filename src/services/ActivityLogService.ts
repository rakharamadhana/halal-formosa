import {supabase} from '@/plugins/supabaseClient'
import SessionService from '@/services/SessionService'

// 🔧 TEMPORARY GLOBAL SWITCH
const ACTIVITY_LOG_ENABLED = true

/* -------------------------
   Types
-------------------------- */
type EntityResult = {
    entity_type: string | null
    entity_id: string | null
}

/* -------------------------
   Helpers
-------------------------- */
function normalizeDetail(detail: any): Record<string, any> {
    return detail && typeof detail === 'object' ? detail : {}
}

function resolveEntity(activity: string, rawDetail: any): EntityResult {
    const detail = normalizeDetail(rawDetail)

    switch (activity) {

        // 🟢 PLACE interactions
        case 'home_location_click':
        case 'explore_share_place':
        case 'explore_place_detail_view':
        case 'explore_place_detail_open':
        case 'explore_detail_open_image':
        case 'explore_place_card_click':
        case 'explore_detail_open_maps':
        case 'explore_marker_click':
        case 'explore_detail_edit':
            return {
                entity_type: 'place',
                entity_id: detail.id ? String(detail.id) : null
            }

        // 🟢 PRODUCT interactions
        case 'barcode_scan_success':
        case 'product_details_open':
        case 'search_product_click':
        case 'home_product_click':
        case 'product_image_open':
        case 'related_product_click': {
            const raw =
                detail.barcode ??
                detail.clicked_barcode ??
                null

            return {
                entity_type: 'product',
                entity_id: raw != null ? String(raw) : null
            }
        }

        case 'trip_open':
            return {
                entity_type: 'trip',
                entity_id: detail.trip_id
                    ? String(detail.trip_id)
                    : null
            }


        // 🟢 SEARCH FILTER interactions
        case 'search_filter_category':
            return {
                entity_type: 'category',
                entity_id: detail.category_id
                    ? String(detail.category_id)
                    : null
            }

        case 'search_filter_store':
            return {
                entity_type: 'store',
                entity_id: detail.store_id ?? null
            }

        // Optional: keep status as non-entity
        case 'search_filter_status':
            return {
                entity_type: null,
                entity_id: null
            }

        // 🟢 CATEGORY interactions
        case 'explore_filter_category':
            return {
                entity_type: 'category',
                entity_id: detail.category_id
                    ? String(detail.category_id)
                    : null
            }

        // 🟢 USER-to-USER interactions
        case 'home_leaderboard_profile':
            return {
                entity_type: 'user',
                entity_id: detail.user_id ?? null
            }

        // 🟢 USER
        case 'profile_page_open':
        case 'profile_edit_open':
        case 'profile_logout':
            return {
                entity_type: 'user',
                entity_id: detail.user_id ?? null
            }

// 🟢 MONETIZATION
        case 'pro_paywall_open':
        case 'pro_purchase_success':
            return {
                entity_type: 'entitlement',
                entity_id: detail.entitlement ?? 'Halal Formosa Pro'
            }

// 🟢 DONATION
        case 'donation_click':
        case 'donation_success':
            return {
                entity_type: 'product',
                entity_id: detail.product ?? null
            }

// 🟢 SOCIAL
        case 'social_link_click':
            return {
                entity_type: 'external_link',
                entity_id: detail.platform ?? null
            }


        // ❌ Everything else
        default:
            return {
                entity_type: null,
                entity_id: null
            }
    }
}

function resolveActivityGroup(activity: string): string | null {
    switch (activity) {

        /* -------------------------
           HOME SURFACE
        -------------------------- */
        case 'home_page_open':
        case 'home_scan_barcode':
        case 'home_product_click':
        case 'home_location_click':
            return 'home'

        /* -------------------------
           SEARCH SURFACE
        -------------------------- */
        case 'search_page_open':
        case 'search_product_click':
        case 'search_filter_category':
        case 'search_filter_store':
        case 'search_filter_status':
        case 'search_sort_change':
            return 'search'

        /* -------------------------
           PRODUCT EXPERIENCE
        -------------------------- */
        case 'barcode_scan_start':
        case 'barcode_scan_success':
        case 'product_details_open':
        case 'product_image_open':
        case 'related_product_click':
            return 'product'

        /* -------------------------
           EXPLORE / MAP EXPERIENCE
        -------------------------- */
        case 'explore_page_open':
        case 'explore_center_user':
        case 'explore_place_card_click':
        case 'explore_marker_click':
            return 'explore'

        /* -------------------------
           PLACE EXPERIENCE
        -------------------------- */
        case 'explore_place_detail_view':
        case 'explore_place_detail_open':
        case 'explore_detail_open_image':
        case 'explore_detail_open_maps':
        case 'explore_detail_edit':
        case 'explore_share_place':
            return 'place'

        /* -------------------------
           TRIP
        -------------------------- */
        case 'trip_open':
        case 'trip_search':
            return 'trip'

        /* -------------------------
           PROFILE
        -------------------------- */
        case 'profile_page_open':
        case 'profile_edit_open':
        case 'profile_logout':
            return 'profile'

        /* -------------------------
           MONETIZATION
        -------------------------- */
        case 'pro_paywall_open':
        case 'pro_purchase_success':
        case 'pro_paywall_trigger':
        case 'donation_click':
        case 'donation_success':
            return 'monetization'

        /* -------------------------
           SOCIAL / OUTBOUND
        -------------------------- */
        case 'social_link_click':
            return 'social'

        /* -------------------------
           FALLBACK
        -------------------------- */
        default:
            return null
    }
}

/* -------------------------
   Service
-------------------------- */
export class ActivityLogService {
    static async log(activity: string, detail: any = {}) {

        // 🚫 HARD STOP (no Supabase, no auth, no side effects)
        if (!ACTIVITY_LOG_ENABLED) {
            console.log("[ActivityLogService] Skipped")
            return
        }

        const user = (await supabase.auth.getUser()).data.user
        const session_id = SessionService.getSessionId()

        if (!user) {
            console.warn('[ActivityLogService] No user logged in')
            return
        }

        const { entity_type, entity_id } = resolveEntity(activity, detail)

        if (entity_type && !entity_id) {
            console.warn(
                `[ActivityLogService] Missing entity_id for activity "${activity}"`,
                detail
            )
        }

        const activity_group = resolveActivityGroup(activity)

        const payload = {
            user_id: user.id,
            session_id,
            activity_type: activity,
            activity_group,
            activity_detail: detail,
            entity_type,
            entity_id
        }

        const { error } = await supabase
            .from('activity_log')
            .insert(payload)

        if (error) {
            console.error('[ActivityLogService] Insert error:', error)
        }
    }
}
