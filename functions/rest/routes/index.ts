import { router } from '../router';
import { Env } from '../[[path]]'
import { json } from 'itty-router-extras';
import StatusCode, { Ok, Fail, Build, ImgItem, ImgList, ImgReq, Folder, AuthToken, FailCode, NotAuth } from "../type";
import { checkFileType, getFilePath, parseRange, safeEqual, sniffImageType, isConsistentType, getMaxUploadBytes } from '../utils'
import { R2ListOptions } from "@cloudflare/workers-types";

// R2 key 上限 1024 字节；这里收紧到 512 并禁止穿越片段与绝对路径
const MAX_KEY_LENGTH = 512

const isSafeKey = (key: unknown): key is string => {
    if (typeof key !== 'string') {
        return false
    }
    if (!key.length || key.length > MAX_KEY_LENGTH) {
        return false
    }
    if (key.startsWith('/') || key.includes('..') || key.includes('\\')) {
        return false
    }
    // 控制字符与换行会污染日志与响应头
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(key)) {
        return false
    }
    return true
}

// 时间恒定比较的 token 校验
const isTokenValid = (request: Request, env: Env): boolean => {
    const token = request.headers.get('Authorization')
    if (!token) {
        return false
    }
    const authKey = env.AUTH_TOKEN
    if (!authKey) {
        return false
    }
    return safeEqual(authKey, token)
}

const auth = async (request: Request, env: Env) => {
    const method = request.method;
    if (method == "GET" || method == "OPTIONS") {
        return
    }
    // get user token
    const token = request.headers.get('Authorization')
    if (!token) {
        return json(NotAuth())
    }
    if (!env.AUTH_TOKEN) {
        return json(Fail("system not auth setting"))
    }
    if (!isTokenValid(request, env)) {
        return json(FailCode("auth fail", StatusCode.NotAuth))
    }
}

// 检测token是否有效
router.post('/checkToken', async (req: Request, env: Env) => {
    const data = await req.json() as AuthToken
    const token = data && data.token
    if (!token) {
        return json(Ok(false))
    }
    if (!env.AUTH_TOKEN || !safeEqual(env.AUTH_TOKEN, token)) {
        return json(Ok(false))
    }
    return json(Ok(true))
})

// list image
router.post('/list', auth, async (req: Request, env: Env) => {
    const data = await req.json() as ImgReq
    if (!data.limit) {
        data.limit = 10
    }
    if (data.limit > 100) {
        data.limit = 100
    }
    if (!data.delimiter) {
        data.delimiter = "/"
    }
    if (data.delimiter.length > 128) {
        return json(Fail("delimiter too long"))
    }
    let include = undefined
    if (data.delimiter != "/") {
        include = data.delimiter
    }
    const options = <R2ListOptions>{
        limit: data.limit,
        cursor: data.cursor,
        delimiter: data.delimiter,
        prefix: include
    }
    const list = await env.R2.list(options)
    const truncated = list.truncated ? list.truncated : false
    const cursor = list.cursor
    const objs = list.objects
    const urls = objs.map(it => {
        return <ImgItem>{
            url: `/rest/${it.key}`,
            copyUrl: `${env.COPY_URL}/${it.key}`,
            key: it.key,
            size: it.size
        }
    })
    return json(Ok(<ImgList>{
        list: urls,
        next: truncated,
        cursor: cursor,
        prefixes: list.delimitedPrefixes
    }))
})

// batch upload file
router.post('/upload', auth, async (req: Request, env: Env) => {
    const files = await req.formData()
    const images = files.getAll("files")
    const errs: string[] = []
    const maxBytes = getMaxUploadBytes(env.MAX_UPLOAD_BYTES)

    // 并发写入，保持返回顺序；每个任务内部不抛，失败只记 errs
    const tasks = images.map(async (raw): Promise<ImgItem | null> => {
        if (typeof raw === 'string') {
            errs.push('invalid file entry.')
            return null
        }
        const item = raw as File
        const fileType = item.type
        const label = item.name || fileType || 'unknown'
        if (!checkFileType(fileType)) {
            errs.push(`${fileType} not support.`)
            return null
        }
        if (!item.size) {
            errs.push(`${label} is empty.`)
            return null
        }
        if (item.size > maxBytes) {
            errs.push(`${label} exceeds size limit (${maxBytes} bytes).`)
            return null
        }
        // 不信任客户端 type：用文件头魔数确认真实类型
        const head = new Uint8Array(await item.slice(0, 12).arrayBuffer())
        const sniffed = sniffImageType(head)
        if (!sniffed) {
            errs.push(`${label} content is not a valid image.`)
            return null
        }
        let realType = fileType
        if (!isConsistentType(sniffed, fileType)) {
            // 声明的类型与内容不符：以内容为准（同族别名除外，正常上传不受影响）
            realType = sniffed
        }
        const time = new Date().getTime()
        const objecPath = await getFilePath(realType, time)
        const header = new Headers()
        header.set("content-type", realType)
        header.set("content-length", `${item.size}`)
        try {
            const object = await env.R2.put(objecPath, item.stream(), {
                httpMetadata: header,
            }) as R2Object
            if (object && object.key) {
                return {
                    key: object.key,
                    size: object.size,
                    copyUrl: `${env.COPY_URL}/${object.key}`,
                    url: `/rest/${object.key}`,
                    filename: item.name
                }
            }
        } catch (e) {
            console.log(`img upload error: ${(e as Error).message}`)
            errs.push(`${label} upload fail.`)
        }
        return null
    })

    const results = await Promise.all(tasks)
    const urls = results.filter((it): it is ImgItem => it !== null)
    return json(Build(urls, errs.join(',')))
})

