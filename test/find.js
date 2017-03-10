const co = require('co')
const { expect } = require('chai')
const { Bag } = require('../')
const Pool = require('pg-pool')
const uuid = require('node-uuid').v4

const pool = new Pool({
  max: 1
})

const bag = new Bag(pool)
bag.addTable('people', {
  columns: {
    email: { unique: true }
  }
})

describe('unique', () => {
  before(co.wrap(function* () {
    yield bag.migrate(true)
  }))

  after(() => {
    return pool.end()
  })

  it('returns null if no results', co.wrap(function* () {
    const res = yield bag.people.find({ email: 'foo' })
    expect(res).to.equal(null)
  }))
})
