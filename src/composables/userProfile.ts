import { ref, computed } from 'vue';

export const isDonor = ref(false);
export const donorType = ref('Free');

// Helpers to set values
export function setDonorStatus(value: boolean) {
    isDonor.value = value;
    localStorage.setItem('is_donor', JSON.stringify(value));
}

export function setDonorType(value: string) {
    donorType.value = value;
    localStorage.setItem('donor_type', value);
}

export function loadDonorFromCache() {
    const storedDonor = localStorage.getItem('is_donor');
    if (storedDonor !== null) {
        isDonor.value = JSON.parse(storedDonor);
    }
    const storedType = localStorage.getItem('donor_type');
    if (storedType) {
        donorType.value = storedType;
    }
}

// Computed for badge display
export const donorBadge = computed(() => {
    const map: Record<string, { label: string; color: string; emoji: string }> = {
        Free: { label: 'Free', color: 'medium', emoji: '🙌' },
        'Founding Supporter': { label: 'Founding Supporter', color: 'tertiary', emoji: '💖' },
        Supporter: { label: 'Supporter', color: 'primary', emoji: '💖' },
        Developer: { label: 'Developer', color: 'tertiary', emoji: '🛠️' },

    };

    // Fallback to "Free" if type not found
    return map[donorType.value] || map.Free;
});
