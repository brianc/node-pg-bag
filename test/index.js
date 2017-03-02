const co = require('co')
const { expect } = require('chai')
const { Bag } = require('../')
const Pool = require('pg-pool')
const uuid = require('node-uuid').v4

const pool = new Pool({
  max: 1
})

const bag = new Bag(pool)

bag.addTable('users')

describe('pg-bag', () => {
  before(() => {
    return pool.query(
      `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TEMP TABLE users(
        id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
        data JSON
      )`
    )
  })

  beforeEach(() => pool.query('BEGIN'))
  afterEach(() => pool.query('ROLLBACK'))

  after(() => {
    return pool.end()
  })

  const count = (table = 'users') => pool.query(`SELECT COUNT(*) FROM ${table}`).then(res => res.rows[0].count)

  it('makes a bag', co.wrap(function * () {
    const user = yield bag.users.get(uuid())
    expect(user).to.eql(undefined)
  }))

  it('saves into bag', co.wrap(function * () {
    const user = yield bag.users.put({
      name: 'brian'
    });
    expect(user.id).to.be.a('string')
    expect(user.name).to.eql('brian')
    expect(yield count()).to.equal('1')
  }))

  it('can delete from bag', co.wrap(function * () {
    const user = yield bag.users.put({ name: 'brian' });
    expect(yield count()).to.equal('1')
    bag.users.delete(user.id)
    expect(yield count()).to.equal('0')
  }))
})
