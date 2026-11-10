import type { Material } from '../types'
import { REAL_MATERIALS } from './realMaterials'
import { REAL_MATERIALS_B } from './realMaterialsB'
import { REAL_MATERIALS_C } from './realMaterialsC'
import { REAL_MATERIALS_D } from './realMaterialsD'
import { OPENINGS } from './openings'
import { OPENING_ZH } from './openingsZh'
import { BIZ_MATERIALS } from './bizMaterials'

/**
 * 素材库 = 真人原声（TED 截取，见 realMaterials*.ts）+ 少量原创示例（TTS，标为「系统语音」）
 */
const AUTHORED: Material[] = [
  {
    id: 'm01',
    title: '记者会问答：如何看待区域合作',
    source: '双语平行 · 原创示例',
    category: '双语平行',
    seconds: 55,
    accent: '美音',
    reduction: '低',
    familiarity: '一般',
    text: `Question: Some observers say regional cooperation has slowed down over the past year. How do you respond?
Well, I'd push back on the premise a little. Cooperation hasn't slowed; it has changed shape. A lot of the work that used to happen on big stages now happens in smaller rooms, between fewer countries, on narrower issues. That's less photogenic, but it's often more productive. If you measure cooperation by the number of joint statements, yes, the curve is flat. If you measure it by whether goods, people and ideas actually move across borders more easily than they did three years ago, the picture looks rather different. Our position is simple: we would rather have ten workable arrangements than one impressive announcement that nobody implements.`,
    textZh: `问：有观察人士认为，过去一年区域合作有所放缓。您如何回应？
这个前提我想稍微纠正一下。合作并没有放缓，它只是换了形态。过去发生在大型场合的工作，如今更多发生在小房间里，参与的国家更少，议题也更窄。这不够上镜，但往往更有效。如果你用联合声明的数量来衡量合作，那么曲线确实是平的。但如果你用货物、人员和思想是否比三年前更容易跨境流动来衡量，画面就完全不同了。我们的立场很简单：我们宁愿有十项可行的安排，也不要一个无人落实的漂亮宣言。`,
    note: '中英对照，适合做主旨综述与视译练习。',
  },
  {
    id: 'm02',
    title: '例行记者会：关于气候资金的追问',
    source: '双语平行 · 原创示例',
    category: '双语平行',
    seconds: 50,
    accent: '英音',
    reduction: '低',
    familiarity: '一般',
    text: `Follow-up question on climate finance. You said the commitment stands. But developing countries say the money isn't arriving. Which is it?
Both things can be true at once. The commitment stands, and the money is late. I'm not going to pretend otherwise. What I would say is that the delay is not evenly spread. Some of it is bureaucratic, some of it is political, and some of it is simply that the projects take longer to prepare than anyone expected. We are pushing for faster disbursement, and we are pushing for the reporting to be honest, because a pledge that can't be traced is not really a pledge.`,
    textZh: `关于气候资金的追问。您说承诺依然有效，但发展中国家表示资金并没有到位。到底是哪一种？
两件事可以同时成立。承诺依然有效，而资金确实迟到了。我不会假装不是这样。我想说的是，延迟并不是均匀分布的。有些是官僚程序，有些是政治因素，还有些仅仅是因为项目准备的时间超出了所有人的预期。我们正在推动更快拨付，也在推动报告更加诚实，因为一笔无法追溯的承诺，其实算不上承诺。`,
  },
  {
    id: 'm03',
    title: '毕业演讲：关于失败的那部分',
    source: '演讲 · 原创示例',
    category: '演讲',
    seconds: 58,
    accent: '美音',
    reduction: '低',
    familiarity: '熟悉',
    text: `When I graduated, I thought failure was a detour. It isn't. It's the road. The people you admire have failed more times than you have tried. What separates them isn't talent, it's that they kept a record of what went wrong and read it. That's the whole trick. Most of us take a hit, feel terrible for a week, and then quietly forget the details. The details are the only part that's useful. So my advice is unglamorous: keep a notebook of your own mistakes, be specific about them, and go back to it before you try again.`,
  },
  {
    id: 'm04',
    title: '演讲：注意力是被训练出来的',
    source: '演讲 · 原创示例',
    category: '演讲',
    seconds: 52,
    accent: '英音',
    reduction: '中',
    familiarity: '熟悉',
    text: `We talk about attention as if it were a battery that drains. I don't think that's right. Attention is closer to a muscle, and like any muscle it responds to how it's trained. If you spend four hours a day switching tasks every ninety seconds, you are not resting your attention, you are training it to be restless. And then you sit down to read something difficult and wonder why you can't. The uncomfortable conclusion is that the ability to concentrate is not something you have, it's something you're currently practising, for better or worse.`,
  },
  {
    id: 'm05',
    title: '新闻：沿海城市的搬迁难题',
    source: '新闻 · 原创示例',
    category: '新闻',
    seconds: 32,
    accent: '美音',
    reduction: '中',
    familiarity: '一般',
    text: `Officials in three coastal cities have agreed to a joint study on managed retreat, the politically awkward idea of moving neighbourhoods away from the water rather than rebuilding them. The study will take eighteen months and will not commit anyone to anything. Critics say that is the point.`,
  },
  {
    id: 'm06',
    title: '新闻：模型压缩带来的成本变化',
    source: '新闻 · 原创示例',
    category: '新闻',
    seconds: 30,
    accent: '英音',
    reduction: '中',
    familiarity: '陌生',
    text: `A new round of model compression work has cut inference costs by roughly a third in internal tests, according to two people familiar with the results. The numbers have not been published, and independent researchers caution that internal benchmarks rarely survive contact with real traffic.`,
  },
  {
    id: 'm07',
    title: '访谈：面试里那个最难的问题',
    source: '访谈 · 原创示例',
    category: '访谈',
    seconds: 46,
    accent: '美音',
    reduction: '中',
    familiarity: '熟悉',
    text: `Interviewer: What's the hardest question you ask candidates?
Honestly? "Tell me about something you got wrong." Most people can't do it. They'll describe a project that was difficult, or a team that was slow, but they won't put themselves in the sentence. And I'm not looking for a confession. I'm looking for whether they can hold two ideas at once: I did this, and it didn't work, and I know why. That's it. People who can do that are usually easy to work with.`,
  },
  {
    id: 'm08',
    title: '访谈：习惯不是靠意志力',
    source: '访谈 · 原创示例',
    category: '访谈',
    seconds: 55,
    accent: '澳音',
    reduction: '高',
    familiarity: '熟悉',
    text: `People think habits are about willpower, and they're really not. Willpower is what you use when the habit isn't there yet. The whole game is making the behaviour cheaper than the alternative. If your running shoes are by the door and your phone is in another room, you'll go running. Not because you're disciplined, but because you removed the friction. So the question isn't "how do I motivate myself", it's "what's the smallest change to the environment that makes the good thing the easy thing". That's a much more answerable question.`,
  },
  {
    id: 'm09',
    title: '生活：咖啡店里的一次闲聊',
    source: '生活 · 原创示例',
    category: '生活',
    seconds: 33,
    accent: '美音',
    reduction: '高',
    familiarity: '熟悉',
    text: `— Morning! What can I get you?
— Could I get a flat white, medium, oat milk?
— Sure. Anything to eat?
— Hmm, what's that thing in the corner? The one with the seeds on top.
— Oh, the seeded roll. It's got pumpkin and sesame. It's pretty good.
— Yeah, go on then. I'll take one.
— Nice. That'll be seven forty, whenever you're ready.`,
  },
  {
    id: 'm10',
    title: '生活：看房时你会问什么',
    source: '生活 · 原创示例',
    category: '生活',
    seconds: 44,
    accent: '英音',
    reduction: '高',
    familiarity: '熟悉',
    text: `— So this is the living room. South-facing, as you can see.
— It's lovely. Can I ask what the neighbours are like?
— Quiet, mostly. The couple below you work shifts, so they're out a lot.
— And the heating? Is it included?
— It's not, I'm afraid. It's electric, and it's not cheap in winter. I'd rather tell you now than have you find out in January.
— I appreciate that. What about the deposit?
— Six weeks' rent.`,
  },
  {
    id: 'm11',
    title: '学术：记忆不是录像带',
    source: '学术 · 原创示例',
    category: '学术',
    seconds: 88,
    accent: '美音',
    reduction: '低',
    familiarity: '一般',
    text: `There's a stubborn intuition that memory works like a recording. Something happens, it gets stored, and later you play it back. Almost every part of that is wrong. What actually happens is that you reconstruct the event each time you recall it, using fragments, expectations and whatever you currently believe. And because reconstruction is a physical process, it leaves the memory slightly altered. This is why repeated questioning can change what a witness sincerely remembers, without any intention to deceive. The memory isn't corrupted by the telling; it's updated by it. For anyone working with testimony, that's not a technicality, it's the central problem.`,
  },
  {
    id: 'm12',
    title: '学术：沉没成本为什么这么难放下',
    source: '学术 · 原创示例',
    category: '学术',
    seconds: 72,
    accent: '英音',
    reduction: '中',
    familiarity: '熟悉',
    text: `The sunk cost fallacy is usually described as a mistake, and in a narrow sense it is: money already spent should not affect a decision about the future. But the framing hides why it's so persistent. Admitting that a project was a bad idea is not just an accounting adjustment, it's a statement about your own judgment. So people keep funding the thing not because they expect it to work, but because stopping would require them to say something uncomfortable about themselves. The rational advice, "ignore sunk costs", is therefore almost useless. What actually helps is making it socially acceptable to be wrong early.`,
  },
  {
    id: 'm13',
    title: '多口音：印度英语新闻播报',
    source: '多口音 · 原创示例',
    category: '多口音',
    seconds: 30,
    accent: '印音',
    reduction: '高',
    familiarity: '一般',
    text: `The state transport department has announced that bus fares will remain unchanged for the next financial year, despite a rise in fuel costs. Officials said the subsidy would be met from the existing budget, and that no new levy is being planned at this stage.`,
  },
  {
    id: 'm14',
    title: '多口音：澳洲英语电台访谈',
    source: '多口音 · 原创示例',
    category: '多口音',
    seconds: 34,
    accent: '澳音',
    reduction: '高',
    familiarity: '熟悉',
    text: `Look, the thing that gets me is how quickly everyone moved on. Six months ago this was the only thing anyone wanted to talk about, and now you'd struggle to get a single question on it at a press conference. I'm not saying the issue's solved. I'm saying we've got a very short attention span for problems that don't have a deadline.`,
  },
  {
    id: 'm15',
    title: '多口音：英式口语里的委婉',
    source: '多口音 · 原创示例',
    category: '多口音',
    seconds: 36,
    accent: '英音',
    reduction: '高',
    familiarity: '熟悉',
    text: `— How did the meeting go?
— Well. It was... interesting.
— That bad?
— I wouldn't say bad. I'd say we had a robust exchange of views and agreed to take it away and think about it. Which, as you know, means nothing happened and nobody wants to say so.
— Right. So it was bad.
— It was bad.`,
  },
  {
    id: 'm16',
    title: '演讲：谈判里最被低估的动作',
    source: '演讲 · 原创示例',
    category: '演讲',
    seconds: 60,
    accent: '美音',
    reduction: '中',
    familiarity: '一般',
    text: `In negotiation, the most underrated move is silence. Not the aggressive kind, not the standoff, just the willingness to let a sentence end and not fill the space. Most of us are so uncomfortable with the pause that we volunteer information to end it. We explain our reasoning, we soften our position, we offer a second option nobody asked for. And every one of those is a concession. So the discipline is simple, though not easy: make your point, then stop. Count to five. Let them speak first.`,
  },
  {
    id: 'm17',
    title: '新闻：小城市的人才回流',
    source: '新闻 · 原创示例',
    category: '新闻',
    seconds: 42,
    accent: '美音',
    reduction: '中',
    familiarity: '一般',
    text: `A survey of four hundred recent graduates found that just under half had returned to their home cities within two years, citing rent, family and the cost of childcare. The finding cuts against the assumption that talent flows in one direction. Researchers caution that the sample skews towards those who already had a job offer, and that the pull of the largest cities may simply be delayed rather than reversed.`,
  },
  {
    id: 'm18',
    title: '访谈：为什么开会开不完',
    source: '访谈 · 原创示例',
    category: '访谈',
    seconds: 50,
    accent: '英音',
    reduction: '中',
    familiarity: '熟悉',
    text: `Most meetings exist because someone didn't want to make a decision alone. That's not a criticism, it's an observation. The decision has to be made by a group, but nobody has written down what the group is deciding, so the meeting becomes a place to think out loud. And thinking out loud is expensive when nine people are doing it. The fix isn't better meetings. It's a one-line memo before the meeting: here is the decision, here are the two options, here is what I recommend. Then the meeting is about the recommendation, not about the fog.`,
  },
  {
    id: 'm19',
    title: '生活：机场改签',
    source: '生活 · 原创示例',
    category: '生活',
    seconds: 38,
    accent: '美音',
    reduction: '高',
    familiarity: '熟悉',
    text: `— Hi, my flight got cancelled and I've got a connection in Amsterdam I'm definitely going to miss.
— Let me have a look. Okay, so the earliest I can get you out is tomorrow at six.
— Tomorrow? Is there anything through Dublin or Frankfurt?
— Frankfurt's full. Dublin has one seat, but it lands after your connection.
— Right. What are my options then?
— I can put you on the six o'clock and hold a room for you tonight.`,
  },
  {
    id: 'm20',
    title: '学术：为什么翻译不能逐字',
    source: '学术 · 原创示例',
    category: '学术',
    seconds: 80,
    accent: '美音',
    reduction: '低',
    familiarity: '熟悉',
    text: `The reason word-for-word translation fails is not that words lack meanings. It's that meanings are distributed differently. A single word in one language may carry what another language spreads across a phrase, a tone and a gesture. So the translator is not moving labels from one box to another; they are rebuilding a structure that has to hold the same weight with different materials. That's why the interesting question is never "what does this word mean", but "what is this sentence doing, and what would do that job here". Once you ask it that way, literalism stops looking like fidelity and starts looking like a category error.`,
  },
  {
    id: 'm21',
    title: '演讲：注意力是你唯一真正的资产',
    source: '演讲 · 原创改写（可换真人原声）',
    category: '演讲',
    seconds: 62,
    accent: '美音',
    reduction: '中',
    familiarity: '熟悉',
    sourceNote: '找一段同主题的 TED 演讲（例如关于注意力与深度工作的），下载音频、粘上官方字幕，就是你自己的真人语料。',
    text: `People say they don't have time. Most of them have time; they have attention that has been sliced into pieces. You sit down to do one thing, and within four minutes you have checked three other things, none of which you chose to care about this morning. The cost is not the four minutes. The cost is that you have to rebuild the same mental room every time you come back, and rebuilding is expensive. So the practical question is not "how do I focus for four hours". It is "how do I make the first twenty minutes boring enough that nothing else can get in". Boredom, it turns out, is not the enemy of attention. It's the door.`,
    note: '观点密度高，适合练"先抓主张、再抓理由"的综述。',
  },
  {
    id: 'm22',
    title: '演讲：毕业典礼上，没有人祝你成功',
    source: '演讲 · 原创改写（可换真人原声）',
    category: '演讲',
    seconds: 58,
    accent: '英音',
    reduction: '低',
    familiarity: '一般',
    sourceNote: '毕业演讲在 YouTube 和学校官网上通常有完整视频与字幕，可截取其中 60 秒导入。',
    text: `I am not going to wish you success, because you will get enough of that wish today and it will not help you. I am going to wish you a few good failures, early, and small enough to survive. The people I know who ended up doing interesting work are not the ones who never fell over. They are the ones who fell over while the room was still small, learned what falling felt like, and stopped treating it as evidence about their worth. That is the whole trick, and it takes years. You have those years. Use them on something you would defend in a room where nobody agrees with you.`,
  },
  {
    id: 'm23',
    title: '播客：我们为什么又回到办公室了',
    source: '播客 · 原创改写（可换真人原声）',
    category: '播客',
    seconds: 66,
    accent: '美音',
    reduction: '高',
    familiarity: '熟悉',
    sourceNote: '任何一档双人访谈播客（工作、科技、文化类）都行；下载单集 mp3，粘上节目页的转写稿。',
    text: `So the story we keep telling is that people were forced back. I don't think that's what happened in most companies. What happened is that the people who could leave, left, and the people who stayed started asking for something the remote setup couldn't give them, which was a reason to be in the same room. And once you have that, the argument stops being about productivity and starts being about who gets to decide how work feels. That's a much harder conversation, and most managers would rather have the productivity one.`,
    note: '语速快、口语连接多，适合练"听语气、听立场"。',
  },
  {
    id: 'm24',
    title: '播客：写作难，不是因为没想法',
    source: '播客 · 原创改写（可换真人原声）',
    category: '播客',
    seconds: 55,
    accent: '英音',
    reduction: '中',
    familiarity: '一般',
    sourceNote: '作家访谈类播客（如 The Guardian Books Podcast 一类）单集 mp3 + 节目页简介即可。',
    text: `People tell me they can't write because they don't have ideas. That's almost never true. They have too many, and they are all at the same volume, so the page gets nothing. The first sentence is not a summary of everything you know. It is a decision about which one of those ideas gets to speak first. Once you make that decision badly — and you will make it badly — the rest of the paragraph tells you what the decision should have been. That's the job. You write the wrong sentence to find the right one.`,
  },
  {
    id: 'm25',
    title: '新闻：这座城市把限速降到了 30',
    source: '新闻 · 原创改写（可换真人原声）',
    category: '新闻',
    seconds: 52,
    accent: '英音',
    reduction: '中',
    familiarity: '一般',
    sourceNote: 'BBC、NPR 等电台新闻有公开音频与网页稿，截取 1 分钟即可。',
    text: `The city lowered the speed limit on most residential streets to thirty kilometres an hour, and the first year of data is now in. Traffic deaths are down by a fifth. Average journey times, which was the objection everyone raised, are up by about forty seconds. The council says the numbers settle the argument. Drivers' groups say the sample is too small and the change too recent. What both sides agree on is that the streets feel different — narrower, slower, and, according to residents, quieter than they were.`,
    note: '数字多，适合练"边听边记关键数"。',
  },
  {
    id: 'm26',
    title: '访谈：气候模型到底有多准',
    source: '访谈 · 原创改写（可换真人原声）',
    category: '访谈',
    seconds: 64,
    accent: '美音',
    reduction: '中',
    familiarity: '陌生',
    sourceNote: '科学类播客（如 Science Friday 一类）有音频与转写；专业词多，正好练"陌生话题"。',
    text: `Interviewer: When people hear "the model says", they hear "a guess". Why should they trust it?
Scientist: Because the models have been wrong in public for forty years, and we know exactly where. They overshot warming in the nineties, they missed some regional rainfall, and we published all of it. A model is not a prediction of the future. It's a machine for asking "if this, then what". The useful question is never whether it's right, but whether it's good enough to choose between two policies. For that, honestly, it usually is.`,
  },
  {
    id: 'm27',
    title: '访谈：第一次创业赔掉的钱',
    source: '访谈 · 原创改写（可换真人原声）',
    category: '访谈',
    seconds: 57,
    accent: '美音',
    reduction: '高',
    familiarity: '熟悉',
    sourceNote: '创业类播客（如 How I Built This 一类）单集 mp3 + 节目页摘要，适合截取故事段落。',
    text: `Interviewer: What did the first failure actually cost you?
Guest: About two years and every relationship I had that wasn't patient. But the thing I got wrong wasn't the product. It was that I kept asking people whether they liked it, and they were being polite. Nobody wants to tell you your idea is boring. So I built for a year on the wrong question. Now I ask a different one: what did you do last week instead of using this? If they can't answer, they don't have the problem.`,
  },
  {
    id: 'm28',
    title: '纪实：珊瑚白化的那一年',
    source: '纪实 · 原创改写（可换真人原声）',
    category: '纪实',
    seconds: 60,
    accent: '英音',
    reduction: '中',
    familiarity: '一般',
    sourceNote: '自然纪录片旁白（BBC、Netflix 一类）音频清晰、语速稳，适合作为"标准英音"素材。',
    text: `In the warmer months, the reef does something that looks like nothing. The coral does not move, does not call, does not run. It simply lets go of the algae that feed it, and turns white. That whiteness is not death yet. It is a kind of holding on. If the water cools within a few weeks, the algae return and the reef carries on, quieter than before. If it doesn't, the coral starves slowly, and the fish that depended on it leave, and the whole arrangement unwinds in a single season.`,
    note: '旁白语体，长句多，适合练"跟读节奏"。',
  },
  {
    id: 'm29',
    title: '纪实：一个菜市场的四十年',
    source: '纪实 · 原创改写（可换真人原声）',
    category: '纪实',
    seconds: 54,
    accent: '美音',
    reduction: '低',
    familiarity: '熟悉',
    sourceNote: '城市纪录片或口述史项目通常有公开音视频，可截取一段环境声 + 旁白。',
    text: `The market opened in the year the road was paved, which is how most people here date things. Forty years later the road has been widened twice and the market has not moved an inch. The same families sell in the same aisles, though the grandchildren now take the orders on a phone. What has changed is who comes. In the eighties it was the neighbourhood; now it is people who drive in from the other side of the city for one specific stall, and leave with three bags they didn't plan to buy.`,
  },
  {
    id: 'm30',
    title: '会议：渔业补贴谈不拢的那一段',
    source: '会议 · 原创改写（可换真人原声）',
    category: '会议',
    seconds: 63,
    accent: '印音',
    reduction: '高',
    familiarity: '陌生',
    sourceNote: '联合国、WTO 等机构的会议录像属公开资料，可在官网找到带口音的发言片段。',
    text: `Let me be very clear about where we are. We agree on the principle, we agree on the deadline, and we do not agree on who pays for the transition. My delegation has said from the beginning that we cannot sign an instrument that treats small-scale fishers as the problem. They are not subsidised in any meaningful sense. The subsidies that distort are elsewhere, and everyone in this room knows where. So we are ready to move, but not on a text that asks the smallest boats to carry the heaviest cost.`,
    note: '印度口音 + 会议语体，语速快、句法正式。',
  },
  {
    id: 'm31',
    title: '生活：看房时中介没说的那件事',
    source: '生活 · 原创改写（可换真人原声）',
    category: '生活',
    seconds: 48,
    accent: '澳音',
    reduction: '高',
    familiarity: '熟悉',
    sourceNote: '日常对话类播客或 vlog 很容易找；环境声多，练"噪声里抓信息"。',
    text: `So the flat is great, the light is great, and I should probably tell you about the trains before you fall in love with it. The line runs right behind the building. You stop hearing it after about a week, most people do, but the first week is rough. Also the hot water is on a timer, so if you shower after ten you'll be having a cold one. Other than that? Honestly, it's the best value in this area. Want to see the balcony before you decide?`,
  },
  {
    id: 'm32',
    title: '多口音：客服电话里的十分钟',
    source: '多口音 · 原创改写（可换真人原声）',
    category: '多口音',
    seconds: 50,
    accent: '印音',
    reduction: '高',
    familiarity: '一般',
    sourceNote: '客服录音、技术支持类播客或自己的通话录音（注意隐私）都可以用。',
    text: `Thank you for holding. I've pulled up your account, and I can see the payment went through on the fourteenth, but the plan didn't switch over. That's on our side, not yours. What I'll do is raise a ticket now, and it should reflect within twenty-four to forty-eight hours. If it doesn't, call back and ask for the reference number I'm giving you — that way you won't have to explain everything again. Is there anything else I can check for you while I have the account open?`,
    note: '客服语体：礼貌、重复确认、给编号。适合练"边听边记要点"。',
  },
  // 真人原声（TED 官方视频截取 + 官方字幕），见 realMaterials*.ts
]

