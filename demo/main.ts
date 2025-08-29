import { init, Flatten, Csv } from '../src/index'
import type { GapMode } from '../src/index'
import { Schema } from '../src/index'

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
const btnSort = document.getElementById('btn-sort') as HTMLButtonElement
const outHeader = document.getElementById('out-header') as HTMLTextAreaElement
const outCsvTable = document.getElementById('out-csv-table') as HTMLTableElement
const btnDownload = document.getElementById('btn-download') as HTMLButtonElement
const inpK = document.getElementById('inp-k') as HTMLInputElement
const selGap = document.getElementById('sel-gap') as HTMLSelectElement
const inpUploadCsv = document.getElementById('inp-upload-csv') as HTMLInputElement

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
const pendingFocus: { r: number; c: number; edge?: 'start' | 'end' } | null = null

// Overlay input editor (more reliable caret than contentEditable)
const overlay = document.createElement('input')
overlay.type = 'text'
overlay.style.position = 'absolute'
overlay.style.zIndex = '1000'
overlay.style.padding = '0'
overlay.style.border = '0'
overlay.style.boxShadow = '0 0 0 2px #0d6efd inset'
overlay.style.borderRadius = '4px'
overlay.style.boxSizing = 'border-box'
overlay.style.display = 'none'
document.body.appendChild(overlay)
let editCell: { r: number; c: number } | null = null

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
  if (extra <= 0) return header
  const re = /^(.*)\[(\d+)\](\..*)?$/
  type Acc = { pos: number; maxIdx: number; tails: Set<string> }
  const acc = new Map<string, Acc>()
  for (let i = 0; i < header.length; i++) {
    const col = header[i]
    const m = col.match(re)
    if (!m) continue
    const root = m[1]
    const idx = Number(m[2])
    const tail = m[3] || ''
    const a = acc.get(root) || { pos: i, maxIdx: -1, tails: new Set<string>() }
    a.pos = Math.max(a.pos, i)
    a.maxIdx = Math.max(a.maxIdx, idx)
    a.tails.add(tail)
    acc.set(root, a)
  }
  if (acc.size === 0) return header
  const out = header.slice()
  const plans = Array.from(acc.entries()).map(([root, a]) => {
    const inserts: string[] = []
    for (let n = 1; n <= extra; n++) {
      const i = a.maxIdx + n
      for (const t of a.tails) inserts.push(`${root}[${i}]${t}`)
    }
    return { pos: a.pos, inserts }
  })
  // insert from the end to keep positions stable
  plans.sort((p, q) => q.pos - p.pos)
  for (const p of plans) out.splice(p.pos + 1, 0, ...p.inserts)
  return out
}

// Column comparator to keep list blocks contiguous and ordered
function compareCols(a: string, b: string): number {
  const ta = Schema.parsePath(a)
  const tb = Schema.parsePath(b)
  const topA = ta[0]?.key || ''
  const topB = tb[0]?.key || ''
  if (topA !== topB) return topA.localeCompare(topB)
  const n = Math.max(ta.length, tb.length)
  for (let i = 0; i < n; i++) {
    const sa = ta[i], sb = tb[i]
    if (!sa && sb) return -1
    if (sa && !sb) return 1
    if (!sa && !sb) break
    if (sa.key !== sb.key) return sa.key.localeCompare(sb.key)
    const ia = sa.index
    const ib = sb.index
    if (ia === undefined && ib !== undefined) return -1
    if (ia !== undefined && ib === undefined) return 1
    if (ia !== undefined && ib !== undefined && ia !== ib) return ia - ib
  }
  return 0
}

function sortHeaderAndRows(header: string[], rows: string[][]): { header: string[]; rows: string[][] } {
  const oldHeader = header.slice()
  const newHeader = header.slice().sort(compareCols)
  const indexMap = newHeader.map(col => oldHeader.indexOf(col))
  const newRows = rows.map(r => indexMap.map(i => (i >= 0 ? (r[i] ?? '') : '')))
  return { header: newHeader, rows: newRows }
}

