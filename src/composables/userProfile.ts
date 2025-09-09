import {ref, computed} from 'vue'
import { supabase } from '@/plugins/supabaseClient'

export const isDonor = ref(false)
export const donorType = ref('Free')
export const userRole = ref<string | null>(null) // 👈 role from DB
export const isAdmin = computed(() => userRole.value === 'admin')
export const isContributor = computed(() => userRole.value === 'contributor')

// 🔹 New: Leaderboard privacy toggle
export const currentUser = ref<any | null>(null)
export const isPublicLeaderboard = ref<boolean | null>(null)

type UserProfileRow = {
    is_donor: boolean
    donor_type: string
    public_leaderboard: boolean
    user_roles: {
        role: string
    } | null
}

// Helpers to set values
export function setDonorStatus(value: boolean) {
    isDonor.value = value
    localStorage.setItem('is_donor', JSON.stringify(value))
}

export function setDonorType(value: string) {
    donorType.value = value
    localStorage.setItem('donor_type', value)
}

export function loadDonorFromCache() {
    const storedDonor = localStorage.getItem('is_donor')
    if (storedDonor !== null) {
        isDonor.value = JSON.parse(storedDonor)
    }
    const storedType = localStorage.getItem('donor_type')
    if (storedType) {
        donorType.value = storedType
    }
}

// Computed for badge display
export const donorBadge = computed(() => {
    const map: Record<string, { label: string; color: string; emoji: string }> = {
        Free: { label: 'Free', color: 'medium', emoji: '🙌' },
        'Founding Supporter': { label: 'Founding Supporter', color: 'tertiary', emoji: '💖' },
        Supporter: { label: 'Supporter', color: 'primary', emoji: '💖' },
        Developer: { label: 'Developer', color: 'tertiary', emoji: '🛠️' },
        Contributor: { label: 'Contributor', color: 'primary', emoji: '⭐️' }
    }

    return map[donorType.value] || map.Free
})

export function setUserRole(value: string | null) {
    userRole.value = value
    if (value) {
        localStorage.setItem('user_role', value)
    } else {
        localStorage.removeItem('user_role')
    }
}

export function loadUserRoleFromCache() {
    const storedRole = localStorage.getItem('user_role')
    if (storedRole) {
        userRole.value = storedRole
    }
}

// 🔹 New: Load leaderboard visibility from DB (once)
let loadedLeaderboard = false
export async function loadPublicLeaderboardFromDB() {
    if (loadedLeaderboard) return // ✅ prevent re-fetch
    loadedLeaderboard = true

    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return

    const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('public_leaderboard')
        .eq('id', userData.user.id)
        .single()

    if (!error && profile) {
        isPublicLeaderboard.value = profile.public_leaderboard ?? false
        localStorage.setItem('public_leaderboard', JSON.stringify(isPublicLeaderboard.value))
    }
}

// Called at app boot or on auth events
export async function loadUserProfile(userId: string) {
    const { data, error } = await supabase
        .from("user_profiles")
        .select(
            `
      is_donor,
      donor_type,
      public_leaderboard,
      user_roles (
        role
      )
    `
        )
        .eq("id", userId)
        .single<UserProfileRow>()   // 👈 tell TS the shape

    console.log("🔍 loadUserProfile response:", { data, error })

    if (!error && data) {
        setDonorStatus(data.is_donor)
        setDonorType(data.donor_type)
        setUserRole(data.user_roles?.role ?? null) // ✅ relation safe
        isPublicLeaderboard.value = data.public_leaderboard ?? false
        localStorage.setItem("public_leaderboard", JSON.stringify(isPublicLeaderboard.value))
    } else {
        console.warn("⚠️ No profile found, resetting defaults")
        isPublicLeaderboard.value = false
        setDonorStatus(false)
        setDonorType("Free")
        setUserRole(null)
    }
}

// 🔹 New: Update leaderboard visibility
export async function setPublicLeaderboard(value: boolean) {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return

    const { error } = await supabase
        .from('user_profiles')
        .update({ public_leaderboard: value })
        .eq('id', userData.user.id)

    if (!error) {
        isPublicLeaderboard.value = value     // ✅ sync local state
        localStorage.setItem('public_leaderboard', JSON.stringify(value))
    } else {
        console.error("❌ Failed to update public_leaderboard:", error)
    }
}


// 🔹 New: Load cached visibility instantly
export function loadPublicLeaderboardFromCache() {
    const stored = localStorage.getItem('public_leaderboard')
    if (stored !== null) {
        isPublicLeaderboard.value = JSON.parse(stored)
    }
}
