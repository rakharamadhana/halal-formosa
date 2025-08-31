import { ref } from 'vue'
import { GoogleGenAI } from '@google/genai'
import { extractIonColor, colorMeaning } from '@/utils/ingredientHelpers'
import { marked } from 'marked'

export default function useAISummary() {
    const overallNote = ref<string>('') // summary text (HTML after parsing)
    const loadingSummary = ref(false)
    const errorSummary = ref<string | null>(null)

    const ai = new GoogleGenAI({
        apiKey: import.meta.env.VITE_GEMINI_API_KEY
    })

    async function renderMarkdown(text: string): Promise<string> {
        return await marked.parseInline(text) as string
    }


    async function generateSummary(ingredientsText: string, highlights: any[] = [], systemStatus: string = '') {
        if (!ingredientsText) return

        loadingSummary.value = true
        errorSummary.value = null
        overallNote.value = ''

        try {
            const input = ingredientsText.slice(0, 1500)

            const highlightInfo = highlights.length
                ? highlights.map(h => `${h.keyword}: ${colorMeaning(extractIonColor(h.color))}`).join(', ')
                : 'None'

            const stream = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash-lite',
                contents: `You are providing official but friendly explanations on behalf of Halal Formosa. 
Do NOT include greetings, OCR results, introductions, or disclaimers. Go straight to the ingredient analysis.

Ingredients (OCR result):
${input}

Trusted ingredient status from the Halal Formosa database:
${highlightInfo}

Strict instructions:
1. ONLY explain ingredients flagged in the database (*Muslim-friendly*, *Haram*, *Syubhah*). Always explain WHY briefly.
2. If multiple ingredients share the same status and reasoning (e.g., dairy-based Muslim-friendly, plant-based Muslim-friendly), group them into one sentence instead of repeating.
   - Example: "**Whey powder, Cheese powder, and Yeast extract** are all *Muslim-friendly* because they come from dairy or yeast and are generally acceptable."
3. For critical Syubhah or Haram ingredients, always explain them individually.
4. Keep total explanation under 3 short sentences maximum.
5. Always end with:  
   "Based on our Halal Formosa database, this product is [overall status]."
6. Use Markdown (bold ingredient names, italic statuses).`,
                config: { thinkingConfig: { thinkingBudget: 0 } }
            })


            let output = ''
            for await (const chunk of stream) {
                if (chunk.text) {
                    output += chunk.text
                    overallNote.value = await renderMarkdown(output)
                }
            }
        } catch (err: any) {
            errorSummary.value = err.message || 'Failed to generate summary.'
        } finally {
            loadingSummary.value = false
        }
    }


    return {
        overallNote,
        loadingSummary,
        errorSummary,
        generateSummary
    }
}
