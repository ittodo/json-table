import { init, Flatten, Csv } from '../src/index'
import type { GapMode } from '../src/index'

const app = document.getElementById('app')!
const api = init(app, {
  initialJson: {
    id: 1,
    name: 'Alice',
    stats: { hp: 10, mp: 5 },
    items: [{ id: 100, name: 'Potion' }]
  }
})

const btnHeader = document.getElementById('btn-header') as HTMLButtonElement
const btnCsv = document.getElementById('btn-csv') as HTMLButtonElement
const outHeader = document.getElementById('out-header') as HTMLPreElement
const outCsvTable = document.getElementById('out-csv-table') as HTMLTableElement
const btnDownload = document.getElementById('btn-download') as HTMLButtonElement
const inpK = document.getElementById('inp-k') as HTMLInputElement
const selGap = document.getElementById('sel-gap') as HTMLSelectElement

function currentListStrategy(): { listStrategy: 'dynamic' | 'fixed'; fixedListMax?: number } {
  const selected = (document.querySelector('input[name="listStrategy"]:checked') as HTMLInputElement)?.value
  if (selected === 'fixed') {
    const k = Math.max(0, Number(inpK.value || 0))
    return { listStrategy: 'fixed', fixedListMax: k }
  }
  return { listStrategy: 'dynamic' }
}

let lastHeader: string[] = []
let lastRows: string[][] = []
let baseIsArray = Array.isArray(api.getJson())

function updateJsonFromRows() {
  const gap = (selGap.value as GapMode) || 'break'
  const objs = lastRows.map(r => Flatten.unflattenFromRow(lastHeader, r, gap))
  const next = baseIsArray ? objs : (objs[0] ?? {})
  api.setJson(next)
}

function mergeHeaderWithFallback(current: string[], prev: string[]): string[] {
  if (!prev.length) return current
  const out = current.slice()
  const hasRoot = (root: string) => out.some(c => c.startsWith(root + '['))
  const seen = new Set(out)
  for (const col of prev) {
    const m = col.match(/^(.*)\[(\d+)\](\..*)?$/)
    if (!m) continue
    const root = m[1]
    const idx = Number(m[2])
    const tail = m[3] || ''
    if (idx !== 0) continue
    if (!hasRoot(root)) {
      const addCol = `${root}[0]${tail}`
      if (!seen.has(addCol)) {
        out.push(addCol)
        seen.add(addCol)
      }
    }
  }
  return out
}

function addExtraIndexPerList(header: string[], extra = 1): string[] {
  const re = /^(.*)\[(\d+)\](\..*)?$/
  type Group = { root: string; start: number; end: number; tails: string[]; maxIdx: number }
  const groups: Group[] = []
  let cur: Group | null = null
  for (let i = 0; i < header.length; i++) {
    const col = header[i]
    const m = col.match(re)
    if (!m) { cur = null; continue }
    const root = m[1]
    const idx = Number(m[2])
    const tail = m[3] || ''
    if (!cur || cur.root !== root) {
      cur = { root, start: i, end: i, tails: [], maxIdx: -1 }
      groups.push(cur)
    } else {
      cur.end = i
    }
    if (!cur.tails.includes(tail)) cur.tails.push(tail)
    cur.maxIdx = Math.max(cur.maxIdx, idx)
  }
  if (!groups.length || extra <= 0) return header
  const out = header.slice()
  for (let g = groups.length - 1; g >= 0; g--) {
    const grp = groups[g]
    const inserts: string[] = []
    for (let n = 1; n <= extra; n++) {
      const i = grp.maxIdx + n
      for (const t of grp.tails) inserts.push(`${grp.root}[${i}]${t}`)
    }
    out.splice(grp.end + 1, 0, ...inserts)
  }
  return out
}

function renderTable(header: string[], rows: string[][], editable = false) {
  // clear
  outCsvTable.innerHTML = ''
  // thead
  const thead = document.createElement('thead')
  const trh = document.createElement('tr')
  header.forEach((h, hi) => {
    const th = document.createElement('th')
    th.textContent = h
    th.contentEditable = 'true'
    th.dataset.col = String(hi)
    th.title = 'Edit header path'
    th.addEventListener('blur', () => {
      const idx = Number(th.dataset.col)
      const next = th.textContent || ''
      if (next && lastHeader[idx] !== next) {
        lastHeader[idx] = next
        // reflect changes in header preview panel
        outHeader.textContent = lastHeader.join('\n')
        // no need to re-render table body; columns count is unchanged
      }
    })
    trh.appendChild(th)
  })
  thead.appendChild(trh)
  outCsvTable.appendChild(thead)
  // tbody
  const tbody = document.createElement('tbody')
  rows.forEach((r, ri) => {
    const tr = document.createElement('tr')
    for (let i = 0; i < header.length; i++) {
      const td = document.createElement('td')
      td.textContent = r[i] ?? ''
      if (editable) {
        td.contentEditable = 'true'
        td.dataset.row = String(ri)
        td.dataset.col = String(i)
        td.addEventListener('blur', () => {
          const rr = Number(td.dataset.row)
          const cc = Number(td.dataset.col)
          rows[rr][cc] = td.textContent || ''
          lastRows = rows
          updateJsonFromRows()
        })
      }
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  })
  outCsvTable.appendChild(tbody)
}

btnHeader.addEventListener('click', () => {
  const json = api.getJson()
  let { header } = Flatten.buildHeaderFromJson(json, currentListStrategy())
  header = addExtraIndexPerList(header, 1)
  header = mergeHeaderWithFallback(header, lastHeader)
  outHeader.textContent = header.join('\n')
})

btnCsv.addEventListener('click', () => {
  const json = api.getJson()
  let { header } = Flatten.buildHeaderFromJson(json, currentListStrategy())
  header = addExtraIndexPerList(header, 1)
  header = mergeHeaderWithFallback(header, lastHeader)
  const arr = Array.isArray(json) ? json : [json]
  const rows = arr.map(r => Flatten.flattenToRow(r, header))
  lastHeader = header
  lastRows = rows
  baseIsArray = Array.isArray(json)
  renderTable(header, rows, true)
})

btnDownload.addEventListener('click', () => {
  const json = api.getJson()
  let { header } = Flatten.buildHeaderFromJson(json, currentListStrategy())
  header = addExtraIndexPerList(header, 1)
  header = mergeHeaderWithFallback(header, lastHeader)
  const arr = Array.isArray(json) ? json : [json]
  const rows = arr.map(r => Flatten.flattenToRow(r, header))
  const csv = Csv.toCsv(header, rows, { sep: ',', bom: true, newline: '\r\n' })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'data.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
})

// Allow editing header lines in the preview box
function applyHeaderPreviewEdits() {
  const lines = (outHeader.textContent || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
  if (!lines.length) return
  lastHeader = lines
  // normalize rows to new header width
  lastRows = lastRows.map(r => {
    const rr = r.slice(0, lines.length)
    while (rr.length < lines.length) rr.push('')
    return rr
  })
  renderTable(lastHeader, lastRows, true)
}

outHeader.addEventListener('blur', applyHeaderPreviewEdits)




