import { error } from 'itty-router-extras';

export interface Env {
  AUTH_TOKEN: string
  COPY_URL: string
  R2: R2Bucket
  // 可选：单文件上传上限（字节）。不设则用默认 20MB
  MAX_UPLOAD_BYTES?: string
}

// 统一补安全响应头；已设过的路由不会冲突
const withSecurityHeaders = (res: Response): Response => {
  try {
    if (!res.headers.has('x-content-type-options')) {
      res.headers.set('x-content-type-options', 'nosniff')
    }
  } catch (e) {
    // Response 的 header guard 不可写时忽略，不影响主流程
  }
  return res
}

export const onRequest: PagesFunction<Env> = async (context : EventContext) => {
  const { router } = await import('./router').then(
    async (module) => (await import('./routes'), module)
  );

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response: Response | undefined = await router.handle(context.request, context.env);
    return withSecurityHeaders(response ?? error(404, 'not found'));
  } catch (err) {
    // 内部错误只回通用文案，细节留在日志里，避免泄露实现信息
    console.error('unhandled error:', err);
    return withSecurityHeaders(error(500, 'internal error'));
  }
};
