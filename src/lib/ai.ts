import type { AiConfig, Suggestion, SuggestionOption, SuggestionTier, TagKey } from '../types'
import { PHRASE_BANK, WEAK_PATTERNS } from '../data/phrases.ts'
import { gistOf } from '../data/gists.ts'
import { ERRORS, CN_HINTS } from '../data/patterns.ts'
import { JUDGEMENTS } from '../data/judgements.ts'
import { SYSTEM_PROMPT, GIST_PROMPT, REWRITE_PROMPT } from './prompts.ts'

const register = (r: string): SuggestionOption['register'] =>
  r === '正式' ? '正式' : r === '口语' ? '口语' : '中性'

/** 高频硬伤：离线也能抓到的错误 */

const STOP = new Set(
  'a an the and or but if then so of to in on at for with from by as is are was were be been being it its this that these those i we you he she they me him her them my our your his their do does did have has had not no yes can could will would should may might must there here what which who whom when where why how about into over than too very just also well really much more most some any all one like up out going go'.split(
    ' ',
  ),
)

function stem(w: string): string {
  if (w.length > 4) {
    if (w.endsWith('ies')) return `${w.slice(0, -3)}y`
    if (w.endsWith('ing')) return w.slice(0, -3)
    if (w.endsWith('ed')) return w.slice(0, -2)
    if (w.endsWith('es')) return w.slice(0, -2)
    if (w.endsWith('s')) return w.slice(0, -1)
  }
  return w
}

function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]+/g) ?? [])
    .map(stem)
    .filter((w) => w.length > 2 && !STOP.has(w))
}

/** 中文意图里的关键词 → 材料里可能出现的英文词干，用来在转写很烂时兜住匹配 */

