const STOPWORDS = new Set(['a', 'the', 'an', 'feat', 'ft', 'with', 'by', 'and', 'or', 'of']);

function tokenize(str: string): Set<string> {
  return new Set(
    str
      .toLowerCase()
      .split(/[\W_]+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}

export function jaccardSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  const intersection = new Set([...ta].filter((t) => tb.has(t)));
  const union = new Set([...ta, ...tb]);
  return intersection.size / union.size;
}