/** 保留的原创示例：只留真人素材覆盖不到的形式（双语对照、播客、纪实、会议） */
const keyOfAudio = (url?: string): string => {
  const file = url?.split('/').pop() ?? ''
  return file.replace(/\.mp3$/i, '')
}

/** 把每段 TED 素材换成「开场 60 秒」，标题、分类、口音沿用；30 秒短版见 shorts.ts */
const withOpening = (m: Material): Material | null => {
  const key = keyOfAudio(m.audioUrl)
  const o = OPENINGS[key]
  if (!o) return null
  return {
    ...m,
    audioUrl: '/audio/open/' + key + '_60.mp3',
    text: o.text60,
    textZh: OPENING_ZH[key]?.zh60,
    seconds: Math.round(o.d60 / 1000),
  }
}

/** 开场 30 秒里就有笑声/掌声的，直接不收（用户明确说过不要观众笑声） */
const NOISY = new Set(['amy_cuddy', 'laura_smythe', 'harville_hendrix', 'rita_pierson', 'dan_pink'])

const cleanLaugh = (t: string) =>
  t
    .replace(/\s*\((Laughter|Applause|Audience|Music)\)/gi, '')
    .replace(/\s*\[(Laughter|Applause|Music)\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

export const MATERIALS: Material[] = [
  ...REAL_MATERIALS,
  ...REAL_MATERIALS_B,
  ...REAL_MATERIALS_C,
  ...REAL_MATERIALS_D,
]
  .filter((m) => !NOISY.has(keyOfAudio(m.audioUrl)))
  .map(withOpening)
  .filter((m): m is Material => m !== null)
  .map((m) => ({ ...m, text: cleanLaugh(m.text) }))

export const ALL_MATERIALS: Material[] = [...MATERIALS, ...BIZ_MATERIALS]

export const CATEGORIES: Material['category'][] = [
  '商业',
  '双语平行',
  '演讲',
  '新闻',
  '访谈',
  '生活',
  '学术',
  '多口音',
]
