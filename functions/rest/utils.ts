const supportFiles = [{ type: 'image/png', ext: 'png' }, { type: 'image/jpeg', ext: 'jpeg' }, { type: 'image/gif', ext: 'gif' }, { type: 'image/webp', ext: 'webp' }, { type: 'image/jpg', ext: 'jpg' }, { type: 'image/x-icon', ext: 'ico' }, { type: 'application/x-ico', ext: 'ico' }, { type: 'image/vnd.microsoft.icon', ext: 'ico' }]
const supportFile = 'image/png,image/jpeg,image/gif,image/webp,image/jpg,image/x-icon,application/x-ico,image/vnd.microsoft.icon'

// 单文件上传上限（字节）。可用环境变量 MAX_UPLOAD_BYTES 覆盖，默认 20MB（与前端提示一致）。
export const DEFAULT_MAX_UPLOAD_BYTES = 20 * 1024 * 1024

// 字符串编码
export function randomString(value: number) {
    let baseStr = 'Aa0Bb1Cc2Dd3Ee4Ff5Gg6Hh7Ii8Jj9KkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';
    const chars = baseStr.split('');
    let maxPos = baseStr.length;
    const uuid = [];
    let q = value;
    for (; q > 0;) {
        let mod = q % maxPos;
        q = (q - mod) / maxPos;
        uuid.push(chars[mod]);
    }
    return uuid.join('');
}

// 解析range
export function parseRange(encoded: string | null): undefined | { offset: number, end: number, length: number } {
    if (encoded === null) {
        return
    }
    const parts = encoded.split("bytes=")[1]?.split("-") ?? []
    if (parts.length !== 2) {
        throw new Error('Not supported to skip specifying the beginning/ending byte at this time')
    }
    return {
        offset: Number(parts[0]),
        end: Number(parts[1]),
        length: Number(parts[1]) + 1 - Number(parts[0]),
    }
}

// 检查文件类是否支持
export function checkFileType(val: string): boolean {
    return supportFile.indexOf(val) > -1
}

// 定长（时间恒定）字符串比较：避免 token 逐字符比较泄露前缀长度信息
export function safeEqual(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false
    }
    if (a.length !== b.length) {
        return false
    }
    let diff = 0
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return diff === 0
}

// 上传体积上限：环境变量优先，非法值回退默认
export function getMaxUploadBytes(val: unknown): number {
    const parsed = Number(val)
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed
    }
    return DEFAULT_MAX_UPLOAD_BYTES
}

// 按文件头魔数嗅探真实图片类型；识别不出返回 null。
// 不信任客户端给的 content-type（可以随便伪装）。
export function sniffImageType(bytes: Uint8Array): string | null {
    if (!bytes || bytes.length < 4) {
        return null
    }
    const b = bytes
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
        return 'image/png'
    }
    // JPEG: FF D8 FF
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
        return 'image/jpeg'
    }
    // GIF: 47 49 46 38 ("GIF8")
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) {
        return 'image/gif'
    }
    // ICO: 00 00 01 00
    if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) {
        return 'image/x-icon'
    }
    // WEBP: "RIFF"...."WEBP"
    if (b.length >= 12 &&
        b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
        return 'image/webp'
    }
    return null
}

// 魔数嗅探结果与声明类型是否相容（ico 有多个别名，需要折叠比较）
export function isConsistentType(sniffed: string | null, declared: string): boolean {
    if (!sniffed) {
        return false
    }
    if (sniffed === declared) {
        return true
    }
    const icoAliases = ['image/x-icon', 'application/x-ico', 'image/vnd.microsoft.icon']
    if (sniffed === 'image/x-icon' && icoAliases.indexOf(declared) > -1) {
        return true
    }
    // image/jpg 与 image/jpeg 视为同一类型
    if (sniffed === 'image/jpeg' && declared === 'image/jpg') {
        return true
    }
    return false
}

// 获取文件名
export async function getFilePath(val: string, time: number): Promise<string> {
    const types = supportFiles.filter(it => it.type === val)
    if (!types || types.length < 1) {
        return val
    }
    const rand = Math.floor(Math.random() * 100000)
    const fileName = randomString(time + rand).concat(`.${types[0].ext}`)
    let date = new Date()
    const year = date.getFullYear() //获取完整的年份(4位)
    const month = String(date.getMonth() + 1).padStart(2, '0') //月份补零(0-11,0代表1月)
    return `${year}/${month}/${fileName}`

}
