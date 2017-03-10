const _ = require('lodash')

const omit = (object, key) => {
  const result = { }
  for (var k in object) {
    if (k !== key) {
      result[k] = object[k]
    }
  }
  return result
}

const log = (one, two, three, four) => {
  console.log(one, two, three, four)
}

const smoosh = res => {
  return _.extend({}, res.rows[0].data, { id: res.rows[0].id })
}

class Table {
  constructor(bag, config) {
    this._bag = bag
    this.name = config.name
    this.columns = config.columns || {}
  }

  * query(text, params) {
    const client = yield this._bag.pool.connect()
    try {
      const res = yield client.query(text, params)
      return res
    } finally {
      client.release()
    }
  }

  * get(id) {
    const text = `
      SELECT *
      FROM "${this.name}"
      WHERE id = $1
    `
    log(text)
    const res = yield this.query(text, [id])
    const [row] = res.rows
    if (!row) {
      return undefined
    }
    return smoosh(res)
  }

  * put(item) {
    let res
    if (!item.id) {
      return yield this._insert(item)
    }
    return yield this._upsert(item)
  }

  * delete(id) {
    const text = `DELETE FROM ${this.name} WHERE id = $1`
    const params = [id]
    log('bag.delete', text)
    yield this.query(text, params)
  }

  * _insert(data) {
    const colNames = Object.keys(this.columns)
    const colQuery = colNames.length ? `, ${colNames.join(', ')}` : ''
    const colVals = colNames.length ? `, ${colNames.map((_, idx) => '$' + (idx + 2))}` : ''
    const text = `
      INSERT INTO "${this.name}"
             (data ${colQuery})
      VALUES ($1 ${colVals})
      RETURNING *
    `
    const params = [data].concat(colNames.map(col => {
      return data[col]
    }))
    log('bag.insert', text, params)
    const res = yield this.query(text, params)
    return smoosh(res)
  }

  * _upsert(item) {
    const { id } = item
    const colNames = Object.keys(this.columns)
    const inData = omit(item, 'id')
    const params = [id].concat(colNames.map(col => {
      return item[col]
    })).concat([inData])
    const text = `
      INSERT INTO
        "${this.name}" as t
             (id, data)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE
        SET data = $2
        WHERE t.id = $1
      RETURNING *
    `
    log('bag.upsert', text, params)
    const res = yield this.query(text, params)
    return smoosh(res)
  }

  * find(query) {
    const keys = Object.keys(query)
    const vals = keys.map(key => query[key])
    const clauses = keys.map((key, idx) => `${key} = $${idx+1}`)
    const whereClause = ``
    const text = `
      SELECT *
      FROM "${this.name}"
      WHERE ${clauses.join(' AND ')}
    `
    log('bag.find', text)
    const res = yield this.query(text, vals)
    return smoosh(res)
  }
}

class Bag {
  constructor(pool) {
    this.pool = pool
    this.tables = []
  }

  addTable(name, config) {
    config = config || {}
    config.name = config.name || name
    const table = new Table(this, config)
    this.tables.push(table)
    this[name] = table
  }

  * migrate(isTemp) {
    const client = yield this.pool.connect()
    log('migrating database')
    try {
      yield client.query('BEGIN')
      yield client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
      for(let table of this.tables) {
        const createText = createTableText(table, isTemp)
        log(createText)
        yield client.query(createText)
      }
      yield client.query('COMMIT')
    } finally {
      client.release()
    }
  }
}

const createTableText = (table, isTemp) => {
  const temp = isTemp ? 'TEMP' : ''
  const extraCols = Object.keys(table.columns).map(key => {
    const col = table.columns[key]
    const type = col.type || 'TEXT'
    const unique = col.unique ? 'UNIQUE' : ''
    return `${key} ${type} ${unique}`
  }).join(',\n')
  const colQuery = extraCols ? `${extraCols},` : ''
  return `
CREATE ${temp} TABLE IF NOT EXISTS ${table.name} (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  ${colQuery}
  data JSON
)
`
}

module.exports = {
  Bag
}
