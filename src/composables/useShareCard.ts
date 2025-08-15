import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Clipboard } from '@capacitor/clipboard'
import { loadImageFromFile, loadImageFromUrl, roundRect, blobToBase64 } from '@/utils/imageHelpers'
import type { Ref } from 'vue'
import { ionToHex } from '@/utils/ingredientHelpers'
import type { IngredientHighlight } from '@/types/ingredients'

interface ShareCardOptions {
    productName?: string
    status?: string
    ingredients: string
    logoUrl?: string
    highlightMap?: Record<string, string>
}

export default function useShareCard(
    productNameRef: Ref<string>,
    ingredientsTextRef: Ref<string>,
    autoStatusRef: Ref<string>,
    ingredientHighlightsRef: Ref<IngredientHighlight[]>
) {
    const shareCTA = `
Join us and contribute to make Halal Formosa more beneficial for others 🌟
Get it here: https://play.google.com/store/apps/details?id=com.rcreative.halalformosa
(iOS coming soon)
`

    /** Main card builder */
    // --- main: makeShareCard ---
    /**
     * @param imageFile  cropped image (or original)
     * @param opts { productName, status, ingredients, logoUrl? }
     * @returns File (JPEG) ready to share
     */
    async function makeShareCard(
        imageFile: Blob,
        opts: ShareCardOptions
    ): Promise<File> {
        // --- Layout constants ---
        const W = 1080;
        const P = 48;
        const cardR = 40;
        const imageR = 36;
        const headerH = 80;
        const imgH = 580;
        const nameRowH = 72;
        const gapAfterName = 16;
        const footerH = 72;
        const lineH = 42;

        const cardX = P / 2;
        const cardY = P / 2;
        const cardW = W - P;
        const contentX = cardX + P;
        const contentW = cardW - P * 2;

        // Wrap + (optionally) draw highlighted items
        function drawHighlightedItems(
            ctx: CanvasRenderingContext2D,
            items: string[],
            x: number,
            y: number,
            maxW: number,
            lineH: number,
            draw: boolean,
            cfg: { label?: string; highlightMap?: Record<string, string> } = {}
        ): number {
            const fontFor = (bold: boolean) =>
                `${bold ? '700' : '400'} 30px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;

            // use the ionToHex you defined outside
            const colorFor = (item: string) => ionToHex(cfg.highlightMap?.[item.toLowerCase()]);

            let cx = x, cy = y;

            // Label (bold)
            if (cfg.label) {
                ctx.font = fontFor(true);
                const lw = ctx.measureText(cfg.label).width;
                if (cx + lw > x + maxW) { cx = x; cy += lineH; }
                if (draw) { ctx.fillStyle = '#111'; ctx.fillText(cfg.label, cx, cy); }
                cx += lw;
            }

            const drawToken = (text: string, bold: boolean, color: string) => {
                ctx.font = fontFor(bold);
                const w = ctx.measureText(text).width;
                if (cx + w > x + maxW) { cx = x; cy += lineH; }
                if (draw) { ctx.fillStyle = color; ctx.fillText(text, cx, cy); }
                cx += w;
            };

            items.forEach((raw, idx) => {
                const item = raw.trim();
                const isHi = !!cfg.highlightMap?.[item.toLowerCase()];
                const color = colorFor(item);
                if (idx > 0) drawToken(', ', false, '#666');
                item.split(/\s+/).forEach((w, i, arr) =>
                    drawToken(w + (i < arr.length - 1 ? ' ' : ''), isHi, color)
                );
            });

            return cy + lineH - y;
        }

        // Pre-measure ingredients block height
        const measure = document.createElement('canvas').getContext('2d')!;
        measure.font = '400 30px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
        const items = opts.ingredients
            .replace(/，/g, ',')            // handle Chinese comma, if relevant
            .split(/\s*,\s*/)
            .map(s => s.trim())
            .filter(Boolean);

        const ingredientsYStart =
            cardY + 20 + headerH + 16 + imgH + 24 + nameRowH + gapAfterName;

        const blockH = drawHighlightedItems(
            measure,            // <-- was measureCtx
            items,
            contentX,
            ingredientsYStart,
            contentW,
            lineH,
            false,
            { label: 'Ingredients: ', highlightMap: opts.highlightMap ?? {} }
        );


        // Final canvas height so footer stays at the bottom
        const H = Math.ceil(ingredientsYStart + blockH + 24 + footerH + cardY);

        // --- Create canvas ---
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d')!;

        // Background + card
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 6;
        roundRect(ctx, cardX, cardY, cardW, H - P, cardR);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // Header
        let y = cardY + 20;
        if (opts.logoUrl) {
            try {
                const logo = await loadImageFromUrl(opts.logoUrl);
                const s = 42;
                ctx.drawImage(logo, contentX, y + (headerH - s) / 2, s, s);
            } catch { /* empty */ }
        } else {
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#111';
            roundRect(ctx, contentX, y + 18, 36, 36, 8);
            ctx.stroke();
        }
        ctx.fillStyle = '#111';
        ctx.font = '600 42px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
        ctx.textBaseline = 'top';
        ctx.fillText('Halal Formosa', contentX + 56, y + 24);
        y += headerH + 16;

        // Main image
        const img = await loadImageFromFile(imageFile);
        ctx.save();
        roundRect(ctx, contentX, y, contentW, imgH, imageR);
        ctx.clip();
        {
            const ratio = img.width / img.height;
            let drawW = contentW;
            let drawH = Math.round(drawW / ratio);
            if (drawH < imgH) { drawH = imgH; drawW = Math.round(drawH * ratio); }
            const dx = contentX + Math.round((contentW - drawW) / 2);
            const dy = y + Math.round((imgH - drawH) / 2);
            ctx.drawImage(img, dx, dy, drawW, drawH);
        }
        ctx.restore();

        // Name + status
        y += imgH + 24;
        ctx.fillStyle = '#111';
        ctx.font = '700 44px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
        const name = (opts.productName || 'Product Name').trim();
        const pillW = 240, pillH = 56;
        const nameMaxW = contentW - pillW - 16;
        ctx.fillText(name, contentX, y, nameMaxW);

        if (opts.status) {
            const status = opts.status;
            const pillX = contentX + contentW - pillW;
            const pillY = y - 8;
            const pillColor: Record<string, string> = {
                'Halal': '#2dd36f', 'Muslim-friendly': '#3880ff',
                'Syubhah': '#ffc409', 'Haram': '#eb445a'
            };
            ctx.lineWidth = 4;
            ctx.strokeStyle = pillColor[status] || '#3880ff';
            ctx.fillStyle = 'rgba(0,0,0,0)';
            roundRect(ctx, pillX, pillY, pillW, pillH, 18);
            ctx.stroke();
            ctx.font = '600 30px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
            ctx.fillStyle = '#111';
            const textW = ctx.measureText(status).width;
            ctx.fillText(status, pillX + (pillW - textW) / 2, pillY + 12);
        }

        // Ingredients (highlighted)
        y = ingredientsYStart;
        drawHighlightedItems(
            ctx,
            items,
            contentX,
            y,
            contentW,
            lineH,
            true,
            { label: 'Ingredients: ', highlightMap: opts.highlightMap ?? {} }
        );
        y += blockH + 24;

        // Footer
        ctx.fillStyle = '#777';
        ctx.font = '500 26px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
        ctx.textBaseline = 'alphabetic';
        const year = new Date().getFullYear();
        ctx.fillText(`Halal Formosa (c) ${year}`, contentX, H - P + 12 - 48);

        // Export
        const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.92));
        return new File([blob], `halal-formosa-card-${Date.now()}.jpg`, { type: 'image/jpeg' });
    }

    /** Fallback share text if image share not possible */
    function shareTextFallback(): Promise<void> | void {
        const text = [
            productNameRef.value ? `Product: ${productNameRef.value}` : null,
            autoStatusRef.value ? `Status: ${autoStatusRef.value}` : null,
            `Ingredients: ${ingredientsTextRef.value}`,
            '',
            shareCTA.trim()
        ]
            .filter(Boolean)
            .join('\n')

        if ((navigator as any).share) {
            return (navigator as any).share({ title: 'Ingredients', text })
        }
        return Clipboard.write({ string: text })
    }

    /** Main share function */
    async function shareResult(originalFile: Ref<Blob | null>): Promise<void> {
        try {
            const imageBlob: Blob | null = originalFile.value
            if (!imageBlob) return shareTextFallback()

            const highlightMap: Record<string, string> = Object.fromEntries(
                ingredientHighlightsRef.value.map(h => [
                    h.keyword.toLowerCase(),
                    h.color.split('-').pop() ?? ''
                ])
            )

            const card = await makeShareCard(imageBlob, {
                productName: productNameRef.value,
                status: autoStatusRef.value,
                ingredients: ingredientsTextRef.value,
                logoUrl: '/android-chrome-192x192.png',
                highlightMap
            })

            if (Capacitor.getPlatform() !== 'web') {
                const base64 = (await blobToBase64(card)).replace(/^data:image\/\w+;base64,/, '')
                const path = `share/ingredients-${Date.now()}.jpg`

                await Filesystem.writeFile({
                    path,
                    data: base64,
                    directory: Directory.Cache,
                    recursive: true
                })

                const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })

                const can = await Share.canShare()
                if (!can.value) return shareTextFallback()

                await Share.share({
                    title: 'Ingredients',
                    text: [
                        productNameRef.value ? `Product: ${productNameRef.value}` : null,
                        autoStatusRef.value ? `Status: ${autoStatusRef.value}` : null,
                        '',
                        shareCTA.trim()
                    ].filter(Boolean).join('\n'),
                    files: [uri],
                    dialogTitle: 'Share ingredients'
                })

                return
            }

            if ((navigator as any).canShare?.({ files: [card] })) {
                await (navigator as any).share({ title: 'Ingredients', files: [card] })
                return
            }

            const url = URL.createObjectURL(card)
            const a = document.createElement('a')
            a.href = url
            a.download = card.name
            document.body.appendChild(a)
            a.click()
            URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err) {
            console.error('[shareResult] failed:', err)
            await shareTextFallback()
        }
    }

    return {
        makeShareCard,
        shareResult,
        shareTextFallback
    }

}
