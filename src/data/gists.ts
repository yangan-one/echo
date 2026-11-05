/**
 * 每条素材的口语版主旨（3 句）。
 *
 * 为什么手写而不是让离线库"抽句"：抽句只能给原文骨架，不是综述。
 * 这 20 条是我们的原创示例素材，手写一版"该怎么说"的参考，
 * 离线也能给到"有逻辑的口语综述"；配远程模型时会用模型重新生成，
 * 覆盖用户自己上传的材料。
 */
export const MATERIAL_GISTS: Record<string, string[]> = {
  m01: [
    'He was asked whether regional cooperation has slowed down, and he pushed back on the premise.',
    "He said cooperation hasn't stopped — it just moved into smaller rooms, with fewer countries and narrower issues.",
    'So the test should be whether goods and people actually move across borders more easily, not how many joint statements get signed.',
  ],
  m02: [
    'The question was blunt: you say the money is committed, but it is not arriving.',
    'He admitted both are true — the promise stands, and the money is late — and said the delay is not evenly spread.',
    'His closing point was that a pledge nobody can trace is not really a pledge.',
  ],
  m03: [
    "The speaker's point was that failure is not a detour from the road, it is the road.",
    'What separates people who keep going is not talent, but that they record what went wrong and actually read it.',
    'So his advice is practical: write your mistakes down in detail, and go back to them before you try again.',
  ],
  m04: [
    'She argued that attention is not a battery that drains, it is a muscle that responds to training.',
    'If you switch tasks every ninety seconds all day, you are training yourself to be restless.',
    'So concentration is not something you have — it is something you are practising, for better or worse.',
  ],
  m05: [
    'Three coastal cities have agreed to study managed retreat — moving neighbourhoods away from the water instead of rebuilding them.',
    'The study takes eighteen months and commits nobody to anything.',
    "Critics say that is exactly the point.",
  ],
  m06: [
    'A new round of model compression reportedly cut inference costs by about a third in internal tests.',
    'The numbers have not been published.',
    'Independent researchers warn that internal benchmarks often do not survive contact with real traffic.',
  ],
  m07: [
    'He was asked what the hardest question he asks candidates is, and his answer was: tell me about something you got wrong.',
    'Most people describe a difficult project or a slow team, but they leave themselves out of the sentence.',
    'He is not looking for a confession — he wants to see whether you can hold "I did this, it did not work, and I know why" all at once.',
  ],
  m08: [
    'He thinks habits are not about willpower — willpower is only what you use before the habit exists.',
    'The real game is making the good behaviour cheaper than the alternative, like leaving your shoes by the door.',
    'So the useful question is not how to motivate yourself, but what is the smallest change to your environment.',
  ],
  m09: [
    'This is a short exchange at a café.',
    'The customer orders a flat white with oat milk, asks about a seeded roll, and decides to take one.',
    'The total comes to seven forty.',
  ],
  m10: [
    'This is a viewing conversation about a flat.',
    'The tenant asks about the neighbours and about the heating, and the agent admits the electric heating is expensive in winter.',
    'The deposit is six weeks of rent.',
  ],
  m11: [
    'The speaker says the idea that memory works like a recording is wrong in almost every part.',
    'What actually happens is that you rebuild the event each time you recall it, out of fragments and expectations.',
    'And because rebuilding alters the memory slightly, repeated questioning can change what a witness sincerely remembers.',
  ],
  m12: [
    'Sunk cost is usually called a mistake, but that framing hides why it is so hard to drop.',
    'Admitting a project was a bad idea is not an accounting adjustment, it is a statement about your own judgment.',
    'So "ignore sunk costs" barely helps — what helps is making it socially acceptable to be wrong early.',
  ],
  m13: [
    'The state transport department says bus fares will stay the same next financial year, even though fuel costs rose.',
    'Officials say the subsidy will come out of the existing budget.',
    'No new levy is planned at this stage.',
  ],
  m14: [
    'He is frustrated by how quickly everyone moved on from an issue that dominated six months ago.',
    'He is not saying the problem is solved.',
    'He is saying we have a very short attention span for problems without a deadline.',
  ],
  m15: [
    'They are talking about how a meeting went.',
    'Words like "interesting" and "a robust exchange of views" turn out to mean that nothing happened and nobody wants to say so.',
    'In the end he just admits it was bad.',
  ],
  m16: [
    'The most underrated move in a negotiation is silence — not aggression, just letting a sentence end.',
    'Most of us fill the pause by explaining, softening, or offering options nobody asked for, and each of those is a concession.',
    'So make your point, stop, count to five, and let the other side speak first.',
  ],
  m17: [
    'A survey of four hundred graduates found just under half had returned to their home cities within two years, mostly because of rent, family and childcare.',
    'That cuts against the assumption that talent only flows one way.',
    'The researchers warn the sample skews towards people who already had a job offer, so the pull of big cities may be delayed rather than reversed.',
  ],
  m18: [
    'Most meetings exist because someone did not want to make the decision alone.',
    'Nobody writes down what the group is deciding, so the meeting becomes thinking out loud, which is expensive with nine people in the room.',
    'The fix is a one-line memo before the meeting: the decision, the two options, and your recommendation.',
  ],
  m19: [
    'His flight was cancelled and he is going to miss his connection in Amsterdam.',
    'The earliest option is tomorrow at six; Frankfurt is full, and Dublin has a seat but lands too late.',
    'So he is offered the six o’clock flight plus a room for tonight.',
  ],
  m20: [
    'Word-for-word translation fails not because words lack meaning, but because meaning is distributed differently across languages.',
    'The translator is not moving labels from one box to another, they are rebuilding a structure that has to carry the same weight.',
    'So the useful question is not what a word means, but what the sentence is doing, and what would do that job here.',
  ],
}

export function gistOf(id?: string): string[] | undefined {
  if (!id) return undefined
  return MATERIAL_GISTS[id]
}
