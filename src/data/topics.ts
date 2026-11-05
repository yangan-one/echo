export interface TopicItem {
  title: string
  /** 给一点思考方向，避免完全空白 */
  angle: string
  kind: '观点' | '描述' | '辩护' | '反驳' | '叙事'
  level: 1 | 2 | 3
}

export const TOPICS: TopicItem[] = [
  { title: '你最近改变的一个看法', angle: '先说旧看法，再说是什么让你改了', kind: '叙事', level: 1 },
  { title: '一件你曾经做错的决定', angle: '不要只讲结果，讲你当时怎么想的', kind: '叙事', level: 2 },
  { title: '「效率」是不是被高估了', angle: '先给立场，再给一个反例', kind: '观点', level: 2 },
  { title: '该不该在大学里禁用手机', angle: '选一边，把对面的最强理由也说掉', kind: '辩护', level: 2 },
  { title: '用三个词形容你所在的城市', angle: '每个词配一个具体场景', kind: '描述', level: 1 },
  { title: 'AI 会让翻译这个职业消失吗', angle: '避免二选一，给出第三种可能', kind: '观点', level: 2 },
  { title: '一次你没能说服别人的经历', angle: '重点讲你为什么没说服他', kind: '叙事', level: 2 },
  { title: '为什么人们明知有害还继续做', angle: '给一个机制，不要只给道德判断', kind: '观点', level: 3 },
  { title: '描述你每天通勤路上的一个细节', angle: '不要概括，只讲一个画面', kind: '描述', level: 1 },
  { title: '「努力就会有回报」错在哪里', angle: '承认它对的部分，再拆掉它', kind: '反驳', level: 3 },
  { title: '应不应该对社交媒体设年龄限制', angle: '给一个可执行的标准', kind: '辩护', level: 2 },
  { title: '你最想重写的一封邮件', angle: '说清楚原话哪里出了问题', kind: '叙事', level: 1 },
  { title: '大城市还是小城市', angle: '不要和稀泥，选一个', kind: '观点', level: 1 },
  { title: '为什么会议开不完', angle: '从一个具体场景切入', kind: '观点', level: 2 },
  { title: '解释一个你专业里的概念给外行', angle: '禁止使用术语', kind: '描述', level: 3 },
  { title: '一个你佩服但不喜欢的人', angle: '把两件事分开说清楚', kind: '描述', level: 2 },
  { title: '该不该公开员工的薪资', angle: '先说你的结论，再说代价', kind: '辩护', level: 2 },
  { title: '什么样的批评是有用的', angle: '给一条可操作的标准', kind: '观点', level: 2 },
  { title: '你最近放弃的一件事', angle: '说清楚是止损还是逃避', kind: '叙事', level: 2 },
  { title: '「读了很多书但记不住」怎么办', angle: '不要说"多复习"', kind: '观点', level: 2 },
  { title: '描述一次让你尴尬的误会', angle: '要有对话', kind: '叙事', level: 1 },
  { title: '为什么好想法常常死于执行', angle: '给一个具体机制', kind: '观点', level: 3 },
  { title: '该不该要求孩子从小学外语', angle: '给一个时间点，别给原则', kind: '辩护', level: 2 },
  { title: '一个人吃饭是不是一种能力', angle: '可以反着说', kind: '观点', level: 1 },
  { title: '你见过最有效的一次说服', angle: '拆解他做了什么', kind: '叙事', level: 2 },
  { title: '「专业」意味着什么', angle: '用一个反例定义它', kind: '观点', level: 3 },
  { title: '应不应该看评论区', angle: '给你的真实做法，不是应该', kind: '观点', level: 1 },
  { title: '描述一件你每天都忽略的东西', angle: '把它当成第一次见到', kind: '描述', level: 1 },
  { title: '翻译最难的地方是什么', angle: '不要答"文化差异"', kind: '观点', level: 2 },
  { title: '一个你不想承认的偏见', angle: '承认它，然后解释它从哪来', kind: '叙事', level: 3 },
]

