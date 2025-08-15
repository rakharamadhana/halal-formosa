import { ref, nextTick } from 'vue'
import type { IngredientHighlight } from '@/types/ingredients'
import { extractIonColor } from '@/utils/ingredientHelpers'

export interface BlacklistPattern {
    pattern: string
}

export interface OcrPipelineOptions {
    incrementDisclaimerCount: () => void
    incrementUsageCount: () => number
    fetchHighlightsWithCache: (force?: boolean) => Promise<{
        highlights: IngredientHighlight[]
        blacklist: { pattern: string }[]
    } | null>
    setError: (msg: string) => void
}

export default function useOcrPipeline({
                                           incrementDisclaimerCount,
                                           incrementUsageCount,
                                           fetchHighlightsWithCache,
                                           setError
                                       }: OcrPipelineOptions) {

    // ✅ State lives inside composable now
    const allHighlights = ref<IngredientHighlight[]>([])
    const blacklistPatterns = ref<RegExp[]>([])
    const ingredientHighlights = ref<IngredientHighlight[]>([])
    const autoStatus = ref('')
    const productName = ref('')
    const ingredientsText = ref('')
    const showOk = ref(false)

    async function runOcr(file: File) {
        incrementDisclaimerCount()
        incrementUsageCount()
        const data = await fetchHighlightsWithCache()
        if (data) {
            allHighlights.value = data.highlights
            blacklistPatterns.value = data.blacklist.map(b => new RegExp(b.pattern, 'gi'))
        }

        const raw = await extractTextFromImage(file)
        if (!raw) return setError('OCR failed to detect any text.')

        const cleanedZh = cleanChineseOcrText(raw)
        const translated = await translateToEnglish(cleanedZh)
        if (translated === null) return

        if (!translated.toLowerCase().includes('ingredient')) {
            return setError('Ingredients not detected. Please crop the ingredients section.')
        }

        productName.value = extractProductName(translated) || ''
        ingredientsText.value = cleanTranslatedIngredients(translated)

        await nextTick()
        await recheckHighlights()

        showOk.value = true
        incrementDisclaimerCount()
        const count = incrementUsageCount()

        if (count >= 5) {
            const fresh = await fetchHighlightsWithCache(true)
            if (fresh) {
                allHighlights.value = fresh.highlights
                blacklistPatterns.value = fresh.blacklist.map(
                    (row: BlacklistPattern) => new RegExp(row.pattern, 'gi')
                )
            }
        }
    }

    function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("timeout")), ms)
            promise
                .then((value) => {
                    clearTimeout(timer)
                    resolve(value)
                })
                .catch((err) => {
                    clearTimeout(timer)
                    reject(err)
                })
        })
    }

    async function extractTextFromImage(file: File) {
        try {
            const apiKey = import.meta.env.VITE_OCR_SPACE_API_KEY as string
            const formData = new FormData()
            formData.append('file', file)
            formData.append('apikey', apiKey)
            formData.append('language', 'auto')
            formData.append('isOverlayRequired', 'false')
            formData.append('scale', 'true')
            formData.append('OCREngine', '2')

            const res = await withTimeout(
                fetch('https://api.ocr.space/parse/image', {
                    method: 'POST',
                    body: formData
                }),
                10000
            )

            const json = await res.json()

            if (json?.IsErroredOnProcessing) {
                const errMsgText = Array.isArray(json.ErrorMessage)
                    ? json.ErrorMessage.join(', ')
                    : (json.ErrorMessage || 'OCR server error')
                setError(`OCR Server is busy: ${errMsgText}`)
                return ''
            }

            return json?.ParsedResults?.[0]?.ParsedText || ''
        } catch (e: any) {
            if (e.message === 'timeout') {
                setError('OCR server is busy, please try again later.')
            } else {
                setError('Failed to connect to OCR server. Please try again later.')
            }
            console.error(e)
            return ''
        }
    }

    async function translateToEnglish(text: string) {
        try {
            const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATION_API_KEY as string
            const res = await withTimeout(
                fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        q: text,
                        source: 'zh',
                        target: 'en',
                        format: 'text'
                    }),
                }),
                10000
            )

            const json = await res.json()

            if (!json?.data?.translations?.[0]?.translatedText) {
                const errMsgText = json?.error?.message || 'Translation service returned no result'
                setError(`Translation server error: ${errMsgText}`)
                return null
            }

            return json.data.translations[0].translatedText
        } catch (e: any) {
            if (e.message === 'timeout') {
                setError('Translation server is busy, please try again later.')
            } else {
                setError('Failed to connect to translation server. Please try again later.')
            }
            return null
        }
    }

    function cleanChineseOcrText(text: string) {
        let cleaned = text
            .replace(/\r?\n+/g, ', ')
            .replace(/[。、．]/g, ',')
            .replace(/\s{2,}/g, ' ')
            .replace(/品\s*,?\s*名/gi, '品名')
            .replace(/成\s*,?\s*分/gi, '成分')

        for (const pattern of blacklistPatterns.value) {
            cleaned = cleaned.replace(pattern, '').trim()
        }
        cleaned = cleaned.replace(/品名[:：].*?,/i, '')
        cleaned = cleaned.replace(/成分[:：]/i, 'Ingredients: ')
        cleaned = cleaned.replace(/,\s*,+/g, ', ').replace(/^,|,$/g, '')
        return cleaned.trim()
    }

    function toProperCase(s: string) {
        return s.replace(/\w\S*/g, (txt) => txt[0].toUpperCase() + txt.slice(1).toLowerCase())
    }

    function cleanTranslatedIngredients(text: string) {
        const idx = text.toLowerCase().indexOf('ingredients:')
        let extracted = idx !== -1 ? text.substring(idx + 'ingredients:'.length).trim() : text
        extracted = extracted.replace(/\n+/g, ', ').replace(/\s{2,}/g, ' ')
        blacklistPatterns.value.forEach((p) => (extracted = extracted.replace(p, '').trim()))

        let parts = extracted.split(',').map(p => p.trim()).filter(Boolean)
        parts = parts.filter(p => !/^\d+\s*(g|kg|ml|毫升|公克)$/i.test(p))
        if (parts.length && /^[A-Z][a-z]+.*\d+.*$/i.test(parts[0])) parts.shift()
        parts = parts.filter(p => !/^[(),]+$/.test(p))

        return parts.map(toProperCase).join(', ').replace(/[\s,]+$/g, '').replace(/\(\s*$/g, '')
    }

    function extractProductName(text: string) {
        const normalized = text
            .replace(/：/g, ':')
            .replace(/\u3000/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\bEnd\.\s*/i, '')
            .trim()

        const clean = (s: string) =>
            toProperCase(
                s.replace(/[™®©]+/g, '').replace(/\*+$/g, '').trim()
            )

        const m1 = /(product\s*name|product|name|item|品名|品項)\s*:\s*(.+?)(?=\s*(ingredients?\s*:|$|[.;\n\r]))/i.exec(normalized)
        if (m1?.[2]) {
            const cand = clean(m1[2])
            if (cand.length > 2) return cand
        }

        const beforeIngredients = normalized.split(/ingredients?\s*:/i)[0] || ''
        const m2 = /(?:^|\b)product\s+(.{3,120}?)(?=\s*(?:[.;\n]|$))/i.exec(beforeIngredients)
        if (m2?.[1]) {
            const cand = clean(m2[1])
            if (cand.length > 2) return cand
        }

        if (beforeIngredients.trim()) {
            const cand = clean(beforeIngredients.split(/[.;\n]/)[0])
            if (/\w/.test(cand) && /\s/.test(cand) && cand.length > 2) return cand
        }

        return ''
    }

    async function recheckHighlights() {
        const raw = ingredientsText.value.trim()
        if (!raw || !allHighlights.value.length) {
            ingredientHighlights.value = []
            autoStatus.value = ''
            return
        }

        const parts = raw.split(/\s*,\s*/).map(x => x.trim()).filter(Boolean)
        if (parts.length === 0) {
            ingredientHighlights.value = []
            autoStatus.value = ''
            return
        }

        const highlights = [...allHighlights.value].sort((a, b) => b.keyword.length - a.keyword.length)
        const found: IngredientHighlight[] = []
        const seen = new Set<string>()

        for (const ing of parts) {
            const low = ing.toLowerCase()
            const m = highlights.find(h =>
                low === h.keyword.toLowerCase() || low.includes(h.keyword.toLowerCase())
            )
            if (m && !seen.has(m.keyword.toLowerCase())) {
                seen.add(m.keyword.toLowerCase())
                found.push({ keyword: ing, keyword_zh: m.keyword_zh, color: m.color })
            }
        }
        ingredientHighlights.value = found

        const hasHaram = found.some(h => extractIonColor(h.color) === 'danger')
        const hasSyubhah = found.some(h => extractIonColor(h.color) === 'warning')

        if (hasHaram) {
            autoStatus.value = 'Haram'
        } else if (hasSyubhah) {
            autoStatus.value = 'Syubhah'
        } else {
            autoStatus.value = 'Muslim-friendly'
        }
    }

    return {
        runOcr,
        recheckHighlights,
        allHighlights,
        ingredientHighlights,
        blacklistPatterns,
        autoStatus,
        productName,
        ingredientsText,
        showOk
    }
}
