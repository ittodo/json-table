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
const outCsv = document.getElementById('out-csv') as HTMLTextAreaElement

btnHeader.addEventListener('click', () => {
  const json = api.getJson()
  const { header } = Flatten.buildDynamicHeaderFromJson(json)
  outHeader.textContent = header.join('\n')
})

btnCsv.addEventListener('click', () => {
  const json = api.getJson()
  const { header } = Flatten.buildDynamicHeaderFromJson(json)
  const arr = Array.isArray(json) ? json : [json]
  const rows = arr.map(r => Flatten.flattenToRow(r, header))
  outCsv.value = Csv.toCsv(header, rows, { sep: ',', bom: false, newline: '\n' })
})

