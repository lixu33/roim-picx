// PNG 无损转 WebP（纯浏览器端 wasm，像素级一致）
//
// 为什么不用 canvas：drawImage 会做 alpha 预乘/反预乘，透明像素的 RGB 值会被改写，
// 「无损」就不成立了。所以用 @jsquash/png 解码（PNG→ImageData）+ @jsquash/webp
// 无损编码（ImageData→WebP），编解码都在 wasm 里，不经 canvas。
//
// 无损的边界（实测）：可见像素（alpha>0）逐字节一致；libwebp 会把 alpha=0 像素的
// RGB 置零——这些值在任何渲染器里都不显示，视觉无损。
//
// wasm 以动态 import 加载：只有真正遇到 PNG 文件才会下载这两个 codec，
// 不拖累首屏；非 PNG 文件（已是 webp/jpeg 的）直接原样上传。
//
// 两个保险：
//   1. 任一环节失败 → 返回 null，调用方保留原 PNG（转码是优化，不是必经之路）；
//   2. WebP 无损偶尔比 PNG 更大（低色数小图常见）→ 转完比原文件大就放弃。
export async function pngToLosslessWebp(file: File): Promise<File | null> {
	try {
		const pngBuffer = await file.arrayBuffer()
		const [{ decode }, { encode }] = await Promise.all([
			import('@jsquash/png'),
			import('@jsquash/webp')
		])
		const imageData = await decode(pngBuffer)
		const webpBuffer = await encode(imageData, { lossless: 1, quality: 100 })
		if (webpBuffer.byteLength >= file.size) return null
		const name = file.name.replace(/\.png$/i, '') + '.webp'
		return new File([webpBuffer], name, { type: 'image/webp' })
	} catch (e) {
		console.warn('png→webp lossless convert failed, keep original:', e)
		return null
	}
}
