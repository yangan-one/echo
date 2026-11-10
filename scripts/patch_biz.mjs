import { readFileSync, writeFileSync } from 'node:fs'
const p = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/scripts/biz_build.mjs'
let s = readFileSync(p, 'utf8')
const start = s.indexOf('function transcriptFrom')
const end = s.indexOf('const feed =')
const fresh = [
  'function transcriptFrom(html) {',
  '  const a = html.search(/This is (The Indicator|Planet Money)/i)',
  '  const b = html.search(/Copyright ©|Copyright &copy;|Accuracy and availability/i)',
  '  const body = html.slice(a >= 0 ? a : 0, b > 0 ? b : undefined)',
  '  let text = clean(body)',
  '  text = text',
  '    .replace(/\\[(MUSIC|APPLAUSE|LAUGHTER|SOUNDBITE[^\\]]*|COIN[^\\]]*)\\]/gi, " ")',
  '    .replace(/SPEAKER:\\s*NPR\\.?/gi, " ")',
  '    .replace(/\\b[A-Z][A-Z .\'’\\-]{2,25}:\\s*/g, " ")',
  '    .replace(/\\s{2,}/g, " ")',
  '    .trim()',
  '  return text',
  '}',
  '',
  '',
].join('\n')
s = s.slice(0, start) + fresh + s.slice(end)
writeFileSync(p, s)
console.log('patched', s.includes('This is (The Indicator'))
