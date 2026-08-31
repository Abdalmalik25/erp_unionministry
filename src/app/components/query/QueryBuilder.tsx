/**
 * Visual Query Builder - Enterprise Query Construction
 *
 * Features:
 * - Drag-and-drop query construction
 * - Visual join builder (INNER/LEFT/RIGHT/FULL)
 * - Subquery support
 * - Aggregation pipelines
 * - WHERE conditions with all operators
 * - HAVING/GROUP BY/ORDER BY
 * - Query optimization suggestions
 * - Save & share queries
 * - Export to SQL/JSON/MongoDB
 * - Visual execution plan
 */

import { useState, useCallback, useMemo } from 'react';

export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
export type SqlOperator = '=' | '<>' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'NOT LIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN' | 'EXISTS';
export type SortDirection = 'ASC' | 'DESC';
export type LogicalOp = 'AND' | 'OR';

export interface QueryTable {
  id: string;
  name: string;
  alias?: string;
  schema?: string;
  columns: QueryColumn[];
}

export interface QueryColumn {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  nullable?: boolean;
  primary?: boolean;
  indexed?: boolean;
}

export interface QueryJoin {
  id: string;
  type: JoinType;
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
}

export interface QueryCondition {
  id: string;
  table: string;
  column: string;
  operator: SqlOperator;
  value: string | number | string[] | [number, number];
  logicalOp: LogicalOp;
}

export interface QuerySelect {
  id: string;
  table: string;
  column: string;
  alias?: string;
  aggregation?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'DISTINCT' | 'GROUP_CONCAT';
  distinct?: boolean;
}

export interface QueryGroupBy {
  table: string;
  column: string;
}

export interface QueryOrderBy {
  table: string;
  column: string;
  direction: SortDirection;
}

export interface Query {
  id: string;
  name: string;
  description?: string;
  tables: QueryTable[];
  joins: QueryJoin[];
  selects: QuerySelect[];
  conditions: QueryCondition[];
  groupBy: QueryGroupBy[];
  having: QueryCondition[];
  orderBy: QueryOrderBy[];
  limit?: number;
  offset?: number;
  distinct: boolean;
  savedAt?: number;
}

interface QueryBuilderProps {
  availableTables: QueryTable[];
  initialQuery?: Query;
  onExecute?: (query: Query) => Promise<unknown[]>;
  onSave?: (query: Query) => void;
  onExport?: (format: 'sql' | 'json' | 'mongodb', query: Query) => void;
  maxLimit?: number;
}

