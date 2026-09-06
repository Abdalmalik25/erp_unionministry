// server/middleware/requestDb.js
// Minimal knex-compatible query builder attached to req.db for Phase 6 routers
// (contracts, disputes, inspections, crossPortal). Backed by the shared pg pool.

import { pool } from './shared.js';

class RawValue {
  constructor(sql, params = []) {
    this.sql = String(sql);
    this.params = params;
    this.isRaw = true;
  }

  then(resolve, reject) {
    return rawQuery(this.sql, this.params).then(resolve, reject);
  }
}

const wrapIdent = (id) => `"${String(id).replace(/"/g, '""')}"`;

// Map camelCase column references (e.g. 'createdAt') to snake_case DB columns (created_at).
// Leaves already-snake, numeric, aliased, and wildcard identifiers untouched.
function snakeCol(id) {
  const s = String(id);
  if (s === '*' || s === '') return s;
  return s.replace(/([a-z0-9])([A-Z])/g, (_, a, b) => `${a}_${b.toLowerCase()}`);
}

function rawQuery(sql, params = []) {
  return pool.query(sql, params).then((r) => r.rows);
}

class QueryBuilder {
  constructor(table) {
    this._table = table;
    this._cols = [];
    this._wheres = [];
    this._orderBy = [];
    this._groupBy = [];
    this._limit = null;
    this._offset = null;
    this._countClause = null;
    this._method = null;
    this._returning = null;
    this._first = false;
    this._data = null;
  }

  select(...cols) {
    this._cols = cols;
    return this;
  }

  where(...args) {
    if (typeof args[0] === 'function') {
      const sub = new QueryBuilder(this._table);
      args[0].call(sub, sub);
      this._wheres.push({ type: 'nested', builder: sub });
      return this;
    }
    const [col, b, c] = args;
    if (args.length === 3) {
      this._wheres.push({ type: 'basic', col, op: b, val: c, conj: 'AND' });
    } else {
      if (b instanceof RawValue) {
        this._wheres.push({ type: 'raw', col, raw: b, conj: 'AND' });
      } else {
        this._wheres.push({ type: 'basic', col, op: '=', val: b, conj: 'AND' });
      }
    }
    return this;
  }

  orWhere(...args) {
    const [col, b, c] = args;
    if (args.length === 3) {
      this._wheres.push({ type: 'basic', col, op: b, val: c, conj: 'OR' });
    } else {
      this._wheres.push({ type: 'basic', col, op: '=', val: b, conj: 'OR' });
    }
    return this;
  }

  whereIn(col, vals) {
    this._wheres.push({ type: 'in', col, vals: Array.isArray(vals) ? vals : [vals], conj: 'AND' });
    return this;
  }

  whereILike(col, val) {
    this._wheres.push({ type: 'ilike', col, val, conj: 'AND' });
    return this;
  }

  orWhereILike(col, val) {
    this._wheres.push({ type: 'ilike', col, val, conj: 'OR' });
    return this;
  }

  orderBy(col, dir = 'asc') {
    this._orderBy.push({ col, dir });
    return this;
  }

  limit(n) {
    this._limit = Number(n);
    return this;
  }

  offset(n) {
    this._offset = Number(n);
    return this;
  }

  groupBy(...cols) {
    this._groupBy = this._groupBy.concat(cols);
    return this;
  }

  count(expr) {
    if (expr) {
      const parts = String(expr).split(/\s+as\s+/i);
      this._countClause = {
        expr: parts[0] || '*',
        alias: parts.length > 1 ? parts[1] : 'count',
      };
    } else {
      this._countClause = { expr: '*', alias: 'count' };
    }
    return this;
  }

  first() {
    this._first = true;
    if (this._limit === null) this._limit = 1;
    return this;
  }

  clone() {
    const c = new QueryBuilder(this._table);
    c._cols = [...this._cols];
    c._wheres = this._wheres.map((w) => (w.type === 'nested' ? { type: 'nested', builder: w.builder.clone() } : { ...w, vals: w.vals ? [...w.vals] : w.vals }));
    c._orderBy = [...this._orderBy];
    c._groupBy = [...this._groupBy];
    c._limit = this._limit;
    c._offset = this._offset;
    c._countClause = this._countClause;
    c._method = this._method;
    c._returning = this._returning;
    c._first = this._first;
    c._data = this._data;
    return c;
  }

  insert(data) {
    this._method = 'insert';
    this._data = data;
    return this;
  }

  update(data) {
    this._method = 'update';
    this._data = data;
    return this;
  }

  delete() {
    this._method = 'delete';
    return this;
  }

  returning(cols) {
    this._returning = cols;
    return this;
  }

  _pushParam(ctx, val) {
    if (val instanceof RawValue) {
      let idx = 0;
      const mapped = val.sql.replace(/\?/g, () => `$${ctx.params.push(val.params[idx++])}`);
      return mapped;
    }
    ctx.params.push(val);
    return `$${ctx.params.length}`;
  }

  _buildValue(ctx, val) {
    if (val instanceof RawValue) return this._pushParam(ctx, val);
    if (val && typeof val === 'object' && !(val instanceof Date) && val.type) {
      // geometry-ish or typed objects fall back to JSON
      ctx.params.push(JSON.stringify(val));
      return `$${ctx.params.length}`;
    }
    if (typeof val === 'object' && val !== null && !(val instanceof Date) && !Array.isArray(val) && val.constructor === Object) {
      ctx.params.push(JSON.stringify(val));
      return `$${ctx.params.length}`;
    }
    return this._pushParam(ctx, val);
  }

