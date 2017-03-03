const _ = require('lodash')

const insert = function * (name, data) {
}

const upsert = function * (name, item) {
}

class Table {
  constructor(bag, config) {
    this._bag = bag
    this.name = config.name
  }

  * get(id) {
    const text = `
      SELECT *
      FROM "${this.name}"
      WHERE id = $1
    `
    const res = yield this._bag.pool.query(text, [id])
    return res.rows[0]
  }

  * put(item) {
    let res
    if (!item.id) {
      res = yield this._insert(item)
    } else {
      res = yield this._upsert(item)
    }
    const { data } = res.rows[0]
    data.id = res.rows[0].id
    return data
  }

  * delete(id) {
    const text = `DELETE FROM ${this.name} WHERE id = $1`
    const params = [id]
    yield this._bag.pool.query(text, params)
  }

  * _insert(data) {
    const text = `
      INSERT INTO "${this.name}" (data) VALUES ($1)
      RETURNING *
    `
    const params = [data]
    return yield this._bag.pool.query(text, params)
  }

  * _upsert(item) {
    const { id } = item
    const inData = _.omit(item, 'id')
    const params = [id, inData]
    const text = `
      INSERT INTO "${this.name}" as t (id, data) VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE
        SET data = $2
        WHERE t.id = $1
      RETURNING *
    `
    return yield this._bag.pool.query(text, params)
  }
}

class Bag {
  constructor(pool) {
    this.pool = pool
  }

  addTable(name, config) {
    config = config || {}
    config.name = config.name || name
    this[name] = new Table(this, config)
  }
}

module.exports = {
  Bag
}