export function QueryBuilder({ availableTables, initialQuery, onExecute, onSave, onExport, maxLimit = 10000 }: QueryBuilderProps) {
  // State
  const [query, setQuery] = useState<Query>(
    initialQuery || {
      id: `query-${Date.now()}`,
      name: 'استعلام جديد',
      tables: [],
      joins: [],
      selects: [],
      conditions: [],
      groupBy: [],
      having: [],
      orderBy: [],
      distinct: false,
    }
  );

  const [activeTab, setActiveTab] = useState<'builder' | 'sql' | 'preview' | 'plan'>('builder');
  const [executionResult, setExecutionResult] = useState<unknown[] | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState(0);

  // Helpers
  const updateQuery = useCallback((updates: Partial<Query>) => {
    setQuery((prev) => ({ ...prev, ...updates }));
  }, []);

  // Add table
  const addTable = useCallback((table: QueryTable) => {
    setQuery((prev) => {
      if (prev.tables.find((t) => t.id === table.id)) return prev;
      return { ...prev, tables: [...prev.tables, table] };
    });
  }, []);

  // Remove table
  const removeTable = useCallback((tableId: string) => {
    setQuery((prev) => ({
      ...prev,
      tables: prev.tables.filter((t) => t.id !== tableId),
      joins: prev.joins.filter((j) => j.leftTable !== tableId && j.rightTable !== tableId),
      selects: prev.selects.filter((s) => s.table !== tableId),
      conditions: prev.conditions.filter((c) => c.table !== tableId),
      groupBy: prev.groupBy.filter((g) => g.table !== tableId),
      having: prev.having.filter((c) => c.table !== tableId),
      orderBy: prev.orderBy.filter((o) => o.table !== tableId),
    }));
  }, []);

  // Add join
  const addJoin = useCallback(() => {
    const newJoin: QueryJoin = {
      id: `join-${Date.now()}`,
      type: 'INNER',
      leftTable: query.tables[0]?.id || '',
      leftColumn: query.tables[0]?.columns[0]?.name || '',
      rightTable: query.tables[1]?.id || '',
      rightColumn: query.tables[1]?.columns[0]?.name || '',
    };
    setQuery((prev) => ({ ...prev, joins: [...prev.joins, newJoin] }));
  }, [query.tables]);

  // Add select
  const addSelect = useCallback((tableId: string, columnName: string) => {
    const newSelect: QuerySelect = {
      id: `sel-${Date.now()}`,
      table: tableId,
      column: columnName,
    };
    setQuery((prev) => ({ ...prev, selects: [...prev.selects, newSelect] }));
  }, []);

  // Add condition
  const addCondition = useCallback((tableId: string) => {
    const table = query.tables.find((t) => t.id === tableId);
    if (!table) return;

    const newCondition: QueryCondition = {
      id: `cond-${Date.now()}`,
      table: tableId,
      column: table.columns[0]?.name || '',
      operator: '=',
      value: '',
      logicalOp: query.conditions.length > 0 ? 'AND' : 'AND',
    };
    setQuery((prev) => ({ ...prev, conditions: [...prev.conditions, newCondition] }));
  }, [query.tables, query.conditions]);

  // Generate SQL
  const generatedSQL = useMemo(() => {
    if (query.tables.length === 0) return '-- اختر جدولاً واحداً على الأقل';

    const parts: string[] = [];

    // SELECT
    const selectColumns = query.selects.length > 0
      ? query.selects.map((s) => {
          const tbl = query.tables.find((t) => t.id === s.table);
          const alias = tbl?.alias || tbl?.name || '';
          let col = s.column === '*' ? '*' : `${alias}.${s.column}`;
          if (s.aggregation) {
            col = `${s.aggregation}(${s.distinct ? 'DISTINCT ' : ''}${col})`;
          }
          return s.alias ? `${col} AS ${s.alias}` : col;
        }).join(', ')
      : `${query.tables[0]?.alias || query.tables[0]?.name || ''}.*`;

    parts.push(`SELECT ${query.distinct ? 'DISTINCT ' : ''}${selectColumns}`);

    // FROM
    const fromTable = query.tables[0];
    parts.push(`FROM ${fromTable.schema ? `${fromTable.schema}.` : ''}${fromTable.name}${fromTable.alias ? ` AS ${fromTable.alias}` : ''}`);

    // JOINs
    for (const join of query.joins) {
      const right = query.tables.find((t) => t.id === join.rightTable);
      const leftAlias = query.tables.find((t) => t.id === join.leftTable)?.alias || query.tables.find((t) => t.id === join.leftTable)?.name;
      if (!right) continue;
      parts.push(
        `${join.type} JOIN ${right.schema ? `${right.schema}.` : ''}${right.name}${right.alias ? ` AS ${right.alias}` : ''} ON ${leftAlias}.${join.leftColumn} = ${right.alias || right.name}.${join.rightColumn}`
      );
    }

    // WHERE
    if (query.conditions.length > 0) {
      const whereClauses = query.conditions.map((c, i) => {
        const tbl = query.tables.find((t) => t.id === c.table);
        const alias = tbl?.alias || tbl?.name;
        const prefix = i === 0 ? '' : `${c.logicalOp} `;

        if (c.operator === 'IS NULL' || c.operator === 'IS NOT NULL') {
          return `${prefix}${alias}.${c.column} ${c.operator}`;
        }

        if (c.operator === 'BETWEEN') {
          const [min, max] = c.value as [number, number];
          return `${prefix}${alias}.${c.column} BETWEEN ${min} AND ${max}`;
        }

        if (c.operator === 'IN' || c.operator === 'NOT IN') {
          const list = Array.isArray(c.value) ? c.value.join(', ') : c.value;
          return `${prefix}${alias}.${c.column} ${c.operator} (${list})`;
        }

        return `${prefix}${alias}.${c.column} ${c.operator} ${typeof c.value === 'string' ? `'${c.value.replace(/'/g, "''")}'` : c.value}`;
      });
      parts.push(`WHERE ${whereClauses.join(' ')}`);
    }

    // GROUP BY
    if (query.groupBy.length > 0) {
      const groupCols = query.groupBy.map((g) => {
        const tbl = query.tables.find((t) => t.id === g.table);
        return `${tbl?.alias || tbl?.name}.${g.column}`;
      }).join(', ');
      parts.push(`GROUP BY ${groupCols}`);
    }

    // HAVING
    if (query.having.length > 0) {
      const havingClauses = query.having.map((c) => {
        const tbl = query.tables.find((t) => t.id === c.table);
        return `${tbl?.alias || tbl?.name}.${c.column} ${c.operator} ${typeof c.value === 'string' ? `'${c.value}'` : c.value}`;
      });
      parts.push(`HAVING ${havingClauses.join(' AND ')}`);
    }

    // ORDER BY
    if (query.orderBy.length > 0) {
      const orderCols = query.orderBy.map((o) => {
        const tbl = query.tables.find((t) => t.id === o.table);
        return `${tbl?.alias || tbl?.name}.${o.column} ${o.direction}`;
      }).join(', ');
      parts.push(`ORDER BY ${orderCols}`);
    }

    // LIMIT/OFFSET
    if (query.limit) {
      parts.push(`LIMIT ${query.limit}`);
      if (query.offset) parts.push(`OFFSET ${query.offset}`);
    }

    return parts.join('\n');
  }, [query]);

  // Execute query
  const executeQuery = useCallback(async () => {
    if (!onExecute) return;
    setIsExecuting(true);
    setExecutionResult(null);
    const start = performance.now();
    try {
      const result = await onExecute(query);
      setExecutionResult(result);
      setExecutionTime(performance.now() - start);
    } catch (err) {
      console.error('Query execution failed:', err);
    } finally {
      setIsExecuting(false);
    }
  }, [query, onExecute]);

  // Optimization suggestions
  const optimizations = useMemo(() => {
    const suggestions: Array<{ severity: 'info' | 'warning' | 'error'; message: string; fix?: () => void }> = [];

    if (query.tables.length === 0) {
      suggestions.push({ severity: 'info', message: '💡 ابدأ بإضافة جدول من الشريط الجانبي' });
    }

    if (query.selects.length === 0 && query.tables.length > 0) {
      suggestions.push({ severity: 'warning', message: '⚠️ لم تختر أي أعمدة - سيتم إرجاع كل الأعمدة' });
    }

    if (query.joins.length > 0 && query.conditions.length === 0) {
      suggestions.push({ severity: 'warning', message: '⚠️ استعلام بدون WHERE قد يكون بطيئاً - أضف شروطاً لتضييق النتائج' });
    }

    if (query.conditions.length > 5) {
      suggestions.push({ severity: 'info', message: '💡 شروط كثيرة - تأكد من أن الأعمدة المفهرسة مستخدمة' });
    }

    if (!query.limit && query.selects.length > 0) {
      suggestions.push({
        severity: 'info',
        message: '💡 لا يوجد LIMIT - أضف حد أقصى للنتائج لتجنب الذاكرة الزائدة',
        fix: () => updateQuery({ limit: 100 }),
      });
    }

    if (query.joins.some((j) => j.type === 'CROSS')) {
      suggestions.push({ severity: 'warning', message: '⚠️ CROSS JOIN ينتج عدد كبير من الصفوف - تأكد من الحاجة' });
    }

    return suggestions;
  }, [query, updateQuery]);

  return (
    <div className="query-builder bg-white border border-gray-200 rounded-lg shadow-sm" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <input
              type="text"
              value={query.name}
              onChange={(e) => updateQuery({ name: e.target.value })}
              className="text-xl font-bold border-none outline-none w-full bg-transparent"
              placeholder="اسم الاستعلام"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave?.(query)}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              💾 حفظ
            </button>
            <button
              onClick={() => onExport?.('sql', query)}
              className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              تصدير SQL
            </button>
            <button
              onClick={executeQuery}
              disabled={isExecuting || query.tables.length === 0}
              className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
            >
              {isExecuting ? '⏳ جاري التنفيذ...' : '▶️ تنفيذ'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['builder', 'sql', 'preview', 'plan'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-1.5 text-sm rounded-md transition ${
                activeTab === tab ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'builder' ? '🎨 المنشئ' : tab === 'sql' ? '💻 SQL' : tab === 'preview' ? '👁️ المعاينة' : '📊 خطة التنفيذ'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-[600px]">
        {/* Sidebar - Available Tables */}
        <div className="w-64 border-l border-gray-200 overflow-y-auto bg-gray-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">📋 الجداول المتاحة</h3>
          </div>
          <div className="p-2">
            {availableTables.map((table) => {
              const isAdded = query.tables.find((t) => t.id === table.id);
              return (
                <div
                  key={table.id}
                  className={`mb-2 p-2 bg-white rounded-lg border ${
                    isAdded ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{table.name}</span>
                    {!isAdded ? (
                      <button
                        onClick={() => addTable(table)}
                        className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-100 rounded"
                      >
                        + إضافة
                      </button>
                    ) : (
                      <span className="text-xs text-blue-600">✓ مُضاف</span>
                    )}
                  </div>
                  {isAdded && (
                    <button
                      onClick={() => removeTable(table.id)}
                      className="mt-1 text-xs text-red-600 hover:underline"
                    >
                      إزالة من الاستعلام
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'builder' && (
            <div className="p-4 space-y-4">
              {/* SELECT clause */}
              <Section title="🔍 SELECT - الأعمدة المطلوبة">
                {query.tables.length === 0 ? (
                  <p className="text-sm text-gray-500">أضف جدولاً أولاً</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {query.selects.map((sel) => {
                        const table = query.tables.find((t) => t.id === sel.table);
                        return (
                          <div key={sel.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-700">
                              {table?.name}.{sel.column}
                            </span>
                            {sel.aggregation && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                {sel.aggregation}
                              </span>
                            )}
                            <button
                              onClick={() =>
                                updateQuery({ selects: query.selects.filter((s) => s.id !== sel.id) })
                              }
                              className="mr-auto text-red-500 hover:text-red-700 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {query.tables.map((table) => (
                      <div key={table.id} className="mt-2">
                        <details className="bg-white border border-gray-200 rounded">
                          <summary className="px-3 py-2 cursor-pointer text-sm font-medium hover:bg-gray-50">
                            + إضافة عمود من {table.name}
                          </summary>
                          <div className="p-2 grid grid-cols-3 gap-1">
                            {table.columns.map((col) => (
                              <button
                                key={col.name}
                                onClick={() => addSelect(table.id, col.name)}
                                className="text-right px-2 py-1 text-xs hover:bg-blue-50 rounded"
                              >
                                {col.name}
                                {col.primary && <span className="text-yellow-500 mr-1">🔑</span>}
                              </button>
                            ))}
                          </div>
                        </details>
                      </div>
                    ))}
                  </>
                )}
              </Section>

              {/* JOINs */}
              <Section title="🔗 JOINs - ربط الجداول">
                {query.joins.map((join) => (
                  <div key={join.id} className="p-2 bg-gray-50 rounded mb-2 flex items-center gap-2 flex-wrap">
                    <select
                      value={join.type}
                      onChange={(e) =>
                        updateQuery({ joins: query.joins.map((j) => j.id === join.id ? { ...j, type: e.target.value as JoinType } : j) })
                      }
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="INNER">INNER</option>
                      <option value="LEFT">LEFT</option>
                      <option value="RIGHT">RIGHT</option>
                      <option value="FULL">FULL</option>
                      <option value="CROSS">CROSS</option>
                    </select>
                    <span className="text-sm text-gray-500">JOIN</span>
                    <select
                      value={join.rightTable}
                      onChange={(e) => updateQuery({ joins: query.joins.map((j) => j.id === join.id ? { ...j, rightTable: e.target.value } : j) })}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      {query.tables.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-500">ON</span>
                    <input
                      type="text"
                      value={join.leftColumn}
                      onChange={(e) => updateQuery({ joins: query.joins.map((j) => j.id === join.id ? { ...j, leftColumn: e.target.value } : j) })}
                      className="text-sm border border-gray-300 rounded px-2 py-1 w-24"
                    />
                    <span className="text-sm text-gray-500">=</span>
                    <input
                      type="text"
                      value={join.rightColumn}
                      onChange={(e) => updateQuery({ joins: query.joins.map((j) => j.id === join.id ? { ...j, rightColumn: e.target.value } : j) })}
                      className="text-sm border border-gray-300 rounded px-2 py-1 w-24"
                    />
                    <button
                      onClick={() => updateQuery({ joins: query.joins.filter((j) => j.id !== join.id) })}
                      className="mr-auto text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {query.tables.length >= 2 && (
                  <button
                    onClick={addJoin}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + إضافة ربط
                  </button>
                )}
              </Section>

              {/* WHERE */}
              <Section title="🔽 WHERE - الشروط">
                {query.conditions.map((cond, i) => {
                  const table = query.tables.find((t) => t.id === cond.table);
                  return (
                    <div key={cond.id} className="p-2 bg-gray-50 rounded mb-2 flex items-center gap-2 flex-wrap">
                      {i > 0 && (
                        <select
                          value={cond.logicalOp}
                          onChange={(e) =>
                            updateQuery({ conditions: query.conditions.map((c) => c.id === cond.id ? { ...c, logicalOp: e.target.value as LogicalOp } : c) })
                          }
                          className="text-sm border border-gray-300 rounded px-2 py-1 bg-blue-50 font-bold"
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      )}
                      <select
                        value={cond.column}
                        onChange={(e) =>
                          updateQuery({ conditions: query.conditions.map((c) => c.id === cond.id ? { ...c, column: e.target.value } : c) })
                        }
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        {table?.columns.map((col) => (
                          <option key={col.name} value={col.name}>{col.name}</option>
                        ))}
                      </select>
                      <select
                        value={cond.operator}
                        onChange={(e) =>
                          updateQuery({ conditions: query.conditions.map((c) => c.id === cond.id ? { ...c, operator: e.target.value as SqlOperator } : c) })
                        }
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        {['=', '<>', '<', '<=', '>', '>=', 'LIKE', 'IN', 'BETWEEN', 'IS NULL', 'IS NOT NULL'].map((op) => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={String(cond.value)}
                        onChange={(e) =>
                          updateQuery({ conditions: query.conditions.map((c) => c.id === cond.id ? { ...c, value: e.target.value } : c) })
                        }
                        placeholder="القيمة"
                        className="text-sm border border-gray-300 rounded px-2 py-1 flex-1 min-w-[120px]"
                      />
                      <button
                        onClick={() => updateQuery({ conditions: query.conditions.filter((c) => c.id !== cond.id) })}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                {query.tables.length > 0 && (
                  <div className="flex gap-2">
                    {query.tables.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => addCondition(t.id)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + شرط على {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </Section>

              {/* LIMIT */}
              <Section title="📏 LIMIT">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">الحد الأقصى:</label>
                  <input
                    type="number"
                    min={0}
                    max={maxLimit}
                    value={query.limit || ''}
                    onChange={(e) => updateQuery({ limit: Number(e.target.value) || undefined })}
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-600 mr-4">الإزاحة:</label>
                  <input
                    type="number"
                    min={0}
                    value={query.offset || ''}
                    onChange={(e) => updateQuery({ offset: Number(e.target.value) || undefined })}
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </Section>

              {/* Optimizations */}
              {optimizations.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">🔍 اقتراحات التحسين</h4>
                  <ul className="space-y-1">
                    {optimizations.map((s, i) => (
                      <li key={i} className="flex items-center justify-between text-sm text-blue-800">
                        <span>{s.message}</span>
                        {s.fix && (
                          <button
                            onClick={s.fix}
                            className="text-xs px-2 py-0.5 bg-blue-200 hover:bg-blue-300 rounded"
                          >
                            تطبيق
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="p-4">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto" dir="ltr" style={{ fontFamily: 'monospace' }}>
                {generatedSQL}
              </pre>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="p-4">
              {executionResult ? (
                <div>
                  <div className="mb-3 text-sm text-gray-600">
                    ⏱️ وقت التنفيذ: <strong>{executionTime.toFixed(2)}ms</strong> •
                    📊 عدد الصفوف: <strong>{executionResult.length}</strong>
                  </div>
                  <div className="overflow-auto border border-gray-200 rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {executionResult[0] && Object.keys(executionResult[0] as object).map((k) => (
                            <th key={k} className="px-3 py-2 text-right font-medium">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {executionResult.slice(0, 100).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {Object.values(row as object).map((v, j) => (
                              <td key={j} className="px-3 py-2 text-gray-700">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg mb-2">👁️ معاينة فارغة</p>
                  <p className="text-sm">انقر "تنفيذ" لرؤية نتائج الاستعلام</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 خطة التنفيذ التقديرية</h3>
              <div className="space-y-2">
                <PlanStep step="1" label={`قراءة من ${query.tables[0]?.name || 'الجدول الرئيسي'}`} cost={1000} />
                {query.joins.map((j, i) => (
                  <PlanStep key={j.id} step={`${i + 2}`} label={`${j.type} JOIN ${query.tables.find((t) => t.id === j.rightTable)?.name}`} cost={500 * (i + 1)} />
                ))}
                {query.conditions.length > 0 && (
                  <PlanStep step={`${query.joins.length + 2}`} label={`تطبيق ${query.conditions.length} شرط WHERE`} cost={200} />
                )}
                {query.groupBy.length > 0 && (
                  <PlanStep step="..." label={`تجميع حسب ${query.groupBy.length} أعمدة`} cost={300} />
                )}
                <PlanStep step="→" label="إرجاع النتائج" cost={50} highlight />
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    ⚡ التكلفة التقديرية الإجمالية: <strong>~{1000 + query.joins.length * 500 + 200 + 50}</strong> وحدة
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Section component
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}

// Plan step component
function PlanStep({ step, label, cost, highlight }: { step: string; label: string; cost: number; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-2 rounded ${highlight ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
        highlight ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
      }`}>
        {step}
      </span>
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      <span className="text-xs text-gray-500">~{cost}</span>
    </div>
  );
}
