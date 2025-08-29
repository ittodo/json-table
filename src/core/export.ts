export interface CsvOptions { sep?: string; bom?: boolean; newline?: '\n' | '\r\n' }

function escapeField(s: string, sep: string): string {
  const needs = s.includes(sep) || s.includes('"') || s.includes('\n') || s.includes('\r')
  if (!needs) return s
  return '"' + s.replace(/"/g, '""') + '"'
}

export function toCsv(header: string[], rows: string[][], opts: CsvOptions = {}): string {
  const sep = opts.sep ?? ','
  const nl = opts.newline ?? '\n'
  const head = header.map(h => escapeField(h, sep)).join(sep)
  const body = rows.map(r => r.map(c => escapeField(c ?? '', sep)).join(sep)).join(nl)
  const csv = head + (rows.length ? nl + body : '')
  return (opts.bom ? '\uFEFF' : '') + csv
}

// Lightweight wrapper around papaparse for text parsing
import Papa from 'papaparse'

export interface ParseCsvTextOptions {
  sep?: string
  hasHeader?: boolean
  skipEmptyLines?: boolean
}

export function parseCsvText(text: string, opts: ParseCsvTextOptions = {}): { header: string[]; rows: string[][] } {
  // Papaparse auto-detects delimiter; allow override via sep
  const res = Papa.parse<string[]>(text, {
    delimiter: opts.sep || undefined,
    header: false,
    skipEmptyLines: opts.skipEmptyLines ?? true,
    dynamicTyping: false
  })
  const data = Array.isArray(res.data) ? (res.data as unknown as string[][]) : []
  const rows = data.map(r => r.map(c => (c == null ? '' : String(c))))
  const header = (opts.hasHeader ?? true) && rows.length ? rows.shift()! : []
  return { header, rows }
}
