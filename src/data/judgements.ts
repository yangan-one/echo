import type { SuggestionOption } from '../types'

// 中文意图是「判断/评价」时，直接给完整判断句，而不是绕词策略
export const JUDGEMENTS: Array<{ re: RegExp; options: SuggestionOption[] }> = [
  {
    re: /(不准确|不正确|不对|错了|错误|有误|不实)/,
    options: [
      { text: "That claim isn't accurate.", register: '中性', note: '最直接的一句否定' },
      { text: "I don't think that's right.", register: '口语', note: '缓和一点，但立场清楚' },
      { text: "That's not quite true.", register: '中性', note: '留了余地：不是全错' },
      { text: "I'd have to disagree with that.", register: '正式', note: '正式场合的反对' },
      { text: 'That statement is simply wrong.', register: '正式', note: '最硬的一版' },
    ],
  },
  {
    re: /(站不住|没根据|没有根据|缺乏依据|没有依据|不成立|证据)/,
    options: [
      { text: "That claim doesn't hold up.", register: '中性', note: '论点经不起检验' },
      { text: "There's no evidence for that.", register: '中性', note: '直接把举证责任推回去' },
      { text: "That argument doesn't stand.", register: '正式', note: '书面感稍强' },
      { text: "I don't see what that's based on.", register: '口语', note: '口语里的质疑' },
      { text: "That's an assumption, not a finding.", register: '正式', note: '区分假设与结论' },
    ],
  },
  {
    re: /(片面|以偏概全|一概而论|太绝对|过于绝对)/,
    options: [
      { text: "That's a generalization.", register: '中性', note: '一句话点出问题' },
      { text: "That's only part of the picture.", register: '中性', note: '承认一部分，指出不全' },
      { text: "You're taking one case and treating it as the rule.", register: '口语', note: '把逻辑讲清楚' },
      { text: "That's too broad a claim.", register: '正式', note: '针对论断范围' },
      { text: 'That holds in some cases, not all.', register: '中性', note: '让步式反驳' },
    ],
  },
  {
    re: /(夸大|夸张|言过其实|危言耸听)/,
    options: [
      { text: "That's an overstatement.", register: '中性', note: '直接点出夸大' },
      { text: "I think you're exaggerating the effect.", register: '口语', note: '对人不对事一点' },
      { text: "That's stronger than the evidence allows.", register: '正式' },
      { text: "That makes it sound worse than it is.", register: '中性' },
    ],
  },
  {
    re: /(过时|不合时宜|老黄历)/,
    options: [
      { text: "That's outdated.", register: '中性' },
      { text: 'That was true ten years ago, not now.', register: '口语', note: '用时间对比说明' },
      { text: 'The situation has moved on since then.', register: '正式' },
    ],
  },
  {
    re: /(双标|双重标准|两套标准)/,
    options: [
      { text: "That's a double standard.", register: '中性' },
      { text: "You're applying a different rule here.", register: '口语' },
      { text: "I don't think the same standard is being applied.", register: '正式' },
    ],
  },
]
