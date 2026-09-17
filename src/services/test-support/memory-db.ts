// Small stateful database double for service regression tests. Filters apply to
// reads and writes so tests can detect accidental cross-cycle mutations.
export type Row = Record<string, unknown>;
export function memoryDb(tables: Record<string, Row[]>) {
  let sequence = 0;
  return {
    from(table: string) {
      const predicates: Array<(row: Row) => boolean> = [];
      let mutation: "insert" | "update" | "delete" | undefined;
      let payload: Row[] = [];
      let single = false;
      let maximum = Infinity;
      let ordering: { key: string; ascending: boolean } | undefined;
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { predicates.push(row => row[key] === value); return query; },
        neq: (key: string, value: unknown) => { predicates.push(row => row[key] !== value); return query; },
        in: (key: string, values: unknown[]) => { predicates.push(row => values.includes(row[key])); return query; },
        gt: (key: string, value: number) => { predicates.push(row => Number(row[key]) > value); return query; },
        order: (key: string, options = { ascending: true }) => { ordering = { key, ascending: options.ascending }; return query; },
        limit: (value: number) => { maximum = value; return query; },
        insert: (rows: Row | Row[]) => { mutation = "insert"; payload = Array.isArray(rows) ? rows : [rows]; return query; },
        update: (row: Row) => { mutation = "update"; payload = [row]; return query; },
        delete: () => { mutation = "delete"; return query; },
        single: () => { single = true; return query; },
        maybeSingle: () => { single = true; return query; },
        then<T>(resolve: (result: { data: Row | Row[] | null; error: null }) => T) {
          const records = tables[table] ?? (tables[table] = []);
          let rows = records.filter(row => predicates.every(predicate => predicate(row)));
          if (ordering) {
            const { key, ascending } = ordering;
            rows.sort((a, b) => (a[key]! < b[key]! ? -1 : 1) * (ascending ? 1 : -1));
          }
          rows = rows.slice(0, maximum);
          if (mutation === "insert") {
            rows = payload.map(row => ({ id: `row-${++sequence}`, created_at: new Date().toISOString(), ...row }));
            records.push(...rows);
          } else if (mutation === "update") {
            rows.forEach(row => Object.assign(row, payload[0]));
          } else if (mutation === "delete") {
            tables[table] = records.filter(row => !rows.includes(row));
          }
          return Promise.resolve(resolve({ data: single ? rows[0] ?? null : structuredClone(rows), error: null }));
        },
      };
      return query;
    },
  };
}