function splitSentences(text: string): string[] {
  const flat = text.replace(/\r/g, '').replace(/\s+/g, ' ').trim()
  const parts = flat.match(/[^.!?]+[.!?]+["”']?/g) ?? [flat]
  return parts
    .map((s) => s.trim().replace(/^[A-Za-z][A-Za-z .'-]{0,20}:\s+/, ''))
    .map((s) => s.replace(/^["“']+/, '').replace(/["”']+$/, '').trim())
    .filter((s) => s.length >= 15)
}

function scoreSentence(
  sentence: string,
  heardTokens: string[],
  intent: string,
): { score: number; shared: number } {
  const list = tokens(sentence)
  if (!list.length) return { score: 0, shared: 0 }
  const set = new Set(list)
  let shared = 0
  for (const t of heardTokens) if (set.has(t)) shared += 1
  let boost = 0
  if (intent) {
    for (const [cn, stems] of CN_HINTS) {
      if (!intent.includes(cn)) continue
      if (stems.some((s) => set.has(stem(s)))) boost += 1
    }
  }
  return { score: shared + boost * 0.8, shared }
}

/** 在材料里找用户此刻想复述的那一句；找不到返回 null */
export function findOriginal(materialText: string, heard: string, intent: string): string | null {
  const heardTokens = tokens(heard)
  const sentences = splitSentences(materialText)
  if (!sentences.length) return null

  let best: string | null = null
  let bestScore = 0
  let bestShared = 0
  for (const s of sentences) {
    const { score, shared } = scoreSentence(s, heardTokens, intent)
    if (score > bestScore) {
      bestScore = score
      bestShared = shared
      best = s
    }
  }
  if (!best) return null

  // 有实词重合，或者转写为空但中文意图能对上
  const ok =
    (bestShared >= 2 && bestScore >= 1.6) ||
    (bestShared >= 1 && bestScore >= 2.4) ||
    (heardTokens.length === 0 && bestScore >= 1.6)
  return ok ? best : null
}

/* ------------------------------------------------------------------ */
/* 把原句变成"你自己能说出口的完整句子"                                 */
/* ------------------------------------------------------------------ */

/** 转述时把 you 系代词换成 I/me 系 */
function revoice(s: string): string {
  return s
    .replace(/\byou've\b/gi, "I've")
    .replace(/\byou'd\b/gi, "I'd")
    .replace(/\byou're\b/gi, "I'm")
    .replace(/\byou'll\b/gi, "I'll")
    .replace(/\byourself\b/gi, 'myself')
    .replace(/\byours\b/gi, 'mine')
    .replace(/\byour\b/gi, 'my')
    .replace(/\byou\b/gi, (m, off: number, str: string) => {
      const before = str.slice(Math.max(0, off - 30), off).toLowerCase()
      return /(\b(?:to|for|with|about|on|of|at|from|ask|asked|asks|want|wants|wanted|told|tell|need|needs|expect|expects|show|showed|give|gave|help|advise|advised))\s+$/.test(
        before,
      )
        ? 'me'
        : 'I'
    })
}


/** 走本站服务器代理时，认证用登录 token；直连第三方时用用户自己的 key */
function authBearer(cfg: AiConfig): string {
  if (cfg.baseUrl.startsWith('/api')) {
    const t = typeof localStorage !== 'undefined' ? localStorage.getItem('echo:token') : ''
    if (t) return 'Bearer ' + t
  }
  return 'Bearer ' + cfg.apiKey
}

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s)
const capFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** 把学习者自己说的句子收紧：缩略、去填充词、去「I think that」这类垫话 */
const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bdo not\b/gi, "don't"],
  [/\bdoes not\b/gi, "doesn't"],
  [/\bdid not\b/gi, "didn't"],
  [/\bis not\b/gi, "isn't"],
  [/\bare not\b/gi, "aren't"],
  [/\bwas not\b/gi, "wasn't"],
  [/\bwere not\b/gi, "weren't"],
  [/\bcannot\b/gi, "can't"],
  [/\bcan not\b/gi, "can't"],
  [/\bcould not\b/gi, "couldn't"],
  [/\bwould not\b/gi, "wouldn't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\bhave not\b/gi, "haven't"],
  [/\bhas not\b/gi, "hasn't"],
  [/\bI am\b/g, "I'm"],
  [/\bI have\b/g, "I've"],
  [/\bI will\b/g, "I'll"],
  [/\bit is\b/gi, "it's"],
  [/\bthat is\b/gi, "that's"],
  [/\bthere is\b/gi, "there's"],
  [/\bthey are\b/gi, "they're"],
  [/\bwe are\b/gi, "we're"],
  [/\byou are\b/gi, "you're"],
  [/\bI think that\b/gi, "I'd say"],
  [/\bI think\b/gi, "I'd say"],
  [/\bkind of\b/gi, ''],
  [/\bsort of\b/gi, ''],
  [/\byou know\b/gi, ''],
]

function polish(s: string): string {
  let t = s.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  for (const [re, to] of CONTRACTIONS) t = t.replace(re, to)
  return t.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim()
}
const stripEnd = (s: string) => s.replace(/[.!?]+\s*$/, '')

const EMBED_START = /^(i|we|you|he|she|it|they|the|this|that|these|those|there|most|many|every|people|candidates?|interviewers?)\b/i
const FINITE_VERB =
  /\b(is|are|was|were|be|been|has|have|had|want|wants|wanted|need|needs|needed|said|says|say|told|tell|asked|ask|means|meant|makes|make|made|does|do|did|can|could|will|would|should|gives|give|took|take|looks|look|feels|feel|thinks|think|knows|know|works|work|seems|seem|keeps|keep)\b/i

function canEmbed(s: string): boolean {
  return EMBED_START.test(s) && FINITE_VERB.test(s)
}

function shorten(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

/** 基于材料原句给出完整句子的替换说法 */
function materialSuggestion(original: string, heard: string): Suggestion {
  const clean = original.replace(/\s+/g, ' ').replace(/^["“]+/, '').replace(/["”]+$/, '').trim()
  const bare = stripEnd(clean)
  const heardBit = heard.trim() ? `你当时记下的是「${shorten(heard, 60)}」。` : ''

  // 1) Tell me about X → 转述成陈述句
  const tellAbout = clean.match(/^tell me (?:a bit |a little |more )?about\s+(.+?)[.!?]*$/i)
  if (tellAbout) {
    const xRaw = stripEnd(tellAbout[1].trim())
    const x = stripEnd(revoice(xRaw))
    return {
      tier: 'replace',
      original: clean,
      coreIssue: `材料里对应的是这句：他让你谈谈「${xRaw}」。${heardBit}先把这句听懂，再用一句完整的话讲出来。`,
      options: [
        { text: `He asked me about ${x}.`, register: '中性', note: '问句转陈述，最省力' },
        { text: `Then he wanted to know about ${x}.`, register: '口语', note: '口语里 wanted to know 很自然' },
        { text: `His question was about ${x}.`, register: '正式', note: '正式转述，适合综述开头' },
      ],
      source: 'offline',
    }
  }

  // 2) 疑问句：能转成陈述的（What's the X?）优先转，其余用引用框架
  const isQuestion =
    /\?$/.test(clean) ||
    /^(what|why|how|when|where|who|whom|which|do|does|did|is|are|was|were|can|could|would|should|have|has|tell me)\b/i.test(clean)
  if (isQuestion) {
    const whatQ = clean.match(/^what(?:'s| is| are)\s+(.+?)\?*$/i)
    const rest = whatQ ? stripEnd(revoice(whatQ[1].trim())) : ''
    const nounPhrase = /^(the|a|an|my|his|her|their|our|this|that|these|those)\b/i.test(rest)
    if (rest && nounPhrase) {
      const verb = /^what are\b/i.test(clean) ? 'were' : 'was'
      return {
        tier: 'replace',
        original: clean,
        coreIssue: `材料里对应的是这句提问。${heardBit}把它转成陈述句，再用一句话讲出来。`,
        options: [
          { text: `He asked what ${rest} ${verb}.`, register: '中性', note: '疑问句 → 陈述句，最像综述' },
          { text: `Then he asked, and I'll quote him: “${clean}”`, register: '口语', note: '引用原句，最安全' },
          { text: `His question was exactly this: “${clean}”`, register: '正式', note: '正式转述' },
        ],
        source: 'offline',
      }
    }
    return {
      tier: 'replace',
      original: clean,
      coreIssue: `材料里对应的是这句提问。${heardBit}综述里可以先把问题本身说清楚，再加一句你的回应。`,
      options: [
        { text: `He put the question like this: “${clean}”`, register: '中性', note: '把原问题嵌进自己的句子' },
        { text: `Then he asked, and I'll quote him: “${clean}”`, register: '口语', note: '口语里最省力的转述' },
        { text: `His question was exactly this: “${clean}”`, register: '正式', note: '综述里交代信息源' },
      ],
      source: 'offline',
    }
  }

  // 3) 陈述句：能嵌进 that 从句就嵌，否则用引用框架
  if (canEmbed(clean)) {
    const body = lowerFirst(revoice(bare))
    return {
      tier: 'replace',
      original: clean,
      coreIssue: `材料里对应的是这句。${heardBit}先把它变成一句你能说出口的陈述，再往下讲。`,
      options: [
        { text: `The point was that ${body}.`, register: '中性', note: '最稳的转述框架' },
        { text: `What he meant was that ${body}.`, register: '口语', note: '强调"他的意思"' },
        { text: `The gist of it was that ${body}.`, register: '正式', note: '综述里交代大意' },
      ],
      source: 'offline',
    }
  }

  return {
    tier: 'replace',
    original: clean,
    coreIssue: `材料里对应的是这一句。${heardBit}先照着它说一遍，比凭印象说错强。`,
    options: [
      { text: `He said this: ${clean}`, register: '中性', note: '引用原句，最安全' },
      { text: `What he actually said was: ${clean}`, register: '口语', note: '口语里的强调式引用' },
      { text: `His exact words were: ${clean}`, register: '正式', note: '正式转述' },
    ],
    source: 'offline',
  }
}

/* ------------------------------------------------------------------ */
/* 离线兜底：没有材料（即兴）时按标签给完整句子                          */
/* ------------------------------------------------------------------ */

const TAG_TIER: Record<TagKey, SuggestionTier> = {
  wordgap: 'upgrade',
  wrong: 'must',
  verbose: 'upgrade',
  unnatural: 'upgrade',
  tone: 'upgrade',
  broken: 'replace',
}

function cleanOptions(list: SuggestionOption[]): SuggestionOption[] {
  return list
    .filter((o) => o.text && o.text.trim())
    .slice(0, 3)
    .map((o) => ({ ...o, register: register(o.register) }))
}

function matchPhrase(query: string) {
  const q = query.toLowerCase()
  for (const entry of PHRASE_BANK) {
    if (entry.keys.some((k) => q.includes(k.toLowerCase()))) return entry
  }
  return null
}

/** 用户想表达的是一个"判断"（这种说法不准确 / 站不住 / 以偏概全…）。
 *  这类卡点不需要绕词，直接给完整的判断句。 */

function matchJudgement(intent: string): SuggestionOption[] | null {
  const text = intent.trim()
  if (!text) return null
  const hit = JUDGEMENTS.find((j) => j.re.test(text))
  return hit ? hit.options : null
}

function rotate<T>(items: T[], by: number): T[] {
  if (items.length === 0) return items
  const k = ((by % items.length) + items.length) % items.length
  return [...items.slice(k), ...items.slice(0, k)]
}

function offlineCore(
  tag: TagKey,
  heard: string,
  intent: string,
  materialText?: string,
  variant = 0,
): Suggestion {
  const heardText = heard.trim()

  // 1) 明显的硬伤优先（用户自己那句里的错）
  if ((tag === 'wrong' || tag === 'unnatural') && heardText) {
    const hit = ERRORS.find((e) => e.re.test(heardText))
    if (hit) {
      return {
        tier: 'must',
        coreIssue: `「${hit.wrong}」→「${hit.right}」：${hit.note}。先把这一处改掉，其余不动。`,
        options: cleanOptions([
          { text: heardText.replace(hit.re, hit.right), register: '中性', note: '最小改动版：只修这一处' },
        ]),
        source: 'offline',
      }
    }
  }

  // 2) 有材料：先定位原句，再给完整句子（这是产品的主路径）
  if (materialText) {
    const original = findOriginal(materialText, heard, intent)
    if (original) return materialSuggestion(original, heard)
  }

  // 2.5) 用户想说的是一个判断：直接给判断句，不要退化成"绕词"
  const judgement = matchJudgement(intent)
  if (judgement) {
    const said = heardText ? `你录到的是「${shorten(heardText, 40)}」，要说的其实是「${shorten(intent, 40)}」。` : ''
    return {
      tier: 'replace',
      coreIssue: `${said}这不是缺词，是没把判断直接说出口。挑一句说出来就行。`,
      options: cleanOptions(rotate(judgement, variant).slice(0, 3)),
      source: 'offline',
      origin: 'intent',
    }
  }
  // 3) 中文概念命中短语库
  const phrase = matchPhrase(`${intent} ${heard}`.trim()) ?? (heardText ? matchPhrase(heardText) : null)
  if (phrase) {
    return {
      tier: 'upgrade',
      coreIssue: `「${phrase.concept}」在英语里没有一一对应的词，它是一族说法。挑一个顺口的，别背。`,
      options: cleanOptions(phrase.options),
      source: 'offline',
    }
  }

  // 4) 自己的句子也能升级：没有材料原句、也没有中文概念命中时，
  //     不再丢一个通用模板，而是在用户自己的话上收紧（缩略、去垫话、换开头）。
  const polished = polish(heardText)
  const wordsInHeard = heardText.trim().split(/\s+/).filter(Boolean).length
  const looksClause =
    wordsInHeard >= 5 &&
    wordsInHeard <= 30 &&
    /\b(is|are|was|were|am|do|does|did|have|has|had|can|could|will|would|should|need|needs|think|want|wants|make|makes|get|gets|go|goes|say|says|know|knows|use|uses|work|works|feel|feels|mean|means|look|looks)\b/i.test(
      heardText,
    )
  if (polished && looksClause && (tag === 'unnatural' || tag === 'verbose')) {
    const bare = stripEnd(polished).replace(/^I'd say\s+/i, '')
    const core = /^I/.test(bare) ? bare : lowerFirst(bare)
    return {
      tier: 'upgrade',
      coreIssue:
        tag === 'unnatural'
          ? '意思已经对了，卡在「像不像人话」。先缩略、再换个开头，语气立刻就自然。'
          : '意思对，但句子太长、落点太晚。先把它压成一句，再补半句限定。',
      options: cleanOptions([
        { text: `${capFirst(stripEnd(polished))}.`, register: '中性', note: '缩略 + 去垫话，意思不变' },
        { text: `What I mean is, ${core}.`, register: '中性', note: '加个引子，边想边说' },
        { text: `Put it this way: ${core}.`, register: '口语', note: '换个开头，语气更松' },
      ]),
      source: 'offline',
    }
  }

  // 4.6) 弱表达
  const weak = WEAK_PATTERNS.find((w) => w.re.test(heardText))
  if (weak) {
    return { tier: 'upgrade', coreIssue: weak.hint, options: cleanOptions(weak.options), source: 'offline' }
  }

  // 5) 按标签兜底：也给完整句子，不给零碎连接词
  switch (tag) {
    case 'tone': {
      const soft = /软|委婉|客气|温和|别太|不想|冒犯/.test(intent)
      return {
        tier: 'upgrade',
        coreIssue: soft
          ? '你想把话说软，但软不等于含糊：先接住对方，再给一个具体的分歧。'
          : '你想把话说硬，就要删掉形容词，把动词和事实放在前面。',
        options: cleanOptions(
          soft
            ? [
                { text: 'I see your point, but I would look at it differently.', register: '中性', note: '先接住，再分歧' },
                { text: 'I wonder whether that is quite the whole picture.', register: '正式', note: '用提问代替否定' },
                { text: "Fair enough, but that's not how it works for us.", register: '口语', note: '先认同，再拉回自己' },
              ]
            : [
                { text: "I don't think that holds up, and here is why.", register: '中性', note: '直接摆事实' },
                { text: 'Let me be direct: that is not what we agreed on.', register: '正式', note: '先声明，再给结论' },
                { text: "That doesn't work for me.", register: '口语', note: '最短的拒绝' },
              ],
        ),
        source: 'offline',
      }
    }
    case 'broken':
      return {
        tier: 'replace',
        coreIssue: '这里断掉了，不是词的问题，是缺一句"把上一句接过去"的完整话。',
        options: cleanOptions([
          { text: "And that's exactly why this matters.", register: '中性', note: '把上一句接到意义' },
          { text: 'So that is where it gets tricky.', register: '口语', note: '停顿后给自己半秒' },
          { text: 'Which leads to a bigger question.', register: '正式', note: '把陈述推进一步' },
        ]),
        source: 'offline',
      }
    case 'verbose':
      return {
        tier: 'upgrade',
        coreIssue: '意思没错，但句子太长、落点太晚。英语口语更常见的是：一句结论，再补一句限定。',
        options: cleanOptions([
          { text: 'The short version is that it does not work as planned.', register: '中性', note: '先把结论说完' },
          { text: 'Put simply, we have a timing problem.', register: '正式', note: '一句定性' },
          { text: 'Bottom line: this is not going to happen on time.', register: '口语', note: '最口语的收束' },
        ]),
        source: 'offline',
      }
    case 'wordgap':
      return {
        tier: 'upgrade',
        coreIssue: intent
          ? `你卡在「${intent}」。先别找那个词，用一句完整的话把它解释出来——英语里这比准确用词更重要。`
          : '你卡住了。先别找那个词，用一句完整的话把它解释出来。',
        options: cleanOptions([
          { text: "I can't remember the exact word, but you know the kind of thing I mean.", register: '口语', note: '承认卡壳，继续往下说' },
          { text: 'Let me describe it instead of naming it.', register: '中性', note: '用描述替代术语' },
          { text: 'Let me put it in more general terms.', register: '正式', note: '升到上位概念' },
        ]),
        source: 'offline',
      }
    case 'wrong':
      return {
        tier: 'must',
        coreIssue: '离线库没识别出具体错误。先做结构检查：主语、谓语、时态是否对齐，再谈用词。',
        options: cleanOptions([
          { text: 'Let me say that again more carefully.', register: '中性', note: '重来一遍的最短起手式' },
          { text: 'What I meant to say was this.', register: '口语', note: '先认错，再重说' },
          { text: 'To restate that more precisely.', register: '正式', note: '正式场合的自我纠正' },
        ]),
        source: 'offline',
      }
    default:
      return {
        tier: TAG_TIER[tag] ?? 'upgrade',
        coreIssue: '把这句说得更利落：先给立场，再给理由，最后才给限定。',
        options: cleanOptions([
          { text: 'The point is that this changes how we work.', register: '中性', note: '立场先行' },
          { text: 'What matters here is how it plays out in practice.', register: '正式', note: '把讨论拉回现实' },
          { text: "Here's the thing: it's not about the money.", register: '口语', note: '先抛钩子' },
        ]),
        source: 'offline',
      }
  }
}

export function offlineSuggest(
  tag: TagKey,
  heard: string,
  intent: string,
  materialText?: string,
  variant = 0,
): Suggestion {
  const s = offlineCore(tag, heard, intent, materialText, variant)
  if (materialText && !s.original && s.origin !== 'intent') {
    return {
      ...s,
      coreIssue: `材料里没有和这句对应的原文（你是在讲自己的判断，不是复述材料）。${s.coreIssue}`,
    }
  }
  return s
}

/* ------------------------------------------------------------------ */
/* 远程模型                                                            */
/* ------------------------------------------------------------------ */

function extractJson(raw: string): any {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

async function remoteSuggest(
  cfg: AiConfig,
  tag: TagKey,
  heard: string,
  intent: string,
  tagLabel: string,
  material?: { title?: string; text?: string },
  variant = 0,
): Promise<Suggestion | null> {
  const base = cfg.baseUrl.replace(/\/+$/, '')
  const url = `${base}/chat/completions`
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 30000)
  const materialBlock = material?.text
    ? `material title: ${material.title ?? '(unknown)'}\nmaterial transcript:\n"""\n${material.text.slice(0, 6000)}\n"""`
    : 'material: (none — this is free speaking)'
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authBearer(cfg),
      },
      body: JSON.stringify({
        model: cfg.model || 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `${materialBlock}\ntag: ${tagLabel}\nwhat I actually said: ${
              heard || '(no transcript available)'
            }\nwhat I was trying to say (Chinese): ${intent || '(not provided)'}${
              variant > 0 ? `\n(this is retry #${variant}: give a genuinely different set of options)` : ''
            }`,
          },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} ${body.slice(0, 120)}`)
    }
    const data = await res.json()
    const content: string = data?.choices?.[0]?.message?.content ?? ''
    const parsed = extractJson(content)
    if (!parsed || !Array.isArray(parsed.options) || parsed.options.length === 0) return null
    const tier: SuggestionTier = ['must', 'upgrade', 'replace'].includes(parsed.tier) ? parsed.tier : 'upgrade'
    return {
      tier,
      coreIssue: String(parsed.coreIssue ?? '').slice(0, 240) || '（模型未给出解释）',
      original: parsed.original ? String(parsed.original).slice(0, 400) : undefined,
      gist: parsed.gist ? String(parsed.gist).slice(0, 200) : undefined,
      options: cleanOptions(
        parsed.options.map((o: any) => ({
          text: String(o?.text ?? '').slice(0, 300),
          register: String(o?.register ?? '中性'),
          note: o?.note ? String(o.note).slice(0, 80) : undefined,
        })),
      ),
      source: 'remote',
    }
  } catch (err) {
    console.warn('[echo] 远程建议失败，回退离线库', err)
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

/* ------------------------------------------------------------------ */
/* 材料主旨：录完综述后先给一版"该怎么说"的参考                          */
/* ------------------------------------------------------------------ */
export interface MaterialGist {
  lines: string[]
  source: 'offline' | 'remote'
}


function offlineGist(text: string): string[] {
  const all = splitSentences(text)
  if (all.length === 0) return []
  const head = all[0]
  const headTokens = new Set(tokens(head))
  const scored = all
    .slice(1)
    .map((s, i) => ({ s, i, shared: tokens(s).filter((t) => headTokens.has(t)).length }))
    .sort((a, b) => b.shared - a.shared || a.i - b.i)
  const picked = scored
    .slice(0, 2)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)
  return [head, ...picked].slice(0, 3)
}

async function remoteGist(cfg: AiConfig, material: { title?: string; text: string }): Promise<string[] | null> {
  const base = cfg.baseUrl.replace(/\/+$/, '')
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authBearer(cfg),
      },
      body: JSON.stringify({
        model: cfg.model || 'gpt-4o-mini',
        temperature: 0.5,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: GIST_PROMPT },
          {
            role: 'user',
            content: `material title: ${material.title ?? '(unknown)'}\ntranscript:\n"""\n${material.text.slice(
              0,
              6000,
            )}\n"""`,
          },
        ],
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const parsed = extractJson(String(data?.choices?.[0]?.message?.content ?? ''))
    const lines = Array.isArray(parsed?.gist)
      ? parsed.gist.map((x: any) => String(x).trim()).filter((x: string) => x.length > 8)
      : []
    return lines.length ? lines.slice(0, 5) : null
  } catch (err) {
    console.warn('[echo] 远程主旨失败，回退离线抽取', err)
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

export async function summarizeMaterial(args: {
  cfg: AiConfig
  material: { id?: string; title?: string; text: string }
}): Promise<MaterialGist> {
  const { cfg, material } = args
  if (cfg.mode === 'remote' && cfg.apiKey) {
    const lines = await remoteGist(cfg, material)
    if (lines?.length) return { lines, source: 'remote' }
  }
  const written = gistOf(material.id)
  return { lines: written?.length ? written : offlineGist(material.text), source: 'offline' }
}

/* ------------------------------------------------------------------ */
/* 即兴题：把你大概想说的，重说成口语版                                  */
/* ------------------------------------------------------------------ */
export interface SpokenRewrite {
  lines: string[]
  notes: string[]
  source: 'offline' | 'remote'
}


function stripFillers(text: string): string {
  let s = text.replace(/\b(um+|uh+|er+|ah+|you know|i mean|sort of|kind of|like,)\b/gi, ' ')
  s = s.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').trim()
  s = s.replace(/(^|[.!?]\s+)([a-z])/g, (_m, p1, p2) => p1 + p2.toUpperCase())
  if (s && !/[.!?]$/.test(s)) s += '.'
  return s
}

function offlineRewrite(transcript: string): SpokenRewrite {
  const cleaned = stripFillers(transcript)
  if (!cleaned) return { lines: [], notes: [], source: 'offline' }
  const parts = cleaned.match(/[^.!?]+[.!?]+/g) ?? [cleaned]
  const lines = parts.map((x) => x.trim()).filter((x) => x.length > 3).slice(0, 4)
  return {
    lines,
    notes: ['离线版只去掉了口头填充词，没有改写。配上远程模型，会先猜你想说什么，再重说一遍。'],
    source: 'offline',
  }
}

const countWords = (s: string) => s.split(' ').filter(Boolean).length

function normalizeLines(parsed: any): string[] {
  const raw: any[] = Array.isArray(parsed?.lines) ? parsed.lines : []
  const flat = raw
    .map((x) => String(x).trim())
    .filter(Boolean)
    .flatMap((s: string) => (s.length > 160 ? splitSentences(s) : [s]))
  return flat.filter((s: string) => s.length > 5).slice(0, 12)
}

async function remoteRewrite(
  cfg: AiConfig,
  args: { topic?: string; transcript: string; hint?: string },
): Promise<SpokenRewrite | null> {
  const base = cfg.baseUrl.endsWith('/') ? cfg.baseUrl.slice(0, -1) : cfg.baseUrl
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: REWRITE_PROMPT },
    {
      role: 'user',
      content: `question: ${args.topic || '(unknown)'}
transcript:
"""
${
        args.transcript || '(no transcript — the browser recognition failed)'
      }
"""
what I meant (Chinese, may be empty): ${args.hint || '(not provided)'}`,
    },
  ]

  const callOnce = async (msgs: Array<{ role: string; content: string }>, temperature: number) => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 45000)
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: authBearer(cfg) },
        body: JSON.stringify({
          model: cfg.model || 'gpt-4o-mini',
          temperature,
          max_tokens: 900,
          response_format: { type: 'json_object' },
          messages: msgs,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return String(data?.choices?.[0]?.message?.content ?? '')
    } finally {
      window.clearTimeout(timer)
    }
  }

  try {
    let parsed: any = extractJson(await callOnce(messages, 0.5))
    let lines = normalizeLines(parsed)
    let words = countWords(lines.join(' '))

    // 模型爱偷懒：太短就再要一遍，只加长度、不加事实
    if (lines.length && words < 95) {
      const expand = [
        ...messages,
        { role: 'assistant', content: JSON.stringify({ lines, changes: [] }) },
        {
          role: 'user',
          content: `Too short: ${words} words. Expand the SAME answer to 110-130 words in 6-8 sentences.` +
            ` Keep the same position and the same examples. You may add one ordinary detail a student could plausibly say,` +
            ` but do NOT invent personal stories, names, numbers, studies or news. Use contractions and spoken wording` +
            ` (no "Moreover", "crucial", "implement", "Additionally"). Return the JSON again.`,
        },
      ]
      const second = extractJson(await callOnce(expand, 0.6))
      const lines2 = normalizeLines(second)
      if (countWords(lines2.join(' ')) > words) {
        parsed = second
        lines = lines2
      }
    }

    if (!lines.length) return null
    const notes = Array.isArray(parsed?.changes)
      ? parsed.changes
          .map((x: any) => String(x).trim())
          .filter((x: string) => x.length > 1)
          .slice(0, 4)
      : []
    return { lines, notes, source: 'remote' }
  } catch (err) {
    console.warn('[echo] 远程复述失败，回退离线', err)
    return null
  }
}

export async function rewriteSpoken(args: {
  cfg: AiConfig
  topic?: string
  transcript: string
  hint?: string
}): Promise<SpokenRewrite> {
  const { cfg, topic, transcript, hint } = args
  if (cfg.mode === 'remote' && cfg.apiKey.trim()) {
    const remote = await remoteRewrite(cfg, { topic, transcript, hint })
    if (remote) return remote
  }
  return offlineRewrite(transcript)
}

export async function getSuggestion(args: {
  cfg: AiConfig
  tag: TagKey
  tagLabel: string
  heard: string
  intent: string
  material?: { title?: string; text?: string }
  /** 第几次生成（0 = 第一次）。用来换出不同的说法。 */
  variant?: number
}): Promise<Suggestion> {
  const { cfg, tag, tagLabel, heard, intent, material, variant = 0 } = args
  if (cfg.mode === 'remote' && cfg.apiKey.trim()) {
    const remote = await remoteSuggest(cfg, tag, heard, intent, tagLabel, material, variant)
    if (remote) return remote
    const fallback = offlineSuggest(tag, heard, intent, material?.text, variant)
    return { ...fallback, coreIssue: `${fallback.coreIssue}（远程模型调用失败，本条由离线库生成）` }
  }
  return offlineSuggest(tag, heard, intent, material?.text, variant)
}
