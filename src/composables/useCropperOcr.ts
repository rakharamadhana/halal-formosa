// composables/useCropperOcr.ts
import { ref } from "vue"
import { useOcrService } from "@/composables/useOcrService"
import { useImageResizer } from "@/composables/useImageResizer"

export function useCropperOcr(options: any) {
    const { resizeImage } = useImageResizer()

    const cropperRef = ref<any>(null)
    const cropperSrc = ref<string | null>(null)
    const showCropper = ref(false)
    const croppedPreviewUrl = ref<string | null>(null)
    const ocrLoading = ref(false)

    // 🔹 NEW: keep track of original uncropped file
    const originalFile = ref<File | null>(null)

    // pipeline refs from OCR service
    const {
        processFile,
        recheckHighlightsSmart,
        ingredientHighlights,
        ingredientsText,
        ingredientsTextZh,
        autoStatus,
        productName,
        showOk,
    } = useOcrService(options)

    function openCropper(file: File) {
        if (cropperSrc.value) URL.revokeObjectURL(cropperSrc.value)
        originalFile.value = file // ✅ keep reference
        cropperSrc.value = URL.createObjectURL(file)
        showCropper.value = true
    }

    async function confirmCrop() {
        if (!cropperRef.value) return
        const result = cropperRef.value.getResult()
        if (!result?.canvas) return

        ocrLoading.value = true
        try {
            // --- Cropped blob for OCR ---
            const blob = await new Promise<Blob | null>((resolve) =>
                result.canvas.toBlob((b: Blob | null) => resolve(b), "image/jpeg", 0.9)
            )
            if (!blob) return

            if (croppedPreviewUrl.value) URL.revokeObjectURL(croppedPreviewUrl.value)
            croppedPreviewUrl.value = URL.createObjectURL(blob)

            const croppedFile = new File([blob], `cropped-${Date.now()}.jpg`, {
                type: "image/jpeg",
            })

            // Compress cropped for OCR
            const resizedCropped = await resizeImage(croppedFile)
            await processFile(resizedCropped)

            // --- 🔹 Also prepare compressed original for back image ---
            if (originalFile.value) {
                const resizedBack = await resizeImage(originalFile.value)
                options?.setBackFile?.(resizedBack) // ✅ caller can inject setter
            }
        } finally {
            ocrLoading.value = false
            showCropper.value = false
        }
    }

    function reset() {
        cropperSrc.value = null
        showCropper.value = false
        if (croppedPreviewUrl.value) {
            URL.revokeObjectURL(croppedPreviewUrl.value)
            croppedPreviewUrl.value = null
        }
        ingredientHighlights.value = []
        ingredientsText.value = ""
        ingredientsTextZh.value = ""
        productName.value = ""
        autoStatus.value = ""
        originalFile.value = null
    }

    function closeCropper() {
        if (cropperSrc.value) {
            URL.revokeObjectURL(cropperSrc.value)
            cropperSrc.value = null
        }
        showCropper.value = false
    }

    function recrop() {
        if (!originalFile.value) return
        if (cropperSrc.value) URL.revokeObjectURL(cropperSrc.value)
        cropperSrc.value = URL.createObjectURL(originalFile.value)
        showCropper.value = true
    }

    return {
        cropperRef,
        cropperSrc,
        showCropper,
        croppedPreviewUrl,
        ocrLoading,
        openCropper,
        confirmCrop,
        closeCropper,
        recrop,
        reset,
        showOk,
        ingredientHighlights,
        ingredientsText,
        ingredientsTextZh,
        autoStatus,
        productName,
        recheckHighlightsSmart,
    }
}
