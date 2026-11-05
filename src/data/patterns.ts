// 离线建议用到的硬伤规则与中英提示词（从 lib/ai.ts 拆出来，只放数据）

/** 高频硬伤：离线也能抓到的错误 */
export const ERRORS: Array<{ re: RegExp; wrong: string; right: string; note: string }> = [
  { re: /\bI am agree\b/i, wrong: 'I am agree', right: 'I agree', note: '"agree" 本身就是动词，不需要 be 动词' },
  { re: /\bmore better\b/i, wrong: 'more better', right: 'better', note: 'better 已是比较级，不能再加 more' },
  { re: /\bdiscuss about\b/i, wrong: 'discuss about', right: 'discuss', note: 'discuss 是及物动词，直接接宾语' },
  { re: /\baccording to me\b/i, wrong: 'according to me', right: 'in my view', note: 'according to 用于第三方消息来源' },
  { re: /\bhow to say\b/i, wrong: 'how to say', right: 'how do you say', note: '独立疑问句要有助动词' },
  { re: /\bthere (have|has)\b/i, wrong: 'there have', right: 'there are', note: '表示"存在"用 there be，不用 there have' },
  {
    re: /\b(he|she|it) (have|go|do|make|take|need|want|think|say|feel|look)\b/i,
    wrong: '三单动词',
    right: '加 -s / -es',
    note: '主语是第三人称单数时，一般现在时的动词要变形',
  },
  { re: /\bvery (like|want|hope|need|enjoy)\b/i, wrong: 'very + 动词', right: 'really + 动词', note: 'very 修饰形容词/副词，修饰动词用 really / very much' },
  { re: /\bI very\b/i, wrong: 'I very + 形容词', right: 'I am very + 形容词', note: 'very 不能单独作谓语' },
  { re: /\bcan you tell me where is\b/i, wrong: 'where is…', right: 'where … is', note: '宾语从句用陈述语序' },
]

/* ------------------------------------------------------------------ */
/* 材料原句匹配：用户复述的那句话 → 材料里的哪一句                       */
/* ------------------------------------------------------------------ */

/** 中文意图 -> 英文词干提示（用于在材料原文里定位对应句） */
export const CN_HINTS: Array<[string, string[]]> = [
  ['问题', ['question', 'problem', 'ask']],
  ['错误', ['mistake', 'wrong', 'error', 'worst']],
  ['最', ['most', 'worst', 'hardest', 'difficult']],
  ['困难', ['difficult', 'hard', 'challeng']],
  ['面试', ['interview', 'interviewer', 'candidate']],
  ['诚实', ['honest', 'truth', 'open']],
  ['真诚', ['honest', 'genuine', 'sincere']],
  ['想要', ['want', 'wish', 'like']],
  ['希望', ['hope', 'want', 'wish']],
  ['经历', ['experience', 'face', 'faced']],
  ['挑战', ['challenge', 'difficult', 'hard']],
  ['答案', ['answer', 'respond', 'response']],
  ['问', ['ask', 'question']],
  ['说', ['said', 'say', 'tell', 'told']],
  ['建议', ['advice', 'suggest', 'recommend']],
  ['原因', ['reason', 'why', 'because']],
  ['看法', ['view', 'opinion', 'think']],
  ['工作', ['job', 'work']],
  ['钱', ['money', 'cost', 'pay']],
  ['时间', ['time', 'hour', 'minute']],
  ['学习', ['learn', 'study']],
  ['改变', ['change', 'shift']],
  ['重要', ['important', 'matter', 'key']],
]