// 创建目录
router.post("/folder", auth, async (req: Request, env: Env) => {
    try {
        const data = await req.json() as Folder
        const regx = /^[A-Za-z_]{1,64}$/
        if (!data || !regx.test(data.name)) {
            return json(Fail("Folder name error"))
        }
        await env.R2.put(data.name + '/', null)
        return json(Ok("Success"))
    } catch (e) {
        return json(Fail("Create folder fail"))
    }
})

// 删除成功后清边缘缓存：图不可变缓存了一年，不清的话删了还能从 CF 节点读到旧图
const purgeEdgeCache = (req: Request, ctx: { waitUntil: (p: Promise<unknown>) => void } | undefined, keys: string[]) => {
    if (!ctx) return
    const urls = keys.map(k => new URL(`/rest/${k}`, req.url).toString())
    ctx.waitUntil(Promise.all(urls.map(u => caches.default.delete(u))))
}

// 删除key（显式鉴权：GET 在 auth 中间件里是放行的，这个路由必须自己校验）
router.get('/del/:id+', async (req: Request, env: Env, ctx?: { waitUntil: (p: Promise<unknown>) => void }) => {
    if (!isTokenValid(req, env)) {
        return json(NotAuth())
    }
    const key = (req as { params?: { id?: string } }).params?.id
    if (!isSafeKey(key)) {
        return json(Fail("not delete key"))
    }
    try {
        await env.R2.delete(key)
    } catch (e) {
        console.log(`img delete error:${(e as Error).message}`)
        return json(Fail("delete fail"))
    }
    purgeEdgeCache(req, ctx, [key])
    return json(Ok(key))
})

// delete image
router.delete("/", auth, async (req: Request, env: Env, ctx?: { waitUntil: (p: Promise<unknown>) => void }) => {
    const params = await req.json() as { keys?: string }
    const keys = params && params.keys;
    if (!keys || typeof keys !== 'string' || keys.length < 1) {
        return json(Fail("not delete keys"))
    }
    const arr = keys.split(',')
    const targets = arr.filter(it => it && it.length && isSafeKey(it))
    if (!targets.length) {
        return json(Fail("not delete keys"))
    }
    try {
        await Promise.all(targets.map(it => env.R2.delete(it)))
    } catch (e) {
        console.log(`img delete error:${(e as Error).message}`)
        return json(Fail("delete fail"))
    }
    purgeEdgeCache(req, ctx, targets)
    return json(Ok(keys))
})

// image detail（公开读取：图床要能被外部引用）
// functions/** 被 tsconfig 排除（Pages 只用 esbuild 转译），DOM lib 的 CacheStorage
// 没有 default，这里按 Workers 运行时补环境声明，仅消 IDE 诊断
declare const caches: { default: Cache }
router.get("/:id+", async (req: Request, env: Env, ctx?: { waitUntil: (p: Promise<unknown>) => void }) => {
    const id = (req as { params?: { id?: string } }).params?.id
    if (!isSafeKey(id)) {
        return json(Fail("object not found"))
    }
    // key 含时间戳+随机串 = 内容不可变 → 同一 CF 节点的重复读直接命中边缘缓存，
    // 不再走 Worker→R2 往返（砍 TTFB，也省 Class B 操作数）。
    // 只对「无条件、无 Range 的普通 GET」启用：Cache API 不做条件协商也不懂 Range，
    // 对这两类请求回 200 全量会破坏 304/206 语义，必须继续走 R2 的 onlyIf/range 路径。
    const conditional = req.headers.has('if-none-match') || req.headers.has('if-modified-since') || req.headers.has('range')
    if (!conditional) {
        const cached = await caches.default.match(req)
        if (cached) {
            // 缓存返回的 Response 头是 immutable guard，不能原地改；用副本加标记
            const hit = new Response(cached.body, cached)
            hit.headers.set('x-cache', 'hit')
            return hit
        }
    }
    const range = parseRange(req.headers.get('range'))
    const object = await env.R2.get(id, {
        range,
        onlyIf: req.headers,
    })
    if (object == null) {
        return json(Fail("object not found"))
    }
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    // 浏览器与 CF 边缘长期缓存
    headers.set('cache-control', 'public, max-age=31536000, immutable')
    headers.set('x-content-type-options', 'nosniff')
    headers.set('accept-ranges', 'bytes')
    if (range) {
        headers.set("content-range", `bytes ${range.offset}-${range.end}/${object.size}`)
    }
    const status = object.body ? (range ? 206 : 200) : 304
    const response = new Response(object.body, {
        headers,
        status
    })
    // 只缓存完整 200（cache.put 不接受 206/304）；clone() 内部 tee 流，不影响返回体
    if (status === 200 && ctx) {
        response.headers.set('x-cache', 'miss')
        try {
            await caches.default.put(req, response.clone())
            const self = await caches.default.match(req)
            response.headers.set('x-cache-self', self ? 'stored' : 'absent')
        } catch (e) {
            response.headers.set('x-cache-err', (e as Error).message.slice(0, 80))
        }
    }
    return response
})
