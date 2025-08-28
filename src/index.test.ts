import { describe, it, expect, beforeEach } from 'vitest'
import { init } from './index'

describe('init', () => {
  let container: HTMLElement
  beforeEach(() => {
    container = document.createElement('div')
    document.body.innerHTML = ''
    document.body.appendChild(container)
  })

  it('returns API and mounts UI', () => {
    const api = init(container, { initialJson: { a: 1 } })
    expect(api).toBeTruthy()
    expect(typeof api.getJson).toBe('function')
    expect(container.querySelector('#jt-editor')).toBeTruthy()
    const json = api.getJson() as any
    expect(json.a).toBe(1)
  })
})
