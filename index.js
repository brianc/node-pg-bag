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