// Normalize and propagate child subtrees (any property that is followed by an index, e.g. `.p[0]`, `.power[1]`).
// 1) For each parent group (e.g., `items`), compute the union of child tails (like `.p[0].a`, `.power[0].a`).
// 2) Rebuild the parent block so each index has: base cols (no child index) → union child tails, in discovered order.
function normalizeAndPropagateChildSubtree(header: string[]): string[] {
  const rxFirst = /^(.*?)\[(\d+)\](.*)$/ // split at first [] → parent, index, tail
  type Group = {
    parent: string
    indices: number[] // in appearance order
    firstPos: number
    baseByIdx: Map<number, string[]> // base cols (non-child) per index in original order
    unionTails: string[] // union of child tails in original order
  }
  const groups = new Map<string, Group>()
  // discovery pass: collect base cols and union child tails
  for (let i = 0; i < header.length; i++) {
    const col = header[i]
    const m = col.match(rxFirst)
    if (!m) continue
    const parent = m[1]
    const idx = Number(m[2])
    const tail = m[3] || ''
    let g = groups.get(parent)
    if (!g) g = { parent, indices: [], firstPos: i, baseByIdx: new Map(), unionTails: [] }
    if (!g.indices.includes(idx)) g.indices.push(idx)
    g.firstPos = Math.min(g.firstPos, i)
    // child tail: any segment that contains a property immediately followed by an index, e.g., ".prop[0]"
    const isChildTail = /\.[^.]+\[\d+\]/.test(tail)
    if (isChildTail) {
      if (!g.unionTails.includes(tail)) g.unionTails.push(tail)
    } else {
      const base = g.baseByIdx.get(idx) || []
      base.push(col)
      g.baseByIdx.set(idx, base)
    }
    groups.set(parent, g)
  }
  if (!groups.size) return header
  // remove all columns belonging to these parents; rebuild normalized chunks
  const parents = Array.from(groups.keys())
  const remove = new Set<string>()
  for (const col of header) {
    const m = col.match(rxFirst)
    if (m && parents.includes(m[1])) remove.add(col)
  }
  const filtered = header.filter(col => !remove.has(col))
  // for each group, also compute +1 index per child list (immediate child like .prop[0]...)
  for (const g of groups.values()) {
    const seenOrder: string[] = []
    const maxByKey: Map<string, number> = new Map()
    for (const t of g.unionTails) {
      const m2 = t.match(/^(\.[^.]+)\[(\d+)\](.*)$/)
      if (!m2) continue
      const key = m2[1] + '|' + m2[3] // group by property + tail suffix
      const idx = Number(m2[2])
      if (!seenOrder.includes(key)) seenOrder.push(key)
      maxByKey.set(key, Math.max(maxByKey.get(key) ?? -1, idx))
    }
    for (const key of seenOrder) {
      const [prop, suffix] = key.split('|')
      const max = maxByKey.get(key)
      if (max == null) continue
      const nextTail = `${prop}[${max + 1}]${suffix}`
      if (!g.unionTails.includes(nextTail)) g.unionTails.push(nextTail)
    }
  }
  // build normalized chunks and insert at earliest parent position
  const chunks = parents.map(p => groups.get(p)!).sort((a, b) => b.firstPos - a.firstPos)
  const out = filtered.slice()
  for (const g of chunks) {
    const cols: string[] = []
    for (const idx of g.indices) {
      const base = g.baseByIdx.get(idx) || []
      cols.push(...base)
      for (const t of g.unionTails) cols.push(`${g.parent}[${idx}]${t}`)
    }
    out.splice(g.firstPos, 0, ...cols)
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
      const inner = document.createElement('div')
      inner.className = 'cell-inner'
      inner.textContent = r[i] ?? ''
      td.appendChild(inner)
      if (editable) {
        td.tabIndex = 0
        td.dataset.row = String(ri)
        td.dataset.col = String(i)
        td.addEventListener('focus', () => {
          const cc = Number(td.dataset.col)
          setActiveColumn(cc)
        })
        td.addEventListener('click', () => startEdit(ri, i, 'end'))
        td.addEventListener('keydown', (e) => handleCellKey(e, ri, i))
      }
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  })
  outCsvTable.appendChild(tbody)
}

function handleCellKey(e: KeyboardEvent, r: number, c: number) {
  const key = e.key
  if (key === 'Enter') { e.preventDefault(); startEdit(r, c, 'end'); return }
  if (key === 'F2') { e.preventDefault(); startEdit(r, c, 'end'); return }
  if (key === 'ArrowDown') { e.preventDefault(); moveTo(r + 1, c, 'end'); return }
  if (key === 'ArrowUp') { e.preventDefault(); moveTo(Math.max(r - 1, 0), c, 'end'); return }
  if (key === 'ArrowLeft') { e.preventDefault(); moveTo(r, Math.max(c - 1, 0), 'end'); return }
  if (key === 'ArrowRight') { e.preventDefault(); moveTo(r, Math.min(c + 1, lastHeader.length - 1), 'start'); return }
  // any printable key starts editing
  if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault(); startEdit(r, c, 'end', key)
  }
}

