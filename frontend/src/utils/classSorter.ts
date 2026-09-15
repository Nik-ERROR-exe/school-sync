/**
 * Natural ascending class sorter helper.
 * Correctly orders classes numerically by class number (1..12) and division (A..Z).
 * Example order:
 * Standard 1 - A, Standard 1 - B, Standard 2 - A ... Standard 9 - C, Standard 10 - A, Standard 10 - B
 */

export interface ClassSortKey {
  num: number;
  div: string;
  original: string;
}

export function extractClassSortKey(item: any): ClassSortKey {
  let nameStr = '';
  if (typeof item === 'string' || typeof item === 'number') {
    nameStr = String(item);
  } else if (item && typeof item === 'object') {
    if (item.class_name && item.division) {
      nameStr = `${item.class_name} ${item.division}`;
    } else if (item.class_name) {
      nameStr = item.class_name;
    } else if (item.name) {
      nameStr = item.name;
    } else if (item.label) {
      nameStr = item.label;
    } else {
      nameStr = String(item);
    }
  } else {
    nameStr = String(item || '');
  }

  // Extract numeric class number (e.g. 1, 2, 7, 8, 9, 10, 11, 12)
  const matchNum = nameStr.match(/\d+/);
  const num = matchNum ? parseInt(matchNum[0], 10) : 0;

  // Extract trailing division letter (e.g. A, B, C, D)
  const matchDiv = nameStr.match(/(?:-|\b(?:Division|Div|Sec|Section)\b)?\s*([A-Za-z])(?:\b|$)/i);
  const div = matchDiv ? matchDiv[1].toUpperCase() : '';

  return { num, div, original: nameStr };
}

export function sortClasses<T>(classesList: T[], keySelector?: (item: T) => any): T[] {
  if (!Array.isArray(classesList) || classesList.length === 0) return [];

  return [...classesList].sort((a, b) => {
    const itemA = keySelector ? keySelector(a) : a;
    const itemB = keySelector ? keySelector(b) : b;

    const keyA = extractClassSortKey(itemA);
    const keyB = extractClassSortKey(itemB);

    // 1. Primary sort: Class number (1, 2, 3 ... 9, 10, 11, 12)
    if (keyA.num !== keyB.num) {
      return keyA.num - keyB.num;
    }

    // 2. Secondary sort: Division (A, B, C...)
    if (keyA.div !== keyB.div) {
      return keyA.div.localeCompare(keyB.div);
    }

    // 3. Fallback: Full string comparison with numeric localeCompare
    return keyA.original.localeCompare(keyB.original, undefined, { numeric: true, sensitivity: 'base' });
  });
}
