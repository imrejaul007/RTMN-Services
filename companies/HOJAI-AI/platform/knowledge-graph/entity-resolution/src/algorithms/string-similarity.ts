/**
 * String Similarity Algorithms for Entity Resolution
 * Real implementations of Jaro-Winkler, Levenshtein, and Jaccard
 */

/**
 * Jaro-Winkler Similarity Algorithm
 * Best for short strings like names, more weight on prefix matching
 * Returns score between 0 (no match) and 1 (exact match)
 */
export function jaroWinklerSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  // Jaro similarity
  const jaro =
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3;

  // Winkler modification: boost for common prefix
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Levenshtein Distance (Edit Distance)
 * Counts minimum edits (insertions, deletions, substitutions)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const m = s1.length;
  const n = s2.length;

  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Levenshtein Similarity Score (normalized 0-1)
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  if (str1.length === 0 && str2.length === 0) return 1.0;
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * Jaccard Similarity for token sets
 * Best for multi-word strings like company names
 */
export function jaccardSimilarity(str1: string, str2: string): number {
  // Tokenize and normalize
  const tokens1 = normalizeAndTokenize(str1);
  const tokens2 = normalizeAndTokenize(str2);

  if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

  // Intersection
  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));

  // Union
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Tokenized Jaccard with bigrams for better matching
 */
export function jaccardBigramSimilarity(str1: string, str2: string): number {
  const tokens1 = normalizeAndTokenize(str1);
  const tokens2 = normalizeAndTokenize(str2);

  // Generate bigrams
  const bigrams1 = generateBigrams(tokens1);
  const bigrams2 = generateBigrams(tokens2);

  if (bigrams1.size === 0 && bigrams2.size === 0) return 1.0;
  if (bigrams1.size === 0 || bigrams2.size === 0) return 0.0;

  const intersection = new Set([...bigrams1].filter((x) => bigrams2.has(x)));
  const union = new Set([...bigrams1, ...bigrams2]);

  return intersection.size / union.size;
}

/**
 * Normalize string and tokenize into word set
 */
function normalizeAndTokenize(str: string): Set<string> {
  return new Set(
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}

/**
 * Generate character bigrams from tokens
 */
function generateBigrams(tokens: Set<string>): Set<string> {
  const bigrams = new Set<string>();
  for (const token of tokens) {
    for (let i = 0; i < token.length - 1; i++) {
      bigrams.add(token.substring(i, i + 2));
    }
  }
  return bigrams;
}

/**
 * Dice Coefficient (bigram-based)
 */
export function diceCoefficient(str1: string, str2: string): number {
  const tokens1 = normalizeAndTokenize(str1);
  const tokens2 = normalizeAndTokenize(str2);

  const bigrams1 = generateBigrams(tokens1);
  const bigrams2 = generateBigrams(tokens2);

  if (bigrams1.size === 0 && bigrams2.size === 0) return 1.0;
  if (bigrams1.size === 0 || bigrams2.size === 0) return 0.0;

  let intersection = 0;
  for (const bg of bigrams1) {
    if (bigrams2.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

/**
 * Overlap Coefficient (Szymkiewicz–Simpson)
 */
export function overlapCoefficient(str1: string, str2: string): number {
  const tokens1 = normalizeAndTokenize(str1);
  const tokens2 = normalizeAndTokenize(str2);

  if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  return intersection.size / Math.min(tokens1.size, tokens2.size);
}

/**
 * Compute weighted similarity score combining multiple algorithms
 */
export function combinedSimilarity(
  str1: string,
  str2: string,
  weights: { jaroWinkler: number; levenshtein: number; jaccard: number }
): number {
  const jw = jaroWinklerSimilarity(str1, str2);
  const lev = levenshteinSimilarity(str1, str2);
  const jac = jaccardSimilarity(str1, str2);

  const totalWeight = weights.jaroWinkler + weights.levenshtein + weights.jaccard;

  return (
    (weights.jaroWinkler * jw +
      weights.levenshtein * lev +
      weights.jaccard * jac) /
    totalWeight
  );
}