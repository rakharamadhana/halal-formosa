import { supabase } from '@/plugins/supabaseClient'
import { setDonorStatus, setDonorType } from '@/composables/userProfile'

export async function fetchDonorStatus(userId: string) {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('is_donor, donor_type')
            .eq('id', userId)
            .maybeSingle()

        if (error) {
            console.error('❌ Error fetching donor status:', error.message)
            return
        }

        if (data) {
            setDonorStatus(data.is_donor)
            setDonorType(data.donor_type)
        } else {
            console.warn('⚠️ No donor data found for userId:', userId)
        }
    } catch (err) {
        console.error('💥 fetchDonorStatus failed:', err)
    }
}
