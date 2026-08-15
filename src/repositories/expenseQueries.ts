export const HISTORY_SUMMARY_SQL = `
  SELECT nature, category, SUM(amount) AS total, COUNT(*) AS count
  FROM expenses
  WHERE deletedAt IS NULL AND date >= ? AND date <= ?
  GROUP BY nature, category
  ORDER BY total DESC
`;

type CategoryPageQuery = {
  sql: string;
  params: (string | number)[];
};

export function categoryPageQuery(
  start: string,
  end: string,
  nature: string,
  category: string,
  limit: number,
  cursor?: { date: string; id: string }
): CategoryPageQuery {
  const filters = [start, end, nature, category];

  if (!cursor) {
    return {
      sql: `
        SELECT e.*, (
          SELECT COALESCE(SUM(amount), 0)
          FROM expenses
          WHERE deletedAt IS NULL
            AND date >= ? AND date <= ?
            AND nature = ? AND category = ?
        ) AS categoryTotal
        FROM expenses e
        WHERE e.deletedAt IS NULL
          AND e.date >= ? AND e.date <= ?
          AND e.nature = ? AND e.category = ?
        ORDER BY e.date DESC, e.id DESC
        LIMIT ?
      `,
      params: [...filters, ...filters, limit],
    };
  }

  return {
    sql: `
      SELECT * FROM expenses
      WHERE deletedAt IS NULL
        AND date >= ? AND date <= ?
        AND nature = ? AND category = ?
        AND (date < ? OR (date = ? AND id < ?))
      ORDER BY date DESC, id DESC
      LIMIT ?
    `,
    params: [...filters, cursor.date, cursor.date, cursor.id, limit],
  };
}
