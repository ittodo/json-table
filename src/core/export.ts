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
