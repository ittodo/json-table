import { init } from '../src/index'

const app = document.getElementById('app')!
const api = init(app, {
  initialJson: {
    id: 1,
    name: 'Alice',
    stats: { hp: 10, mp: 5 },
    items: [ { id: 100, name: 'Potion' } ]
  }
})

// eslint-disable-next-line no-console
console.log('JsonTable initialized', api.getJson())
