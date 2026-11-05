import type { SuggestionOption } from '../types'

export interface PhraseEntry {
  /** 触发关键词（中文或英文） */
  keys: string[]
  concept: string
  options: SuggestionOption[]
}

/**
 * 离线短语库：中文概念 → 一族英语表达（不是唯一答案）
 * 这是「一对多」的最小实现，也是离线模式的主要价值来源。
 */
export const PHRASE_BANK: PhraseEntry[] = [
  {
    keys: ['各取所长', '取长补短', '优势互补'],
    concept: '各取所长',
    options: [
      { text: "leverage each other's strengths", register: '正式', note: '商务、合作场景最常用' },
      { text: 'play to our respective strengths', register: '中性', note: '偏团队分工' },
      { text: 'we each bring what the other lacks', register: '口语', note: '最口语，解释性最强' },
    ],
  },
  {
    keys: ['权衡利弊', '权衡', '两害相权'],
    concept: '权衡利弊',
    options: [
      { text: 'weigh the pros and cons', register: '中性' },
      { text: 'weigh the trade-offs', register: '正式', note: '强调取舍，不强调好坏' },
      { text: 'look at what we gain and what we give up', register: '口语' },
    ],
  },
  {
    keys: ['说到底', '归根结底'],
    concept: '说到底',
    options: [
      { text: 'at the end of the day', register: '口语', note: '最自然，口译高频' },
      { text: 'ultimately', register: '正式', note: '一个词，最省' },
      { text: 'when you get right down to it', register: '口语' },
    ],
  },
  {
    keys: ['从长远看', '长远来看', '长期来看'],
    concept: '从长远看',
    options: [
      { text: 'in the long run', register: '中性' },
      { text: 'over the longer term', register: '正式' },
      { text: 'down the line', register: '口语' },
    ],
  },
  {
    keys: ['无可厚非', '情有可原'],
    concept: '无可厚非',
    options: [
      { text: "that's entirely defensible", register: '正式' },
      { text: "there's nothing wrong with that", register: '中性' },
      { text: 'fair enough', register: '口语', note: '两个词解决，最省力' },
    ],
  },
  {
    keys: ['见仁见智', '仁者见仁'],
    concept: '见仁见智',
    options: [
      { text: 'reasonable people disagree', register: '正式' },
      { text: "it's a matter of judgment", register: '中性' },
      { text: 'different strokes', register: '口语' },
    ],
  },
  {
    keys: ['一针见血', '说到了点子上'],
    concept: '一针见血',
    options: [
      { text: 'that cuts to the heart of it', register: '中性' },
      { text: "that's precisely the point", register: '正式' },
      { text: 'spot on', register: '口语' },
    ],
  },
  {
    keys: ['大势所趋', '趋势所向'],
    concept: '大势所趋',
    options: [
      { text: 'the direction of travel', register: '正式', note: '英式时事评论常用' },
      { text: 'where things are heading', register: '中性' },
      { text: "which way the wind's blowing", register: '口语' },
    ],
  },
  {
    keys: ['留有余地', '留有空间'],
    concept: '留有余地',
    options: [
      { text: 'leave room for manoeuvre', register: '正式' },
      { text: 'keep our options open', register: '中性' },
      { text: "not lock ourselves in", register: '口语' },
    ],
  },
  {
    keys: ['因人而异'],
    concept: '因人而异',
    options: [
      { text: 'it varies from person to person', register: '中性' },
      { text: 'it depends on the individual', register: '正式' },
      { text: 'horses for courses', register: '口语', note: '英式习语，用错场合会突兀' },
    ],
  },
  {
    keys: ['难以两全', '不能两全', '两头兼顾'],
    concept: '难以两全',
    options: [
      { text: "you can't have it both ways", register: '中性' },
      { text: 'the two goals are in tension', register: '正式' },
      { text: 'something has to give', register: '口语' },
    ],
  },
  {
    keys: ['有所保留', '持保留意见'],
    concept: '有所保留',
    options: [
      { text: "I'd qualify that", register: '正式' },
      { text: "I'm not entirely convinced", register: '中性' },
      { text: "I'd take that with a pinch of salt", register: '口语' },
    ],
  },
  {
    keys: ['顺理成章', '水到渠成'],
    concept: '顺理成章',
    options: [
      { text: 'it follows naturally', register: '中性' },
      { text: "that's the logical next step", register: '正式' },
      { text: 'it kind of falls into place', register: '口语' },
    ],
  },
  {
    keys: ['不容忽视', '不可忽视'],
    concept: '不容忽视',
    options: [
      { text: "that's not a minor consideration", register: '正式' },
      { text: "we shouldn't underestimate that", register: '中性' },
      { text: "that's a big deal", register: '口语' },
    ],
  },
  {
    keys: ['打折扣', '打点折扣'],
    concept: '打折扣',
    options: [
      { text: 'that takes something away from it', register: '中性' },
      { text: 'it undercuts the claim', register: '正式' },
      { text: "it doesn't quite hold up", register: '口语' },
    ],
  },
  {
    keys: ['有目共睹', '显而易见'],
    concept: '有目共睹',
    options: [
      { text: "that's plain for everyone to see", register: '中性' },
      { text: 'the record speaks for itself', register: '正式' },
      { text: 'everyone can see it', register: '口语' },
    ],
  },
  {
    keys: ['举一反三'],
    concept: '举一反三',
    options: [
      { text: 'draw the general lesson from one case', register: '正式' },
      { text: 'apply it more broadly', register: '中性' },
      { text: 'connect the dots', register: '口语' },
    ],
  },
  {
    keys: ['循序渐进', '一步一步来'],
    concept: '循序渐进',
    options: [
      { text: 'take it step by step', register: '中性' },
      { text: 'proceed incrementally', register: '正式' },
      { text: 'one thing at a time', register: '口语' },
    ],
  },
  {
    keys: ['相辅相成', '互相促进'],
    concept: '相辅相成',
    options: [
      { text: 'the two reinforce each other', register: '中性' },
      { text: "they're mutually reinforcing", register: '正式' },
      { text: 'each one makes the other work better', register: '口语' },
    ],
  },
  {
    keys: ['换个说法', '我的意思是', '说清楚一点'],
    concept: '换个说法',
    options: [
      { text: 'let me put that another way', register: '中性' },
      { text: 'to be more precise', register: '正式' },
      { text: 'what I mean is', register: '口语' },
    ],
  },
  {
    keys: ['不太确定', '不敢苟同', '不太认同'],
    concept: '我不太确定',
    options: [
      { text: "I'm not fully persuaded", register: '正式' },
      { text: "I'm not sure that adds up", register: '中性' },
      { text: "I don't quite buy that", register: '口语' },
    ],
  },
  {
    keys: ['不现实', '不太现实'],
    concept: '不现实',
    options: [
      { text: "that's not realistic", register: '中性' },
      { text: "that's hard to sustain in practice", register: '正式' },
      { text: "that's a stretch", register: '口语' },
    ],
  },
  {
    keys: ['关键在于', '重点是'],
    concept: '关键在于',
    options: [
      { text: 'the crux is', register: '正式' },
      { text: 'what really matters is', register: '中性' },
      { text: 'it comes down to', register: '口语' },
    ],
  },
  {
    keys: ['同意但是', '话虽如此', '我同意但'],
    concept: '同意，但是……',
    options: [
      { text: 'I take the point, but', register: '正式' },
      { text: 'fair point, though', register: '中性' },
      { text: 'yeah, but', register: '口语' },
    ],
  },
]

