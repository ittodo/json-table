import { init, Flatten, Csv } from '../src/index'
import type { GapMode } from '../src/index'

const app = document.getElementById('app')!
const api = init(app, {
  initialJson: [
    {
      id: 1,
      name: 'Alice',
      stats: { hp: 10, mp: 5 },
      items: [{ id: 100, name: 'Potion' }]
    }
  ]
})

const btnHeader = document.getElementById('btn-header') as HTMLButtonElement
const btnCsv = document.getElementById('btn-csv') as HTMLButtonElement
const outHeader = document.getElementById('out-header') as HTMLTextAreaElement
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
let pendingFocus: { r: number; c: number; edge?: 'start' | 'end' } | null = null

function updateJsonFromRows() {
  const gap = (selGap.value as GapMode) || 'break'
  const objsRaw = lastRows.map(r => Flatten.unflattenFromRow(lastHeader, r, gap))
  // filter out empty rows (no values)
  const objs = objsRaw.filter(o => o && typeof o === 'object' && Object.keys(o).length > 0)
  const next = baseIsArray ? objs : (objs[0] ?? {})
  api.setJson(next)
}

// keep header textarea height equal to JSON editor height
function syncHeaderHeight() {
  const editor = document.getElementById('jt-editor') as HTMLTextAreaElement | null
  if (!editor) return
  outHeader.style.height = editor.clientHeight + 'px'
}
// initial sync (after init render)
setTimeout(syncHeaderHeight, 0)
window.addEventListener('resize', syncHeaderHeight)

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
        outHeader.value = lastHeader.join('\\n')
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
        td.addEventListener('focus', () => {
          const cc = Number(td.dataset.col)
          setActiveColumn(cc)
        })
        // Arrow key navigation: Up/Down/Left/Right
        td.addEventListener('keydown', (e) => {
          const rr = Number(td.dataset.row)
          const cc = Number(td.dataset.col)
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (rr === lastRows.length - 1) {
              const before = lastRows.length
              lastRows = ensureExtraBlankRow(lastRows, lastHeader.length)
              if (lastRows.length !== before) {
                renderTable(lastHeader, lastRows, true)
                if (pendingFocus) {
                  focusCell(pendingFocus.r, pendingFocus.c, pendingFocus.edge ?? 'end')
                }
                pendingFocus = { r: rr + 1, c: cc, edge: 'end' }
                focusCell(pendingFocus.r, pendingFocus.c, pendingFocus.edge ?? 'end')
                return
              }
            }
            pendingFocus = { r: Math.min(rr + 1, lastRows.length - 1), c: cc }
            focusCell(pendingFocus.r, pendingFocus.c, pendingFocus.edge ?? 'end')
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            pendingFocus = { r: Math.max(rr - 1, 0), c: cc }
            focusCell(pendingFocus.r, pendingFocus.c, pendingFocus.edge ?? 'end')
          } else if (e.key === 'ArrowLeft') {
            if (isCaretAtStart(td)) {
              e.preventDefault()
              if (cc > 0) {
              pendingFocus = { r: rr, c: cc - 1 }
              focusCell(pendingFocus.r, pendingFocus.c, pendingFocus.edge ?? 'end')
            }
            }
          } else if (e.key === 'ArrowRight') {
            if (isCaretAtEnd(td)) {
              e.preventDefault()
              pendingFocus = { r: rr, c: Math.min(cc + 1, lastHeader.length - 1) }
              focusCell(pendingFocus.r, pendingFocus.c, pendingFocus.edge ?? 'end')
            }
          }
        })
        td.addEventListener('blur', () => {
          const rr = Number(td.dataset.row)
          const cc = Number(td.dataset.col)
          const raw = td.textContent || ''
          const cleaned = raw.replace(/\u200B/g, '')
          rows[rr][cc] = cleaned
          lastRows = rows
          // write back JSON
          updateJsonFromRows()
          // auto-add a new blank row if the last row now has any content
          const beforeLen = lastRows.length
          lastRows = ensureExtraBlankRow(lastRows, header.length)
          if (lastRows.length !== beforeLen) {
            renderTable(lastHeader, lastRows, true)
                if (pendingFocus) {
                  focusCell(pendingFocus.r, pendingFocus.c, pendingFocus.edge ?? 'end')
                }
          }
        })
      }
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  })
  outCsvTable.appendChild(tbody)
}

