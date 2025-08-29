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
            if (incrementDisclaimerCount) incrementDisclaimerCount();

            // ✅ Load highlights + blacklist
            const data = await fetchHighlightsWithCache();
            if (data) {
                allHighlights.value = data.highlights;
                blacklistPatterns.value = data.blacklist.map(
                    b => new RegExp(b.pattern, 'gi')
                );
            }

            // ✅ OCR
            const raw = await extractTextFromImage(file);
            if (!raw || !raw.trim()) {
                return setError('OCR failed to detect any text.');
            }
            console.log('📄 Raw OCR text detected:', raw);

            detectedLanguage.value = detectLanguage(raw);
            console.log('🌐 OCR detected language:', detectedLanguage.value);

            let translated = '';
            let cleanedZh = raw;

            if (detectedLanguage.value === 'english') {
                // ✅ Already English → no need to clean Chinese
                translated = raw;
            } else {
                // ✅ Clean Chinese OCR → ingredients only
                cleanedZh = cleanChineseOcrText(raw);
                cleanedZh = normalizeIngredients(cleanedZh);

                if (!cleanedZh.trim()) {
                    return setError('OCR detected text but nothing meaningful remained after cleanup.');
                }

                console.log('🀄 Cleaned Chinese OCR:', cleanedZh);

                // ✅ Translate FULL raw text → keeps product name + ingredients
                const result = await translateToEnglish(raw);
                if (result === null) return;
                translated = result;
            }

            // ✅ Guard: must contain "ingredients"
            if (!translated.toLowerCase().includes('ingredient')) {
                return setError('Ingredients not detected. Please crop the ingredients section.');
            }

            // ✅ Save ingredients-only Chinese
            cleanedZh = stripToIngredientsOnly(cleanedZh);
            ingredientsTextZh.value = cleanedZh;
            console.log('🀄 Cleaned Chinese OCR (ingredients-only):', cleanedZh);

            // ✅ Extract product name (English)
            productName.value = extractProductName(translated) || '';

            // ✅ Clean translated text → English ingredient list only
            ingredientsText.value = cleanTranslatedIngredients(translated);

            console.log("🏷 Product Name (EN):", productName.value);
            console.log("🌍 Translated Ingredients:", ingredientsText.value);

            await nextTick();

            // ✅ Run highlights on Chinese ingredients
            await recheckHighlights(cleanedZh);

            // ✅ Occasionally refresh cache
            const count = incrementUsageCount();
            if (count >= 5) {
                const fresh = await fetchHighlightsWithCache(true);
                if (fresh) {
                    allHighlights.value = fresh.highlights;
                    blacklistPatterns.value = fresh.blacklist.map(
                        row => new RegExp(row.pattern, 'gi')
                    );
                }
            }

            showOk.value = true;
        } catch (e) {
            console.error(e);
            setError('OCR failed.');
        }
    }

    function stripToIngredientsOnly(text: string): string {
        if (!text) return '';

        // 1️⃣ Keep only the part starting from 成分/Ingredients marker
        let stripped = text.replace(/^[\s\S]*?(成分|配料|原料|材料|內容物|ingredients?)[:：]/i, '');

        // 2️⃣ Cut off after common "end markers" like Nutrition Facts / Net Weight / Manufacturer
        stripped = stripped.replace(
            /(營養成分|營養標示|nutrition facts|淨重|重量|製造商|廠商|保存方法|有效日期)[\s\S]*$/i,
            ''
        );

        return stripped.trim();
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

    function cleanChineseOcrText(text: string): string {
        let cleaned = text
            .replace(/\r?\n+/g, ', ')
            .replace(/[。、．。]/g, ',')
            .replace(/\s{2,}/g, ' ')
            .replace(/品\s*,?\s*名/gi, '品名')
            .replace(/成\s*,?\s*分/gi, '成分');

        // ✅ Catch glued case: 品名...原料:
        cleaned = cleaned.replace(/(品名[:：][^,，]*)原料[:：]/gi, '$1, Ingredients: ');

        // ✅ Catch normal case: 原料: / 成分: etc
        cleaned = cleaned.replace(/(成分|配料|原料|材料|内容物|內容物)[:：]/gi, 'Ingredients: ');

        // ✅ Normalize product name
        cleaned = cleaned.replace(/品名[:：]/gi, 'Product name: ');

        // Remove duplicate commas
        cleaned = cleaned.replace(/,\s*,+/g, ', ').replace(/^,|,$/g, '');

        console.log("🧹 Cleaned before blacklist:", cleaned);

        for (const pattern of blacklistPatterns.value) {
            const newCleaned = cleaned.replace(pattern, '').trim();
            if (newCleaned.length > 5) {   // only accept if not wiping too much
                cleaned = newCleaned;
            } else {
                console.warn("⚠️ Skipped blacklist pattern (too destructive):", pattern);
            }
        }

        console.log("🧹 Cleaned after blacklist:", cleaned);
        return cleaned.trim();
    }

    function toProperCase(s: string) {
        return s.replace(/\w\S*/g, (txt) => txt[0].toUpperCase() + txt.slice(1).toLowerCase())
    }

    function cleanTranslatedIngredients(text: string): string {
        // 1️⃣ Cut everything before "ingredients:"
        const idx = text.toLowerCase().indexOf('ingredients:');
        let extracted = idx !== -1 ? text.substring(idx + 'ingredients:'.length).trim() : text;

        // 2️⃣ Normalize whitespace & newlines
        extracted = extracted.replace(/\n+/g, ', ').replace(/\s{2,}/g, ' ');

        // 3️⃣ Apply blacklist patterns from DB
        blacklistPatterns.value.forEach((pattern) => {
            extracted = extracted.replace(pattern, '').trim();
        });

        // 4️⃣ Split and normalize
        let parts = extracted
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);

        // 5️⃣ Expand compound ingredients inside ()
        const expanded: string[] = [];
        for (const p of parts) {
            expanded.push(...expandCompoundIngredients(p));
        }
        parts = expanded;

        // 6️⃣ Remove weight-only items like "250ml", "1kg"
        parts = parts.filter((p) => !/^\d+\s*(g|kg|ml|毫升|公克)$/i.test(p));

        // 7️⃣ Guard: if first item looks like product name (title-case + digits), drop it
        if (parts.length && /^[A-Z][a-z]+.*\d+.*$/i.test(parts[0])) {
            parts.shift();
        }

        // 8️⃣ Remove incomplete junk like "(", ")", ","
        parts = parts.filter((p) => !/^[(),]+$/.test(p));

        // 9️⃣ Join back, ProperCase each, remove trailing junk
        return parts
            .map(toProperCase)
            .join(', ')
            .replace(/[\s,]+$/g, '')   // trim trailing commas/spaces
            .replace(/\(\s*$/g, '');   // trim dangling "("
    }


    function extractProductName(text: string): string {
        const normalized = text
            .replace(/：/g, ':')
            .replace(/\u3000/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const clean = (s: string) =>
            toProperCase(
                s.replace(/[™®©]+/g, '')
                    .replace(/\*+$/g, '')
                    .trim()
            );

        // ✅ First try: regex capture
        const m1 = /(product\s*name|product|name|item|品名|品項)\s*:?(.+?)(?=\s*(ingredients?\s*:|$|[.;\n\r]))/i.exec(normalized);
        if (m1?.[2]) {
            const candidate = clean(m1[2]);
            if (candidate.length > 1) {
                return candidate;
            }
        }

        // ✅ Second try: manual keyword search (fallback)
        const lower = normalized.toLowerCase();
        const nameKeywords = ['product name', 'name:', 'item:', '品名', '品項'];

        for (const keyword of nameKeywords) {
            const idx = lower.indexOf(keyword);
            if (idx !== -1) {
                let remainder = normalized.substring(idx + keyword.length).trim();

                remainder = remainder
                    .split(/ingredients?:/i)[0]
                    .split(/[,(\n]/)[0]
                    .replace(/[:：]/g, '')
                    .trim();

                if (remainder.length > 1) {
                    const candidate = clean(remainder);
                    console.log("🏷 Extracted Product Name (fallback):", candidate);
                    return candidate;
                }
            }
        }

        console.warn("⚠️ Product name could not be extracted from OCR text.");
        return '';
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
        cleanChineseOcrText,
    }
}