export function pickTopic(exclude?: string): TopicItem {
  const pool = TOPICS.filter((t) => t.title !== exclude)
  return pool[Math.floor(Math.random() * pool.length)]
}

/** 从今天听过的材料里延伸题目，让输入和输出共用一份语料 */
export function deriveTopics(materialText: string): TopicItem[] {
  const snippet = materialText.split(/[.!?]/)[0]?.trim().slice(0, 40) ?? ''
  return [
    {
      title: `反驳你刚听到的观点：「${snippet}…」`,
      angle: '先复述对方的逻辑，再指出漏洞',
      kind: '反驳',
      level: 2,
    },
    {
      title: '用一个你自己的例子，支持你刚听到的论点',
      angle: '例子要具体到时间地点',
      kind: '辩护',
      level: 2,
    },
    {
      title: '把刚才那段话，用一句话讲给完全不懂的人听',
      angle: '禁止使用原文里的关键名词',
      kind: '描述',
      level: 1,
    },
    {
      title: '一次你被一句话改变的经历',
      angle: '把那句话原样说出来，再说它为什么管用',
      kind: '叙事',
      level: 2,
    },
    {
      title: '「先做完，再做好」有道理吗',
      angle: '给一个具体场景，别停在原则上',
      kind: '观点',
      level: 2,
    },
    {
      title: '描述你最熟悉的一个房间',
      angle: '不要列清单，讲你每天在里面做的第一件事',
      kind: '描述',
      level: 1,
    },
    {
      title: '为什么人总爱比较',
      angle: '分开说「有用的比较」和「没用的比较」',
      kind: '观点',
      level: 3,
    },
    {
      title: '该不该让同事知道你的工资',
      angle: '先说你的结论，再说你要承担的代价',
      kind: '辩护',
      level: 2,
    },
    {
      title: '你最近学到的一个冷知识',
      angle: '讲清楚它为什么反直觉',
      kind: '描述',
      level: 1,
    },
    {
      title: '一个你后悔没做的选择',
      angle: '说清楚当时拦住你的到底是什么',
      kind: '叙事',
      level: 2,
    },
    {
      title: '「忙」是不是一种炫耀',
      angle: '区分真忙和表演忙',
      kind: '观点',
      level: 2,
    },
    {
      title: '说服一个不想学英语的朋友',
      angle: '不要说"以后有用"，给一个他今天就能感到的好处',
      kind: '辩护',
      level: 3,
    },
    {
      title: '描述一次你被误解的时刻',
      angle: '要有原话，不要只讲感受',
      kind: '叙事',
      level: 1,
    },
    {
      title: '为什么谣言总比真相跑得快',
      angle: '给一个传播机制，不要只怪平台',
      kind: '观点',
      level: 3,
    },
    {
      title: '你愿意为兴趣降薪吗',
      angle: '给一个具体的数字和期限',
      kind: '观点',
      level: 1,
    },
    {
      title: '一次你主动道歉的经历',
      angle: '讲你道歉前的那几分钟在想什么',
      kind: '叙事',
      level: 2,
    },
    {
      title: '「专业的事交给专业的人」什么时候不成立',
      angle: '举一个你自己判断比专家更准的例子',
      kind: '反驳',
      level: 3,
    },
    {
      title: '描述你家乡的一个声音',
      angle: '只用一个声音，把它放回一个场景',
      kind: '描述',
      level: 1,
    },
    {
      title: '该不该在面试里说实话',
      angle: '给一条你自己会守住的底线',
      kind: '辩护',
      level: 2,
    },
    {
      title: '为什么有些书你读不下去',
      angle: '不要归因于"没时间"',
      kind: '观点',
      level: 2,
    },
    {
      title: '你见过最糟的一次会议',
      angle: '复述其中一句最没用的话',
      kind: '叙事',
      level: 1,
    },
    {
      title: '用三句话反驳「年轻就该多试错」',
      angle: '每句一个理由，不许重复',
      kind: '反驳',
      level: 3,
    },
    {
      title: '如果手机上只能留一个应用',
      angle: '说清楚你放弃的那个，以及为什么',
      kind: '观点',
      level: 2,
    },
  ]
}