function ensureExtraBlankRow(rows: string[][], headerLen: number): string[][] {
  const copy = rows.map(r => r.slice())
  const isEmpty = (r: string[]) => r.every(c => !c || c === '')
  if (copy.length === 0) {
    copy.push(Array(headerLen).fill(''))
    return copy
  }
  const last = copy[copy.length - 1]
  if (!isEmpty(last)) {
    copy.push(Array(headerLen).fill(''))
  }
  return copy
}

btnHeader.addEventListener('click', () => {
  const json = api.getJson()
  let { header } = Flatten.buildHeaderFromJson(json, currentListStrategy())
  header = addExtraIndexPerList(header, 1)
  header = mergeHeaderWithFallback(header, lastHeader)
  outHeader.value = header.join('\n')
})

btnCsv.addEventListener('click', () => {
  const json = api.getJson()
  let { header } = Flatten.buildHeaderFromJson(json, currentListStrategy())
  header = addExtraIndexPerList(header, 1)
  header = mergeHeaderWithFallback(header, lastHeader)
  const arr = Array.isArray(json) ? json : [json]
  let rows = arr.map(r => Flatten.flattenToRow(r, header))
  rows = ensureExtraBlankRow(rows, header.length)
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
  const rawLines = (outHeader.value || '').split(/\r?\n/)
  // Keep empty lines to allow adding new columns; generate placeholders
  const lines: string[] = []
  let newCount = 0
  const exists = new Set<string>()
  for (let i = 0; i < rawLines.length; i++) {
    const t = rawLines[i].trim()
    if (t.length > 0) {
      lines.push(t)
      exists.add(t)
    } else {
      // placeholder path for empty header entry
      let placeholder = `column_${++newCount}`
      while (exists.has(placeholder)) {
        placeholder = `column_${++newCount}`
      }
      lines.push(placeholder)
      exists.add(placeholder)
    }
  }
  if (!lines.length) return
  lastHeader = lines
  // normalize rows to new header width
  lastRows = lastRows.map(r => {
    const rr = r.slice(0, lines.length)
    while (rr.length < lines.length) rr.push('')
    return rr
  })
  lastRows = ensureExtraBlankRow(lastRows, lines.length)
  renderTable(lastHeader, lastRows, true)
                if (pendingFocus) {
                  focusCell(pendingFocus.r, pendingFocus.c, pendingFocus.edge ?? 'end')
                }
}

outHeader.addEventListener('blur', applyHeaderPreviewEdits)








function focusCell(rowIndex: number, colIndex: number, edge: 'start' | 'end' = 'end') {
  const tbody = outCsvTable.tBodies[0]
  if (!tbody) return
  const tr = tbody.rows[rowIndex]
  if (!tr) return
  const td = tr.cells[colIndex]
  if (!td) return
  const el = td as HTMLElement
  el.focus()
  // place caret after paint for reliability
  requestAnimationFrame(() => {
    try {
      // ensure there is at least a text node to place caret into
      if (el.childNodes.length === 0) {
        el.appendChild(document.createTextNode(''))
      }
      // pick target node
      let target: ChildNode | null = null
      if (edge === 'start') {
        target = el.firstChild
      } else {
        target = el.lastChild
      }
      const range = document.createRange()
      if (target && target.nodeType === Node.TEXT_NODE) {
        const text = (target.textContent ?? '')
        range.setStart(target, edge === 'start' ? 0 : text.length)
      } else {
        range.selectNodeContents(el)
        range.collapse(edge === 'start')
      }
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    } catch {}
  })
}


function isCaretAtStart(td: HTMLElement): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false
  const node = sel.anchorNode
  const offset = sel.anchorOffset
  if (!node || !td.contains(node)) return false
  if (node.nodeType === Node.TEXT_NODE) return offset === 0
  return node === td && offset === 0
}

function isCaretAtEnd(td: HTMLElement): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false
  const node = sel.anchorNode as any
  const offset = sel.anchorOffset
  if (!node || !td.contains(node)) return false
  if (node.nodeType === Node.TEXT_NODE) {
    return offset === (node.textContent ? node.textContent.length : 0)
  }
  if (node === td) {
    return offset >= td.childNodes.length
  }
  return false
}

function setActiveColumn(colIndex: number) {
  outCsvTable.querySelectorAll('.col-active').forEach(el => el.classList.remove('col-active'))
  if (outCsvTable.tHead && outCsvTable.tHead.rows[0]) {
    const th = outCsvTable.tHead.rows[0].cells[colIndex]
    th && th.classList.add('col-active')
  }
  const tb = outCsvTable.tBodies[0]
  if (!tb) return
  for (let r = 0; r < tb.rows.length; r++) {
    const td = tb.rows[r].cells[colIndex]
    td && td.classList.add('col-active')
  }
}












