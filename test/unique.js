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

  it('can create and get person by email', co.wrap(function * () {
    const person = yield bag.people.put({
      email: 'foo',
      password: 'bar'
    })
    expect(person.id).to.be.a('string')
    expect(person.email).to.equal('foo')
    expect(person.password).to.equal('bar')

    const found = yield bag.people.find({ email: 'foo' })
    expect(found.email).to.eql(person.email)
    expect(found.password).to.eql(person.password)
    return console.log('FOUND', found)
    expect(found).to.equal(person)
  }))
})

