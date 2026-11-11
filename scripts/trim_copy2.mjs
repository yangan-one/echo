import { readFileSync, writeFileSync } from 'node:fs'
const R = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/components/'
const rd = (f) => readFileSync(R + f, 'utf8')
const wr = (f, s) => writeFileSync(R + f, s)
let n = 0
function cut(f, re, repl = '') {
  const s = rd(f)
  const t = s.replace(re, repl)
  if (t !== s) { wr(f, t); n++ }
}

cut('ListenView.tsx', /\n\s*\{isReal \? \(\n\s*<p className="fineprint">[\s\S]*?\n\s*\)\}\n/, '\n')
cut('ListenView.tsx', /\n\s*\{material\.note \? <p className="fineprint">\{material\.note\}<\/p> : null\}\n/, '\n')
cut('ReviewView.tsx', /\n\s*听到卡住的地方先暂停[^\n]*\n/, '\n')
cut('ProgressView.tsx', /\n\s*<p className="fineprint">不排名[^<]*<\/p>\n/, '\n')
cut('ProgressView.tsx', /\n\s*<p className="fineprint">语速不是越高越好[^<]*<\/p>\n/, '\n')
console.log('edits', n)