function startEdit(r: number, c: number, edge: 'start'|'end', seed?: string) {
  editCell = { r, c }
  const td = getCell(r, c)
  if (!td) return
  // ensure target cell is fully visible (add bottom reserve to avoid clipping)
  _ensureCellVisible(r, c)
  // position overlay to align with cell rect
  const base = (td.querySelector('.cell-inner') as HTMLElement) || td
  const rect = base.getBoundingClientRect()
  const cs = getComputedStyle(base)
  overlay.style.display = 'block'
  overlay.style.left = `${Math.floor(rect.left + window.scrollX)}px`
  overlay.style.top = `${Math.floor(rect.top + window.scrollY)}px`
  // copy typography and padding from cell to avoid height mismatch
  overlay.style.font = cs.font
  overlay.style.lineHeight = cs.lineHeight
  overlay.style.paddingTop = cs.paddingTop
  overlay.style.paddingRight = cs.paddingRight
  overlay.style.paddingBottom = cs.paddingBottom
  overlay.style.paddingLeft = cs.paddingLeft
  // set exact size to cell's border-box to prevent covering next row
  overlay.style.width = `${base.clientWidth}px`
  overlay.style.height = `${base.clientHeight}px`
  overlay.value = ((base.textContent || '')).replace(/\u200B/g, '')
  if (seed) overlay.value = seed
  requestAnimationFrame(() => {
    overlay.focus()
    const pos = edge === 'start' ? 0 : overlay.value.length
    overlay.setSelectionRange(pos, pos)
  })
}

function commitEdit() {
  if (!editCell) return
  const { r, c } = editCell
  const val = overlay.value
  lastRows[r][c] = val
  const td = getCell(r, c)
  if (td) {
    const inner = td.querySelector('.cell-inner') as HTMLElement | null
    if (inner) inner.textContent = val
    else td.textContent = val
  }
  updateJsonFromRows()
  const before = lastRows.length
  lastRows = ensureExtraBlankRow(lastRows, lastHeader.length)
  if (lastRows.length !== before) renderTable(lastHeader, lastRows, true)
  editCell = null
}

function endEdit() {
  overlay.style.display = 'none'
}

function moveTo(r: number, c: number, edge: 'start'|'end') {
  if (r >= lastRows.length - 1) {
    const before = lastRows.length
    lastRows = ensureExtraBlankRow(lastRows, lastHeader.length)
    if (lastRows.length !== before) renderTable(lastHeader, lastRows, true)
  }
  const rr = Math.min(Math.max(r, 0), lastRows.length - 1)
  const cc = Math.min(Math.max(c, 0), lastHeader.length - 1)
  startEdit(rr, cc, edge)
}

function getCell(r: number, c: number): HTMLTableCellElement | null {
  const tb = outCsvTable.tBodies[0]
  if (!tb) return null
  const tr = tb.rows[r]
  if (!tr) return null
  return tr.cells[c] as HTMLTableCellElement
}

overlay.addEventListener('keydown', (e) => {
  if (!editCell) return
  const { r, c } = editCell
  if (e.key === 'Enter') { e.preventDefault(); commitEdit(); moveTo(r+1, c, 'end'); return }
  if (e.key === 'Tab') { e.preventDefault(); commitEdit(); moveTo(r, c+1, 'start'); return }
  if (e.key === 'ArrowDown') { e.preventDefault(); commitEdit(); moveTo(r+1, c, 'end'); return }
  if (e.key === 'ArrowUp') { e.preventDefault(); commitEdit(); moveTo(Math.max(r-1,0), c, 'end'); return }
  if (e.key === 'ArrowLeft') {
    const pos = overlay.selectionStart ?? 0
    if (pos === 0) { e.preventDefault(); commitEdit(); moveTo(r, Math.max(c-1,0), 'end'); return }
  }
  if (e.key === 'ArrowRight') {
    const pos = overlay.selectionStart ?? overlay.value.length
    if (pos === overlay.value.length) { e.preventDefault(); commitEdit(); moveTo(r, Math.min(c+1, lastHeader.length-1), 'start'); return }
  }
})
overlay.addEventListener('blur', () => { commitEdit(); endEdit() })

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
  // First create +1 indices, then normalize/propagate child subtrees so new indices get child tails too
  header = addExtraIndexPerList(header, 1)
  header = normalizeAndPropagateChildSubtree(header)
  header = mergeHeaderWithFallback(header, lastHeader)
  outHeader.value = header.join('\n')
})

