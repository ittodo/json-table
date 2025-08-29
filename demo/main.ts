import { init, Flatten, Csv } from '../src/index'

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

function renderTable(header: string[], rows: string[][]) {
  // clear
  outCsvTable.innerHTML = ''
  // thead
  const thead = document.createElement('thead')
  const trh = document.createElement('tr')
  for (const h of header) {
    const th = document.createElement('th')
    th.textContent = h
    trh.appendChild(th)
  }
  thead.appendChild(trh)
  outCsvTable.appendChild(thead)
  // tbody
  const tbody = document.createElement('tbody')
  for (const r of rows) {
    const tr = document.createElement('tr')
    for (let i = 0; i < header.length; i++) {
      const td = document.createElement('td')
      td.textContent = r[i] ?? ''
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
  outCsvTable.appendChild(tbody)
}

btnHeader.addEventListener('click', () => {
  const json = api.getJson()
  const { header } = Flatten.buildHeaderFromJson(json, currentListStrategy())
  outHeader.textContent = header.join('\n')
})

btnCsv.addEventListener('click', () => {
  const json = api.getJson()
  const { header } = Flatten.buildHeaderFromJson(json, currentListStrategy())
  const arr = Array.isArray(json) ? json : [json]
  const rows = arr.map(r => Flatten.flattenToRow(r, header))
  renderTable(header, rows)
})

btnDownload.addEventListener('click', () => {
  const json = api.getJson()
  const { header } = Flatten.buildHeaderFromJson(json, currentListStrategy())
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

