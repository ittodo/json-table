export type GapMode = 'break' | 'sparse'

export interface InitOptions {
  initialJson?: unknown
  listStrategy?: 'dynamic' | 'fixed'
  fixedListMax?: number
  gapMode?: GapMode
  enumMap?: Record<string, string[]>
  formatters?: Record<string, (v: unknown) => string>
  parsers?: Record<string, (s: string) => unknown>
  validators?: Record<string, (v: unknown) => string | null>
  onChange?: (state: { json: unknown; errors: string[] }) => void
  onError?: (err: Error) => void
}

export interface JsonTableApi {
  getJson(): unknown
  setJson(json: unknown): void
  getCsv(opts?: { sep?: string; bom?: boolean; newline?: '\n' | '\r\n' }): string
  destroy(): void
}

export function init(container: HTMLElement, options: InitOptions = {}): JsonTableApi {
  // minimal placeholder UI
  container.innerHTML = `<div style="display:flex;gap:8px;align-items:center;font:14px system-ui">
    <button id="jt-json">JSON</button>
    <button id="jt-table">Table</button>
    <span>JsonTable (preview)</span>
  </div>
  <textarea id="jt-editor" style="width:100%;height:240px;margin-top:8px"></textarea>`

  const editor = container.querySelector<HTMLTextAreaElement>('#jt-editor')!
  if (options.initialJson !== undefined) {
    try { editor.value = JSON.stringify(options.initialJson, null, 2) } catch {}
  }

  const api: JsonTableApi = {
    getJson() {
      try { return JSON.parse(editor.value) } catch { return null }
    },
    setJson(json: unknown) {
      editor.value = JSON.stringify(json, null, 2)
      options.onChange?.({ json, errors: [] })
    },
    getCsv() {
      // stub
      return ''
    },
    destroy() {
      container.innerHTML = ''
    }
  }

  return api
}
