export type FuzzyMatch = {
  score: number;
  indices: number[];
};

export function fuzzySearch(query: string, target: string): FuzzyMatch | null {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();

  if (!q) {
    return { score: 0, indices: [] };
  }

  let score = 0;
  let queryIndex = 0;
  let streak = 0;
  const indices: number[] = [];

  for (let index = 0; index < t.length && queryIndex < q.length; index += 1) {
    if (t[index] !== q[queryIndex]) {
      streak = 0;
      continue;
    }

    indices.push(index);
    streak += 1;
    score += 1 + streak * 2 + Math.max(0, 6 - index * 0.04);
    queryIndex += 1;
  }

  if (queryIndex !== q.length) {
    return null;
  }

  return { score, indices };
}
