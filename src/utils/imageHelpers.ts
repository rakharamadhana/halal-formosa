// src/utils/imageHelpers.ts
// --- helpers ---
export function loadImageFromFile(file: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
        img.onerror = reject
        img.src = url
    })
}
export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = url
    })
}
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w/2, h/2)
    ctx.beginPath()
    ctx.moveTo(x+rr, y)
    ctx.arcTo(x+w, y, x+w, y+h, rr)
    ctx.arcTo(x+w, y+h, x, y+h, rr)
    ctx.arcTo(x, y+h, x, y, rr)
    ctx.arcTo(x, y, x+w, y, rr)
    ctx.closePath()
}

export function blobToBase64(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(((r.result as string) || '').split(',')[1] || '')
        r.onerror = reject
        r.readAsDataURL(file)
    })
}
