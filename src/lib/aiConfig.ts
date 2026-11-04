import type { AiConfig } from '../types'

/**
 * 把用户设置解析成实际调用参数：
 * - 填了自己的 key → 浏览器直连服务商（不消耗站点额度）
 * - 没填 → 走本站服务器代理（服务器用自己的 key）
 */
export function resolveAi(ai: AiConfig): AiConfig {
  const own = (ai.ownKey || '').trim()
  if (own) {
    return {
      mode: 'remote',
      baseUrl: (ai.ownBaseUrl || 'https://api.deepseek.com/v1').trim(),
      apiKey: own,
      model: (ai.ownModel || 'deepseek-chat').trim(),
      asrUrl: ai.asrUrl,
      asrModel: ai.asrModel,
      asrToken: ai.asrToken,
    }
  }
  return {
    mode: 'remote',
    baseUrl: '/api/ai',
    apiKey: 'server',
    model: 'server',
    asrUrl: '/api/asr/v1/audio/transcriptions',
    asrModel: 'whisper-1',
    asrToken: 'server',
  }
}

export const usingOwnKey = (ai: AiConfig) => Boolean((ai.ownKey || '').trim())
