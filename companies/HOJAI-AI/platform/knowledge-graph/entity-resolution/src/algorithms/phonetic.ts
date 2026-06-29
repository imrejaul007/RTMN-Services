/**
 * Phonetic Algorithms for Entity Resolution
 * Real implementations of Soundex and Metaphone
 */

/**
 * Soundex Algorithm
 * Creates a 4-character code representing the sound of a name
 * Good for catching spelling variations that sound similar
 */
export function soundex(str: string): string {
  if (!str || str.length === 0) return '';

  const s = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';

  // Keep first letter
  const firstLetter = s[0];

  // Soundex letter mappings
  const codes: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };

  // Apply coding rules
  let coded = firstLetter;
  let prevCode = codes[s[0]] || '';

  for (let i = 1; i < s.length; i++) {
    const letter = s[i];
    const code = codes[letter] || '';

    if (code && code !== prevCode) {
      coded += code;
    }

    // H and W are ignored but affect adjacent codes
    if (letter !== 'H' && letter !== 'W') {
      prevCode = code;
    }
  }

  // Pad or truncate to 4 characters
  return (coded + '000').slice(0, 4);
}

/**
 * Compare two strings using Soundex
 * Returns 1 if same, 0 if different
 */
export function soundexSimilarity(str1: string, str2: string): number {
  const s1 = soundex(str1);
  const s2 = soundex(str2);
  return s1 === s2 ? 1.0 : 0.0;
}

/**
 * Metaphone Algorithm (Simplified)
 * Creates a variable-length phonetic code
 * More accurate than Soundex for English words
 */
export function metaphone(str: string): string {
  if (!str || str.length === 0) return '';

  const s = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';

  let result = '';
  let i = 0;

  // Handle special starting patterns
  if (s.startsWith('KN') || s.startsWith('GN') || s.startsWith('PN') ||
      s.startsWith('AE') || s.startsWith('WR')) {
    i = 1;
  }

  // Drop first letter if starts with these patterns
  if (s.startsWith('WH')) {
    result += s[1];
    i = 2;
  } else if (s.startsWith('X')) {
    result += 'S';
    i = 1;
  }

  while (i < s.length) {
    const char = s[i];
    const next = s[i + 1] || '';
    const prev = s[i - 1] || '';

    switch (char) {
      case 'A':
      case 'E':
      case 'I':
      case 'O':
      case 'U':
        if (i === 0) result += char;
        break;

      case 'B':
        if (prev !== 'M' || next) result += 'B';
        break;

      case 'C':
        if (next === 'H') {
          result += 'X';
          i++;
        } else if ('IEY'.includes(next)) {
          result += 'S';
        } else {
          result += 'K';
        }
        break;

      case 'D':
        if (next === 'G' && 'IEY'.includes(s[i + 2] || '')) {
          result += 'J';
          i += 2;
        } else {
          result += 'T';
        }
        break;

      case 'F':
        result += 'F';
        break;

      case 'G':
        if (next === 'H') {
          if (!'AEIOU'.includes(s[i + 2] || '')) {
            i++;
          } else {
            result += 'F';
            i++;
          }
        } else if (next === 'N') {
          if (i + 2 >= s.length || s[i + 2] !== 'E') {
            result += 'K';
          }
        } else if ('IEY'.includes(next)) {
          result += 'J';
        } else {
          result += 'K';
        }
        break;

      case 'H':
        if (i === 0 || !'AEIOU'.includes(prev) || 'AEIOU'.includes(next)) {
          result += 'H';
        }
        break;

      case 'J':
        result += 'J';
        break;

      case 'K':
        if (prev !== 'C') result += 'K';
        break;

      case 'L':
        result += 'L';
        break;

      case 'M':
        result += 'M';
        break;

      case 'N':
        result += 'N';
        break;

      case 'P':
        if (next === 'H') {
          result += 'F';
          i++;
        } else {
          result += 'P';
        }
        break;

      case 'Q':
        result += 'K';
        break;

      case 'R':
        result += 'R';
        break;

      case 'S':
        if (next === 'H') {
          result += 'X';
          i++;
        } else if (s.slice(i, i + 3) === 'SIO' || s.slice(i, i + 3) === 'SIA') {
          result += 'X';
        } else {
          result += 'S';
        }
        break;

      case 'T':
        if (next === 'H') {
          result += '0'; // Theta sound
          i++;
        } else if (s.slice(i, i + 3) === 'TIA' || s.slice(i, i + 3) === 'TIO') {
          result += 'X';
        } else {
          result += 'T';
        }
        break;

      case 'V':
        result += 'F';
        break;

      case 'W':
        if ('AEIOU'.includes(next)) {
          result += 'W';
        }
        break;

      case 'X':
        result += 'KS';
        break;

      case 'Y':
        if ('AEIOU'.includes(next)) {
          result += 'Y';
        }
        break;

      case 'Z':
        result += 'S';
        break;
    }
    i++;
  }

  return result;
}