  _compileWhere(ctx) {
    const clauses = [];
    for (const w of this._wheres) {
      const conj = w.conj || 'AND';
      if (w.type === 'nested') {
        const inner = w.builder._compileWhere(ctx);
        if (inner) clauses.push({ conj: 'AND', text: `(${inner})` });
        continue;
      }
      if (w.type === 'basic') {
        clauses.push({ conj, text: `${wrapIdent(snakeCol(w.col))} ${w.op} ${this._buildValue(ctx, w.val)}` });
      } else if (w.type === 'raw') {
        clauses.push({ conj, text: `${wrapIdent(snakeCol(w.col))} = ${this._pushParam(ctx, w.raw)}` });
      } else if (w.type === 'in') {
        const ph = w.vals.map((v) => this._buildValue(ctx, v));
        clauses.push({ conj, text: `${wrapIdent(snakeCol(w.col))} IN (${ph.join(', ')})` });
      } else if (w.type === 'ilike') {
        clauses.push({ conj, text: `${wrapIdent(snakeCol(w.col))} ILIKE ${this._buildValue(ctx, w.val)}` });
      }
    }
    if (!clauses.length) return '';
    return clauses.map((c, i) => (i === 0 ? c.text : ` ${c.conj} ${c.text}`)).join('');
  }

  _compile() {
    const ctx = { params: [] };
    let sql = '';

    if (this._method === 'insert') {
      const rows = Array.isArray(this._data) ? this._data : [this._data];
      const keys = Object.keys(rows[0] || {});
      const cols = keys.map((k) => wrapIdent(snakeCol(k))).join(', ');
      const valuesSql = rows.map((row) => {
        const ph = keys.map((k) => this._buildValue(ctx, row[k]));
        return `(${ph.join(', ')})`;
      }).join(', ');
      sql = `INSERT INTO ${wrapIdent(this._table)} (${cols}) VALUES ${valuesSql}`;
      if (this._returningPart()) sql += ` RETURNING ${this._returningPart()}`;
    } else if (this._method === 'update') {
      const keys = Object.keys(this._data || {});
      const sets = keys.map((k) => `${wrapIdent(snakeCol(k))} = ${this._buildValue(ctx, this._data[k])}`);
      sql = `UPDATE ${wrapIdent(this._table)} SET ${sets.join(', ')}`;
      const where = this._compileWhere(ctx);
      if (where) sql += ` WHERE ${where}`;
      if (this._returningPart()) sql += ` RETURNING ${this._returningPart()}`;
    } else if (this._method === 'delete') {
      sql = `DELETE FROM ${wrapIdent(this._table)}`;
      const where = this._compileWhere(ctx);
      if (where) sql += ` WHERE ${where}`;
    } else {
      let countSql = '';
      if (this._countClause) {
        countSql = `COUNT(${snakeCol(this._countClause.expr)}) AS ${wrapIdent(this._countClause.alias)}`;
      }
      let cols;
      // Count ignores plain selected columns unless grouped (matches knex semantics)
      if (countSql && !this._groupBy.length) cols = countSql;
      else if (this._cols.length && countSql) cols = `${this._cols.map(snakeCol).join(', ')}, ${countSql}`;
      else if (this._cols.length) cols = this._cols.map(snakeCol).join(', ');
      else if (countSql) cols = countSql;
      else cols = '*';
      sql = `SELECT ${cols} FROM ${wrapIdent(this._table)}`;
      const where = this._compileWhere(ctx);
      if (where) sql += ` WHERE ${where}`;
      if (this._groupBy.length) sql += ` GROUP BY ${this._groupBy.map((c) => wrapIdent(snakeCol(c))).join(', ')}`;
      if (this._orderBy.length) sql += ` ORDER BY ${this._orderBy.map((o) => `${wrapIdent(snakeCol(o.col))} ${o.dir.toUpperCase()}`).join(', ')}`;
      if (this._limit !== null) sql += ` LIMIT ${this._limit}`;
      if (this._offset !== null) sql += ` OFFSET ${this._offset}`;
    }
    return { sql, params: ctx.params };
  }

  _returningPart() {
    if (!this._returning) return null;
    if (this._returning === '*') return '*';
    return this._returning.map ? this._returning.map((c) => wrapIdent(snakeCol(c))).join(', ') : wrapIdent(snakeCol(String(this._returning)));
  }

  async _execute() {
    const { sql, params } = this._compile();
    if (this._method === 'insert') {
      const r = await pool.query(sql, params);
      return this._returning ? r.rows : [{}];
    }
    if (this._method === 'update' || this._method === 'delete') {
      const r = await pool.query(sql, params);
      return this._returning ? r.rows : r.rowCount;
    }
    const r = await pool.query(sql, params);
    return this._first ? r.rows[0] : r.rows;
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
}

function createRequestDb() {
  const db = (table) => new QueryBuilder(table);
  db.raw = (sql, params = []) => new RawValue(sql, params);
  return db;
}

export function requestDbMiddleware(req, _res, next) {
  if (!req.db) req.db = createRequestDb();
  next();
}

export { QueryBuilder, RawValue };

export default requestDbMiddleware;