import { ref, computed } from "vue";
import { supabase } from "@/plugins/supabaseClient";

/* ---------------- Core donor/role ---------------- */
export const isDonor = ref(false);
export const donorType = ref("Free");
export const userRole = ref<string | null>(null);
export const isAdmin = computed(() => userRole.value === "admin");
export const isContributor = computed(() => userRole.value === "contributor");

// Leaderboard privacy
export const currentUser = ref<any | null>(null);
export const isPublicLeaderboard = ref<boolean | null>(null);

/* ---------------- Profile fields ---------------- */
export const editDOB = ref<string | null>(null);
export const editNationality = ref<string | null>(null);
export const editGender = ref<string | null>(null);
export const editBio = ref<string | null>(null);

export const selectedCountry = ref<any | null>(null); // for display
export const acknowledged = ref(false);

export const isProfileComplete = computed(() => {
    return (
        acknowledged.value &&
        !!editDOB.value &&
        !!editNationality.value &&
        !!editGender.value &&
        !!editBio.value?.trim()
    );
});

/* ---------------- Types ---------------- */
type UserProfileRow = {
    is_donor: boolean;
    donor_type: string;
    public_leaderboard: boolean;
    date_of_birth: string | null;
    nationality: string | null;
    gender: string | null;
    bio: string | null;
    user_roles: {
        role: string;
    } | null;
};

/* ---------------- Leaderboard privacy ---------------- */
export async function setPublicLeaderboard(value: boolean) {
    isPublicLeaderboard.value = value;
    localStorage.setItem("public_leaderboard", JSON.stringify(value));

    if (!currentUser.value?.id) {
        console.warn("⚠️ No currentUser, skipping DB update");
        return;
    }

    const { error } = await supabase
        .from("user_profiles")
        .update({ public_leaderboard: value })
        .eq("id", currentUser.value.id);

    if (error) {
        console.error("❌ Failed to update public_leaderboard", error);
    } else {
        console.log("✅ public_leaderboard updated:", value);
    }
}


/* ---------------- Donor helpers ---------------- */
export function setDonorStatus(value: boolean) {
    isDonor.value = value;
    localStorage.setItem("is_donor", JSON.stringify(value));
}
export function setDonorType(value: string) {
    donorType.value = value;
    localStorage.setItem("donor_type", value);
}
export function loadDonorFromCache() {
    const storedDonor = localStorage.getItem("is_donor");
    if (storedDonor !== null) {
        isDonor.value = JSON.parse(storedDonor);
    }
    const storedType = localStorage.getItem("donor_type");
    if (storedType) {
        donorType.value = storedType;
    }
}
export const donorBadge = computed(() => {
    const map: Record<string, { label: string; color: string; emoji: string }> = {
        Free: { label: "Free", color: "medium", emoji: "🙌" },
        "Founding Supporter": { label: "Founding Supporter", color: "tertiary", emoji: "💖" },
        Supporter: { label: "Supporter", color: "primary", emoji: "💖" },
        Developer: { label: "Developer", color: "tertiary", emoji: "🛠️" },
        Contributor: { label: "Contributor", color: "primary", emoji: "⭐️" }
    };
    return map[donorType.value] || map.Free;
});

/* ---------------- Role helpers ---------------- */
export function setUserRole(value: string | null) {
    userRole.value = value;
    if (value) {
        localStorage.setItem("user_role", value);
    } else {
        localStorage.removeItem("user_role");
    }
}
export function loadUserRoleFromCache() {
    const storedRole = localStorage.getItem("user_role");
    if (storedRole) {
        userRole.value = storedRole;
    }
}

/* ---------------- Profile load/save ---------------- */
export async function loadUserProfile(userId: string) {
    const { data, error } = await supabase
        .from("user_profiles")
        .select(
            `
      is_donor,
      donor_type,
      public_leaderboard,
      date_of_birth,
      nationality,
      gender,
      bio,
      user_roles (
        role
      )
    `
        )
        .eq("id", userId)
        .single<UserProfileRow>();

    console.log("🔍 loadUserProfile response:", { data, error });

    if (!error && data) {
        setDonorStatus(data.is_donor);
        setDonorType(data.donor_type);
        setUserRole(data.user_roles?.role ?? null);
        isPublicLeaderboard.value = data.public_leaderboard ?? false;
        localStorage.setItem("public_leaderboard", JSON.stringify(isPublicLeaderboard.value));

        // 🔹 hydrate profile fields
        editDOB.value = data.date_of_birth;
        editNationality.value = data.nationality;
        editGender.value = data.gender;
        editBio.value = data.bio;
    } else {
        console.warn("⚠️ No profile found, resetting defaults");
        isPublicLeaderboard.value = false;
        setDonorStatus(false);
        setDonorType("Free");
        setUserRole(null);

        editDOB.value = null;
        editNationality.value = null;
        editGender.value = null;
        editBio.value = null;
    }
}

export async function updateUserProfile(userId: string) {
    const { error } = await supabase
        .from("user_profiles")
        .update({
            date_of_birth: editDOB.value,
            nationality: editNationality.value,
            gender: editGender.value,
            bio: editBio.value
        })
        .eq("id", userId);

    if (error) {
        console.error("❌ updateUserProfile failed", error);
    }
}

export function loadPublicLeaderboardFromCache() {
    const stored = localStorage.getItem('public_leaderboard')
    if (stored !== null) {
        isPublicLeaderboard.value = JSON.parse(stored)
    }
}
