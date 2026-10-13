// OGP画像（next/og）で日本語を描くためのフォント。
// 必要な文字だけを Google Fonts から取り寄せる（数KB〜数十KB）。取れなければ null を返し、
// 呼び出し側は英数字だけの表示に切り替える。
export async function loadJapaneseFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@900&text=${encodeURIComponent(text)}`
    const css = await (await fetch(cssUrl, { signal: AbortSignal.timeout(3000) })).text()
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    if (!src) return null
    const res = await fetch(src, { signal: AbortSignal.timeout(3000) })
    return res.ok ? await res.arrayBuffer() : null
  } catch {
    return null
  }
}
