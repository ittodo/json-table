import { describe, it, expect } from 'vitest'
import { Flatten } from './index'

describe('flatten/unflatten', () => {
  const obj = {
    id: 1,
    name: 'Alice',
    stats: { hp: 10, mp: 5 },
    items: [ { id: 100, name: 'Potion' } ]
  }

  it('builds dynamic header and flattens', () => {
    const { header } = Flatten.buildDynamicHeaderFromJson(obj)
    expect(header).toContain('stats.hp')
    expect(header).toContain('items[0].id')
    const row = Flatten.flattenToRow(obj, header)
    const json2 = Flatten.unflattenFromRow(header, row)
    expect(json2.stats.hp).toBe('10')
    expect(json2.items[0].id).toBe('100')
  })
})

