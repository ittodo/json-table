export type Validator = (v: unknown) => string | null

export function required(msg = 'Required'): Validator {
  return (v) => (v === undefined || v === null || v === '' ? msg : null)
}

export function oneOf(options: string[], msg = 'Invalid value'): Validator {
  const set = new Set(options)
  return (v) => (typeof v === 'string' && set.has(v) ? null : msg)
}
