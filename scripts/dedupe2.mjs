import { readFileSync, writeFileSync } from 'node:fs'

const res = JSON.parse(readFileSync('scripts/ted_result2.json', 'utf8'))

const collapse = (t) => {
  let s = t.replace(/\s+/g, ' ').trim()
  for (let n = 14; n >= 4; n--) {
    const core = "(?:[\\w']+[ ,]+){" + (n - 1) + "}[\\w']+[ ,]+"
    const re = new RegExp('\\b(' + core + ')\\1', 'gi')
    let prev
    let guard = 0
    do {
      prev = s
      s = s.replace(re, '$1')
    } while (s !== prev && ++guard < 50)
  }
  return s.replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim()
}

for (const r of res) {
  r.enClean = collapse(r.enText)
  console.log(r.key, r.enText.length, '->', r.enClean.length)
}

writeFileSync('scripts/ted_clean2.json', JSON.stringify(res, null, 1))
