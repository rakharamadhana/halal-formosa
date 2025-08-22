import { Ref, ref, nextTick } from 'vue'
import type { IngredientHighlight } from '@/types/ingredients'
import { extractIonColor } from '@/utils/ingredientHelpers'

export interface BlacklistPattern {
    pattern: string
}

export interface OcrPipelineOptions {
    allHighlights: Ref<IngredientHighlight[]>
    blacklistPatterns: Ref<RegExp[]>
    incrementDisclaimerCount?: () => void   // <-- make optional
    incrementUsageCount: () => number
    fetchHighlightsWithCache: (force?: boolean) => Promise<{
        highlights: IngredientHighlight[]
        blacklist: { pattern: string }[]
    } | null>
    setError: (msg: string) => void
}

export default function useOcrPipeline({
                                           allHighlights,
                                           blacklistPatterns,
                                           incrementDisclaimerCount,
                                           incrementUsageCount,
                                           fetchHighlightsWithCache,
                                           setError,
                                       }: OcrPipelineOptions) {
    const ingredientHighlights = ref<IngredientHighlight[]>([])
    const ingredientsTextZh = ref('')
    const autoStatus = ref('')
    const productName = ref('')
    const ingredientsText = ref('')
    const showOk = ref(false)
    const detectedLanguage = ref<'chinese' | 'english' | 'mixed' | 'unknown'>('unknown')

    function normalizeIngredients(text: string): string {
        return text
            // Existing normalizations
            .replace(/起士[\s,]+粉/g, "起士粉")
            .replace(/奶[\s,]+精/g, "奶精")
            .replace(/味[\s,]+醂/g, "味醂")
            .replace(/牛[\s,]+奶/g, "牛奶")
            .replace(/豬[\s,]+油/g, "豬油")
            .replace(/雞[\s,]+精/g, "雞精")

            // 🔧 New typo corrections for OCR errors
            .replace(/起土/g, "起士")   // soil → scholar
            .replace(/土\s*粉/g, "士粉") // fix 起土 粉 → 起士粉
    }

    async function runOcr(file: File) {
        try {
            incrementDisclaimerCount!()

            const data = await fetchHighlightsWithCache()
            if (data) {
                allHighlights.value = data.highlights
                blacklistPatterns.value = data.blacklist.map(b => new RegExp(b.pattern, 'gi'))
            }

            const raw = await extractTextFromImage(file)
            if (!raw) return setError('OCR failed to detect any text.')
            // console.log('📄 Raw OCR text detected:', raw)

            detectedLanguage.value = detectLanguage(raw)
            // console.log('🌐 OCR detected language:', detectedLanguage.value)

            let translated = ''
            let cleanedZh = raw

            if (detectedLanguage.value === 'english') {
                translated = raw
            } else {
                cleanedZh = cleanChineseOcrText(raw)
                cleanedZh = normalizeIngredients(cleanedZh) // 🔧 normalize splits
                ingredientsTextZh.value = cleanedZh

                console.log('Cleaned Chinese: ', cleanedZh)

                const result = await translateToEnglish(cleanedZh)
                if (result === null) return
                translated = result
            }

            // ✅ Check first, before processing further
            if (!translated.toLowerCase().includes('ingredient')) {
                return setError('Ingredients not detected. Please crop the ingredients section.')
            }

            // Now safe to continue
            ingredientsText.value = cleanTranslatedIngredients(translated)
            productName.value = extractProductName(translated) || ''
            console.log("Translated Chinese: ", translated)

            await nextTick()
            // ✅ Run dual highlight checks
            await recheckHighlights(cleanedZh)

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
            showOk.value = true
        } catch (e) {
            setError('OCR failed.')
        }
    }

    function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('timeout')), ms)
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
            const base64 = await fileToBase64(file)
            const res = await withTimeout(
                fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ocr`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ imageBase64: base64 })
                }),
                15000
            )
            const json = await res.json()
            if (!res.ok || json.error) {
                setError(`OCR failed: ${json.error || 'Google OCR server error'}`)
                return ''
            }
            return json.text || ''
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

    function fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                const result = reader.result as string
                resolve(result.split(',')[1])
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
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
                setError(`Translation server error: ${json?.error?.message || 'No result'}`)
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

        // ✅ Expand here
        const expanded: string[] = []
        for (const p of parts) {
            expanded.push(...expandCompoundIngredients(p))
        }
        parts = expanded

        return parts.map(toProperCase).join(', ').replace(/[\s,]+$/g, '').replace(/\(\s*$/g, '')
    }

    function extractProductName(text: string) {
        const normalized = text.replace(/：/g, ':').replace(/\u3000/g, ' ').replace(/\s+/g, ' ').trim()
        const clean = (s: string) =>
            toProperCase(s.replace(/[™®©]+/g, '').replace(/\*+$/g, '').trim())
        const m1 = /(product\s*name|product|name|item|品名|品項)\s*:\s*(.+?)(?=\s*(ingredients?\s*:|$|[.;\n\r]))/i.exec(normalized)
        if (m1?.[2]) return clean(m1[2])
        const beforeIngredients = normalized.split(/ingredients?\s*:/i)[0] || ''
        if (beforeIngredients.trim()) return clean(beforeIngredients.split(/[.;\n]/)[0])
        return ''
    }

    function detectLanguage(text: string): 'chinese' | 'english' | 'mixed' | 'unknown' {
        if (!text) return 'unknown'
        const hasChinese = /[\u4e00-\u9fff]/.test(text)
        const hasEnglish = /[a-zA-Z]/.test(text)
        if (hasChinese && hasEnglish) return 'mixed'
        if (hasChinese) return 'chinese'
        if (hasEnglish) return 'english'
        return 'unknown'
    }

    function expandCompoundIngredients(text: string): string[] {
        const compoundPattern = /([\u4e00-\u9fa5A-Za-z]+)\s*\(([^)]+)\)/g;
        const results: string[] = [];

        let match;
        while ((match = compoundPattern.exec(text)) !== null) {
            const subIngredients = match[2].split(/[、,]/).map(s => s.trim());

            // Instead of pushing compoundName (which causes false warning),
            // push only its sub-ingredients
            results.push(...subIngredients);
        }

        return results.length > 0 ? results : [text];
    }

    const checkingIngredients = ref(false)

    async function recheckHighlights(raw: string = ingredientsTextZh.value) {
        checkingIngredients.value = true
        try {
            const text = raw.trim()
            if (!text || !allHighlights.value.length) {
                ingredientHighlights.value = []
                autoStatus.value = ''
                return
            }

            const parts = raw.split(/\s*,\s*/).map(x => x.trim()).filter(Boolean)

            const highlights = [...allHighlights.value].sort((a, b) => b.keyword.length - a.keyword.length)
            const found: IngredientHighlight[] = []

            for (const part of parts) {
                const normalized = part.replace(/[,\s]/g, "")

                for (const h of highlights) {
                    const variants = h.keyword_zh?.split("|").map(v => v.trim()) ?? []
                    for (const variant of variants) {
                        const normVariant = variant.replace(/[,\s]/g, "")

                        if (normalized.includes(normVariant)) {
                            // 🚫 Skip if this variant is fully contained in an already matched variant
                            if ([...found].some(f => f.matchedVariant && f.matchedVariant.includes(normVariant))) {
                                console.log(`⏩ Skipping smaller match: ${variant} (already covered)`)
                                continue
                            }

                            console.log("✅ Match detected:", variant, "→", h)
                            found.push({ ...h, matchedVariant: variant })
                        }
                    }
                }
            }


            ingredientHighlights.value = found

            // Status logic
            const hasHaram = found.some(h => extractIonColor(h.color) === 'danger')
            const hasSyubhah = found.some(h => extractIonColor(h.color) === 'warning')
            autoStatus.value = hasHaram ? 'Haram' : hasSyubhah ? 'Syubhah' : 'Muslim-friendly'
        } finally {
            checkingIngredients.value = false
        }
    }

    return {
        runOcr,
        recheckHighlights,
        ingredientHighlights,
        ingredientsTextZh,
        autoStatus,
        productName,
        ingredientsText,
        showOk,
        checkingIngredients,   // ✅ expose it
        detectedLanguage,
    }
}
