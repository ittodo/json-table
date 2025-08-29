export type Json = any

export interface ListMaxes { [root: string]: number }

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function joinPath(base: string, seg: string): string {
  return base ? `${base}.${seg}` : seg
}

export interface ScanResult {
  prototypeHeader: string[] // includes list roots with [0] placeholders
  listMaxes: ListMaxes
}

/**
 * Scan JSON value(s) to produce a prototype header and list maxes.
 * Prototype header uses [0] as placeholder for list indices, e.g., items[0].id.
 */
export function scanSchema(json: Json | Json[]): ScanResult {
  const arr = Array.isArray(json) ? json : [json]
  const proto: string[] = []
  const seen = new Set<string>()
  const listMaxes: ListMaxes = {}

  function addProto(path: string) {
    if (!path) return
    if (!seen.has(path)) {
      seen.add(path)
      proto.push(path)
    }
  }

  function walk(val: any, prefix: string) {
    if (Array.isArray(val)) {
      const rootName = prefix
      const k = val.length
      if (rootName) {
        listMaxes[rootName] = Math.max(listMaxes[rootName] || 0, k)
      }
      // collect inner tails using [0] placeholder; union across ALL elements
      if (k > 0) {
        for (let i = 0; i < k; i++) {
          walk(val[i], `${prefix}[0]`)
        }
      } else {
        // empty list: keep placeholder root itself
        addProto(prefix)
      }
      return
    }
    if (isPlainObject(val)) {
      for (const [k, v] of Object.entries(val)) {
        walk(v, joinPath(prefix, k))
      }
      return
    }
    // primitive/leaf
    addProto(prefix)
  }

  for (const it of arr) walk(it, '')

  // preserve discovery order; do not sort
  return { prototypeHeader: proto, listMaxes }
}

/** Build concrete header by expanding [0] placeholders up to listMaxes */
export function buildHeader(prototypeHeader: string[], listMaxes: ListMaxes): string[] {
  const out: string[] = []

  // First pass: collect list tails per root, preserving prototypeHeader order
  const tailsByRoot = new Map<string, string[]>()
  for (const col of prototypeHeader) {
    const m = col.match(/^(.*)\[(\d+)\](\..*)?$/)
    if (m) {
      const root = m[1]
      const tail = m[3] || ''
      const list = tailsByRoot.get(root) ?? []
      if (!list.includes(tail)) list.push(tail)
      tailsByRoot.set(root, list)
    }
  }

  // Second pass: emit columns, but for each list root, expand once at first occurrence
  const emittedRoots = new Set<string>()
  for (const col of prototypeHeader) {
    const m = col.match(/^(.*)\[(\d+)\](\..*)?$/)
    if (!m) {
      out.push(col)
      continue
    }
    const root = m[1]
    if (emittedRoots.has(root)) continue
    emittedRoots.add(root)
    const k = listMaxes[root] || 0
    const tails = tailsByRoot.get(root) || ['']
    // Index-first ordering: items[0].id, items[0].name, items[1].id, items[1].name
    for (let i = 0; i < k; i++) {
      for (const tail of tails) {
        out.push(`${root}[${i}]${tail}`)
      }
    }
  }

  return out
}

/** Tokenize a column path like items[2].id → [ ['items',2], 'id' ] */
export type PathToken = { key: string; index?: number }

export function parsePath(col: string): PathToken[] {
  const parts = col.split('.')
  const tokens: PathToken[] = []
  for (const p of parts) {
    const m = p.match(/^(.*?)(?:\[(\d+)\])?$/)
    if (m) {
      const key = m[1]
      const idx = m[2] !== undefined ? Number(m[2]) : undefined
      if (key) tokens.push({ key, index: idx })
      else if (idx !== undefined) tokens.push({ key: '', index: idx })
    }
  }
  return tokens
}