/**
 * Compare two strings using Metaphone
 * Returns similarity based on metaphone code comparison
 */
export function metaphoneSimilarity(str1: string, str2: string): number {
  const m1 = metaphone(str1);
  const m2 = metaphone(str2);

  if (m1.length === 0 && m2.length === 0) return 1.0;
  if (m1.length === 0 || m2.length === 0) return 0.0;

  // Exact match
  if (m1 === m2) return 1.0;

  // Common prefix ratio
  let commonPrefixLen = 0;
  const maxLen = Math.min(m1.length, m2.length);
  for (let i = 0; i < maxLen; i++) {
    if (m1[i] === m2[i]) {
      commonPrefixLen++;
    } else {
      break;
    }
  }

  return commonPrefixLen / Math.max(m1.length, m2.length);
}

/**
 * Double Metaphone - returns two possible codes
 * More comprehensive than standard Metaphone
 */
export function doubleMetaphone(str: string): [string, string | null] {
  if (!str || str.length === 0) return ['', null];

  const s = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return ['', null];

  let primary = '';
  let secondary: string | null = null;
  let i = 0;
  const isSlavoGermanic = / (AGNOSKY|WRIST|SCHLEZ|WEISSBLOG|KOZL) /i.test(s);

  // Helper to check if character is a vowel
  const isVowel = (pos: number): boolean => 'AEIOU'.includes(s[pos] || '');

  // Handle special cases at start
  if (/^(ARM|ERWIN|IRA)/.test(s)) {
    return [s.slice(1), ''];
  }

  if (s.startsWith('GN') || s.startsWith('KN') || s.startsWith('PN') ||
      s.startsWith('WR') || s.startsWith('PS')) {
    i = 1;
  }

  while (primary.length < 4 && i < s.length) {
    const char = s[i];
    const next = s[i + 1] || '';
    const prev = s[i - 1] || '';

    switch (char) {
      case 'A':
      case 'E':
      case 'I':
      case 'O':
      case 'U':
      case 'Y':
        if (i === 0) primary += char;
        i++;
        break;

      case 'B':
        primary += 'P';
        if (next === 'B') i++;
        break;

      case 'Ç':
        primary += 'S';
        break;

      case 'C':
        if (next === 'H') {
          primary += 'X';
          i += 2;
        } else if ('IEY'.includes(next)) {
          primary += 'S';
          i++;
        } else {
          primary += 'K';
          i++;
        }
        break;

      case 'D':
        if (next === 'G' && 'IEY'.includes(s[i + 2] || '')) {
          primary += 'J';
          i += 3;
        } else {
          primary += 'T';
          i++;
        }
        break;

      case 'F':
        primary += 'F';
        if (next === 'F') i++;
        break;

      case 'G':
        if (next === 'H') {
          if (!'AEIOU'.includes(s[i + 2] || '')) {
            primary += 'F';
            i += 2;
          } else {
            primary += 'K';
            i += 2;
          }
        } else if (next === 'N') {
          if (i + 2 < s.length && s[i + 2] === 'E' && s[i + 3] === 'D') {
            // GNED, GNES, GNET, GNEY - skip
          } else {
            primary += 'K';
          }
          i++;
        } else if (next === 'L' && i + 2 < s.length && s[i + 2] === 'E' && s[i + 3] === 'Y') {
          primary += 'K';
          i++;
        } else if (next === 'R' && i + 2 < s.length && s[i + 2] === 'E' && s[i + 3] === 'Y') {
          primary += 'K';
          i++;
        } else if ('IEY'.includes(next)) {
          primary += 'J';
          i++;
        } else {
          primary += 'K';
          i++;
        }
        break;

      case 'H':
        if (i === 0 || (!'AEIOU'.includes(prev) && 'AEIOU'.includes(next))) {
          primary += 'H';
        }
        i++;
        break;

      case 'J':
        if (s.slice(i, i + 4) === 'JOSE' || s.startsWith('SAN ')) {
          primary += 'H';
        } else {
          primary += 'J';
        }
        if (next === 'J') i++;
        i++;
        break;

      case 'K':
        if (next === 'N') {
          primary += 'N';
        } else {
          primary += 'K';
        }
        if (next === 'K') i++;
        break;

      case 'L':
        primary += 'L';
        if (next === 'L') i++;
        break;

      case 'M':
        primary += 'M';
        if ((prev === 'U' && (next === 'B' || next === 'V')) ||
            (next === 'E' && s[i + 2] === 'R') ||
            (prev === 'I' && next === 'N')) {
          // Skip silent M
        }
        break;

      case 'N':
        primary += 'N';
        if (next === 'N') i++;
        break;

      case 'Ñ':
        primary += 'N';
        break;

      case 'P':
        if (next === 'H') {
          primary += 'F';
          i += 2;
        } else {
          primary += 'P';
          i++;
        }
        break;

      case 'Q':
        primary += 'K';
        if (next === 'Q') i++;
        break;

      case 'R':
        primary += 'R';
        if (!isSlavoGermanic && next === 'R') i++;
        break;

      case 'S':
        if (next === 'H') {
          primary += 'X';
          i += 2;
        } else if (s.slice(i, i + 3) === 'SIO' || s.slice(i, i + 3) === 'SIA' ||
                   s.slice(i, i + 4) === 'SIAN') {
          primary += 'S';
          if (!isSlavoGermanic) secondary = 'X';
        } else {
          primary += 'S';
        }
        if (next === 'S') i++;
        break;

      case 'T':
        if (next === 'H') {
          primary += '0';
          i += 2;
        } else if (s.slice(i, i + 3) === 'TIA' || s.slice(i, i + 3) === 'TIO') {
          primary += 'X';
        } else if (s.slice(i, i + 4) === 'TCH') {
          primary += 'X';
        } else {
          primary += 'T';
        }
        i++;
        break;

      case 'V':
        primary += 'F';
        if (next === 'V') i++;
        break;

      case 'W':
        if (next === 'R') {
          primary += 'R';
          i += 2;
        } else if (isVowel(i + 1) || (i === 0 && s[i + 1] === 'H')) {
          primary += 'A';
          i++;
        }
        break;

      case 'X':
        primary += 'KS';
        if (s[i + 1] === 'C' && s[i + 2] === 'H') {
          primary += 'X';
        }
        i++;
        break;

      case 'Z':
        primary += 'S';
        if (next === 'Z') i++;
        if (s.slice(i, i + 3) === 'ZHO' || s.slice(i, i + 3) === 'ZAR' ||
            s[i + 1] === 'H') {
          primary = primary.slice(0, -1) + 'J';
        }
        break;

      default:
        i++;
    }
  }

  return [primary.slice(0, 4), secondary?.slice(0, 4) || null];
}

/**
 * Compare using Double Metaphone
 */
export function doubleMetaphoneSimilarity(str1: string, str2: string): number {
  const [m1, s1] = doubleMetaphone(str1);
  const [m2, s2] = doubleMetaphone(str2);

  if (m1.length === 0 && m2.length === 0) return 1.0;
  if (m1.length === 0 || m2.length === 0) return 0.0;

  // Exact match of primary codes
  if (m1 === m2) return 1.0;

  // Match with secondary codes
  if (s1 && s1.length > 0 && (m1 === s2 || s1 === m2 || s1 === s2)) {
    return 0.8;
  }

  // Common prefix ratio for partial match
  let commonPrefixLen = 0;
  const maxLen = Math.min(m1.length, m2.length);
  for (let i = 0; i < maxLen; i++) {
    if (m1[i] === m2[i]) {
      commonPrefixLen++;
    } else {
      break;
    }
  }

  return (commonPrefixLen / Math.max(m1.length, m2.length)) * 0.6;
}