import { readFileSync, writeFileSync } from 'node:fs'
const R = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/components/'
const rd = (f) => readFileSync(R + f, 'utf8')
const wr = (f, s) => writeFileSync(R + f, s)
let n = 0
const cut = (f, re, repl = '') => {
  const s = rd(f)
  const t = s.replace(re, repl)
  if (t !== s) {
    wr(f, t)
    n++
  }
}

cut('Library.tsx', /\n\s*<h1>先选一条，听完再讲<\/h1>\n\s*<p className="fineprint">四维难度[^<]*<\/p>/, '')
cut(
  'ListenView.tsx',
  /\n\s*\{material\.audioUrl && !isReal[\s\S]{0,200}?\}\n/,
  '\n'
)
cut('ListenView.tsx', /\n\s*<div className="card">\n\s*<div className="card-label">怎么练<\/div>[\s\S]*?<\/div>\n/, '\n')
cut('MarksView.tsx', /\n\s*<h1>标记过的每一处<\/h1>\n\s*<p className="fineprint">状态变成[^<]*<\/p>/, '')
cut('TopicView.tsx', /\n\s*<h1>没有准备时间<\/h1>\n\s*<p className="fineprint">看到题就开始说[^<]*<\/p>/, '')
cut('TopicView.tsx', /\n\s*<div className="card">\n\s*<div className="card-label">说明<\/div>[\s\S]*?<\/ul>\n\s*<\/div>/, '')
console.log('edits', n)
