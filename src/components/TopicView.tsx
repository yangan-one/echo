import { useState } from 'react'
import { pickTopic, type TopicItem } from '../data/topics'

const KIND_LABEL: Record<TopicItem['kind'], string> = {
  观点: '给立场',
  描述: '只讲一个画面',
  辩护: '选一边，别和稀泥',
  反驳: '先复述，再拆',
  叙事: '讲过程，不是结论',
}

export function TopicView({
  onBack,
  onStart,
}: {
  onBack: () => void
  onStart: (topic: TopicItem) => void
}) {
  const [topic, setTopic] = useState<TopicItem>(() => pickTopic())
  const [count, setCount] = useState(0)

  return (
    <div className="view">
      <div className="view-head">
        <button className="back" onClick={onBack}>
          ← 返回
        </button>
        <div className="kicker">即兴开口</div>
      </div>

      <div className="topic-card" key={count}>
        <div className="topic-kind">
          {topic.kind} · 难度 {'●'.repeat(topic.level)}
          {'○'.repeat(3 - topic.level)}
        </div>
        <div className="topic-title">{topic.title}</div>
        <div className="topic-angle">切入点：{topic.angle}</div>
      </div>

      <div className="row-2">
        <button className="btn ghost" onClick={() => { setTopic(pickTopic(topic.title)); setCount((c) => c + 1) }}>
          换一题
        </button>
        <button className="btn ghost" onClick={() => onStart(topic)}>
          用这题 · 60 秒
        </button>
      </div>
      <div className="spacer" />
    </div>
  )
}
