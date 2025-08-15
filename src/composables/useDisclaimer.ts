import { ref } from 'vue'
import router from '@/router'

export default function useDisclaimer() {
    const showSimpleDisclaimer = ref(false)
    const showDetailedDisclaimer = ref(false)

    const DISCLAIMER_ACK_KEY = 'disclaimerAccepted'
    const DISCLAIMER_COUNT_KEY = 'disclaimerScanCount'

    /** Check if disclaimer should be shown */
    function maybeShowDisclaimer() {
        const accepted = localStorage.getItem(DISCLAIMER_ACK_KEY) === 'true'
        const count = parseInt(localStorage.getItem(DISCLAIMER_COUNT_KEY) || '0', 10)

        if (!accepted || count >= 5) {
            // reset reminder count if showing disclaimer again
            if (count >= 5) localStorage.setItem(DISCLAIMER_COUNT_KEY, '0')
            showSimpleDisclaimer.value = true
            return true // means "modal is showing, wait for user action"
        }
        return false
    }

    /** Show the detailed "How it works" modal */
    function showDetails() {
        showDetailedDisclaimer.value = true
    }

    /** User agrees to disclaimer */
    function acceptDisclaimer() {
        localStorage.setItem(DISCLAIMER_ACK_KEY, 'true')
        localStorage.setItem(DISCLAIMER_COUNT_KEY, '0')
        showSimpleDisclaimer.value = false
    }

    /** Close the detailed modal */
    function closeDetailedDisclaimer() {
        showDetailedDisclaimer.value = false
    }

    /** User declines disclaimer */
    function declineDisclaimer() {
        localStorage.removeItem(DISCLAIMER_ACK_KEY)
        showSimpleDisclaimer.value = false
        router.push('/home')
    }

    /** Increment usage counter */
    function incrementDisclaimerCount() {
        let count = parseInt(localStorage.getItem(DISCLAIMER_COUNT_KEY) || '0', 10)
        count++
        localStorage.setItem(DISCLAIMER_COUNT_KEY, count.toString())
    }

    return {
        showSimpleDisclaimer,
        showDetailedDisclaimer,
        maybeShowDisclaimer,
        showDetails,
        acceptDisclaimer,
        closeDetailedDisclaimer,
        declineDisclaimer,
        incrementDisclaimerCount
    }
}