btnCsv.addEventListener('click', () => {
  const json = api.getJson()
  let { header } = Flatten.buildHeaderFromJson(json, currentListStrategy())
  header = addExtraIndexPerList(header, 1)
  header = normalizeAndPropagateChildSubtree(header)
  header = mergeHeaderWithFallback(header, lastHeader)
  const arr = Array.isArray(json) ? json : [json]
  let rows = arr.map(r => Flatten.flattenToRow(r, header))
  rows = ensureExtraBlankRow(rows, header.length)
  lastHeader = header
  lastRows = rows
  baseIsArray = Array.isArray(json)
  renderTable(header, rows, true)
})

// Sort columns to keep blocks (e.g., items[0].*) contiguous and ordered
btnSort.addEventListener('click', () => {
  let header = lastHeader.length ? lastHeader.slice() : (outHeader.value ? outHeader.value.split('\n').filter(Boolean) : [])
  if (!header.length) return
  const rows = lastRows.length ? lastRows.slice() : []
  const res = sortHeaderAndRows(header, rows)
  lastHeader = res.header
  lastRows = res.rows
  outHeader.value = lastHeader.join('\n')
  renderTable(lastHeader, lastRows, true)
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

// Upload & parse CSV → update header/rows/table/json
inpUploadCsv.addEventListener('change', async () => {
  const file = inpUploadCsv.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const parsed = Csv.parseCsvText(text, { hasHeader: true, skipEmptyLines: true })
    let header = parsed.header
    header = addExtraIndexPerList(header, 1)
    header = normalizeAndPropagateChildSubtree(header)
    const rows = parsed.rows
    // Optionally keep previously edited roots
    header = mergeHeaderWithFallback(header, lastHeader)
    lastHeader = header
    // normalize rows to header width
    let norm = rows.map(r => {
      const rr = r.slice(0, header.length)
      while (rr.length < header.length) rr.push('')
      return rr
    })
    norm = ensureExtraBlankRow(norm, header.length)
    lastRows = norm
    outHeader.value = header.join('\n')
    baseIsArray = true
    renderTable(lastHeader, lastRows, true)
    // reflect into JSON
    updateJsonFromRows()
  } catch (e) {
    console.error('CSV upload failed:', e)
  } finally {
    inpUploadCsv.value = ''
  }
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


// removed unused caret helpers to satisfy lint rules

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

















function _ensureCellVisible(r: number, c: number) {
  const td = getCell(r, c)
  if (!td) return
  const container = outCsvTable.closest('.table-responsive') as HTMLElement | null
  if (container) {
    const tdRect = td.getBoundingClientRect()
    const contRect = container.getBoundingClientRect()
    // add a base reserve to avoid visual clipping of the last row
    const reserve = 16
    if (tdRect.bottom > contRect.bottom) {
      const dy = tdRect.bottom - contRect.bottom + reserve
      container.scrollTop += dy
    } else if (tdRect.top < contRect.top) {
      const dy = contRect.top - tdRect.top + reserve
      container.scrollTop -= dy
    }
    if (tdRect.right > contRect.right) {
      const dx = tdRect.right - contRect.right + 8
      container.scrollLeft += dx
    } else if (tdRect.left < contRect.left) {
      const dx = contRect.left - tdRect.left + 8
      container.scrollLeft -= dx
    }
  } else {
    td.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
  const rect = td.getBoundingClientRect()
  const vw = window.innerWidth, vh = window.innerHeight
  let wx = 0, wy = 0
  const reserve = 24
  if (rect.bottom > vh) wy = rect.bottom - vh + reserve
  else if (rect.top < 0) wy = rect.top - reserve
  if (rect.right > vw) wx = rect.right - vw + 8
  else if (rect.left < 0) wx = rect.left - 8
  if (wx || wy) window.scrollBy({ left: wx, top: wy, behavior: 'auto' })



}
