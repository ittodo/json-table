import { parsePath, buildHeader, scanSchema, type PathToken, type ListMaxes } from './schema'

function getAt(obj: any, tokens: PathToken[]): any {
  let cur = obj
  for (const t of tokens) {
    if (cur == null) return undefined
    if (t.key) cur = cur[t.key]
    if (t.index !== undefined) {
      if (!Array.isArray(cur)) return undefined
      cur = cur[t.index]
    }
  }
  return cur
}

function setAt(obj: any, tokens: PathToken[], value: any) {
  let cur = obj
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const last = i === tokens.length - 1
    if (t.key) {
      if (cur[t.key] === undefined) cur[t.key] = t.index !== undefined ? [] : (last ? value : {})
      cur = cur[t.key]
    }
    if (t.index !== undefined) {
      if (!Array.isArray(cur)) cur = (cur[t.key!] = [])
      if (last) {
        cur[t.index] = value
      } else {
        if (cur[t.index] === undefined) cur[t.index] = {}
        cur = cur[t.index]
      }
    } else if (last && t.key) {
      // if last and only key, assign
      cur[t.key] = value
    }
  }
}

function toStringValue(v: any): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  return JSON.stringify(v)
}

export function buildDynamicHeaderFromJson(json: any | any[]): { header: string[]; listMaxes: ListMaxes } {
  const { prototypeHeader, listMaxes } = scanSchema(json)
  return { header: buildHeader(prototypeHeader, listMaxes), listMaxes }
}

export function flattenToRow(obj: any, header: string[]): string[] {
  return header.map(col => toStringValue(getAt(obj, parsePath(col))))
}

export type GapMode = 'break' | 'sparse'

export function unflattenFromRow(header: string[], row: string[], gap: GapMode = 'break'): any {
  const root: any = {}
  for (let i = 0; i < header.length; i++) {
    const col = header[i]
    const val = row[i]
    if (val == null || val === '') continue
    setAt(root, parsePath(col), val)
  }
  // Note: gap handling is implicit by presence; empty indices are not created.
  return root
}