/** 简单词 → 更精准表达（离线兜底） */
export const WEAK_PATTERNS: Array<{ re: RegExp; hint: string; options: SuggestionOption[] }> = [
  {
    re: /\bvery (important|big|good|bad|hard|difficult)\b/i,
    hint: '「very + 形容词」是最典型的中式补偿：英语通常用一个更强的词，而不是加 very。',
    options: [
      { text: 'critical / substantial / serious', register: '正式', note: '按语境替换成单个强形容词' },
      { text: 'matters a great deal', register: '中性' },
      { text: "a big deal", register: '口语' },
    ],
  },
  {
    re: /\bI think\b/i,
    hint: '「I think」不是错，但连续出现会让立场变软。换成位置更靠前的立场表达。',
    options: [
      { text: 'My view is that…', register: '正式' },
      { text: 'I would argue that…', register: '中性' },
      { text: "I'd say…", register: '口语' },
    ],
  },
  {
    re: /\bthere (are|is) (many|a lot of)\b/i,
    hint: '「there are many…」是信息量最低的开头，直接说主体更利落。',
    options: [
      { text: 'Several factors drive this.', register: '正式' },
      { text: 'Two things stand out.', register: '中性', note: '给出数量，立刻具体' },
      { text: "A couple of things.", register: '口语' },
    ],
  },
  {
    re: /\bmake .{0,20}(better|worse)\b/i,
    hint: '「make … better」通常有一个现成的动词可以替换。',
    options: [
      { text: 'improve / strengthen / sharpen', register: '中性' },
      { text: 'enhance', register: '正式' },
      { text: 'make it work', register: '口语' },
    ],
  },
  {
    re: /\bin my opinion\b/i,
    hint: '「in my opinion」在口语里几乎总是冗余的，立场本身已经表明了是谁的观点。',
    options: [
      { text: '（直接删掉，从观点开始说）', register: '中性', note: '最推荐：删' },
      { text: 'As I see it,', register: '中性' },
      { text: 'To my mind,', register: '正式' },
    ],
  },
]
