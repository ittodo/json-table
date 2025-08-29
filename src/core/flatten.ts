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

function setAt(root: any, tokens: PathToken[], value: any) {
  let cur = root
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const last = i === tokens.length - 1

    // segment with key only
    if (t.key && t.index === undefined) {
      if (last) {
        cur[t.key] = value
        return
      }
      if (cur[t.key] === undefined || typeof cur[t.key] !== 'object' || Array.isArray(cur[t.key])) {
        cur[t.key] = {}
      }
      cur = cur[t.key]
      continue
    }

    // segment with key + index (array under key)
    if (t.key && t.index !== undefined) {
      if (!Array.isArray(cur[t.key])) cur[t.key] = []
      if (last) {
        cur[t.key][t.index] = value
        return
      }
      if (cur[t.key][t.index] === undefined || typeof cur[t.key][t.index] !== 'object' || Array.isArray(cur[t.key][t.index])) {
        cur[t.key][t.index] = {}
      }
      cur = cur[t.key][t.index]
      continue
    }

    // segment with only index (not expected from parsePath, but safe-guard)
    if (!t.key && t.index !== undefined) {
      if (!Array.isArray(cur)) {
        // cannot attach to array without a key; skip
        return
      }
      if (last) {
        cur[t.index] = value
        return
      }
      if (cur[t.index] === undefined || typeof cur[t.index] !== 'object' || Array.isArray(cur[t.index])) {
        cur[t.index] = {}
      }
      cur = cur[t.index]
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

export interface BuildHeaderOptions {
  listStrategy?: 'dynamic' | 'fixed'
  fixedListMax?: number
}

/**
 * Build a header from json using either dynamic or fixed list strategy.
 * - dynamic: expands list indices based on observed data lengths
 * - fixed: expands every list placeholder [0] up to fixedListMax (default 0)
 */
export function buildHeaderFromJson(
  json: any | any[],
  opts: BuildHeaderOptions = {}
): { header: string[]; listMaxes: ListMaxes } {
  const { prototypeHeader, listMaxes } = scanSchema(json)
  const strategy = opts.listStrategy ?? 'dynamic'
  if (strategy === 'fixed') {
    const K = Math.max(0, opts.fixedListMax ?? 0)
    const fixedMaxes: ListMaxes = {}
    for (const col of prototypeHeader) {
      const m = col.match(/^(.*)\[(\d+)\]/)
      if (m) {
        const root = m[1]
        fixedMaxes[root] = Math.max(fixedMaxes[root] || 0, K)
      }
    }
    return { header: buildHeader(prototypeHeader, fixedMaxes), listMaxes: fixedMaxes }
  }
  return { header: buildHeader(prototypeHeader, listMaxes), listMaxes }
}

export function buildDynamicHeaderFromJson(json: any | any[]): { header: string[]; listMaxes: ListMaxes } {
  return buildHeaderFromJson(json, { listStrategy: 'dynamic' })
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
