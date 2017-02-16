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

  after(() => {
    return pool.end()
  })

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
  }))
})
