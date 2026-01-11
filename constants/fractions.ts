/**
 * Fraction handling constants and utilities
 */

/**
 * Mapping from decimal values to friendly fraction display strings
 */
export const FRACTION_DISPLAY: Record<number, string> = {
  0.125: '1/8',
  0.167: '1/6',
  0.2: '1/5',
  0.25: '1/4',
  0.333: '1/3',
  0.375: '3/8',
  0.4: '2/5',
  0.5: '1/2',
  0.6: '3/5',
  0.625: '5/8',
  0.667: '2/3',
  0.75: '3/4',
  0.8: '4/5',
  0.833: '5/6',
  0.875: '7/8',
};

/**
 * Sorted fraction values for finding closest match
 */
export const FRACTION_VALUES = Object.keys(FRACTION_DISPLAY)
  .map(Number)
  .sort((a, b) => a - b);

/**
 * Unicode fraction characters mapped to decimal values
 */
export const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '⅓': 0.333,
  '⅔': 0.667,
  '¼': 0.25,
  '¾': 0.75,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 0.167,
  '⅚': 0.833,
  '⅐': 0.143,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
  '⅑': 0.111,
  '⅒': 0.1,
};

/**
 * Common fraction patterns in text (regex-friendly)
 */
export const FRACTION_PATTERNS = [
  '1/16',
  '1/8',
  '1/6',
  '1/5',
  '1/4',
  '1/3',
  '3/8',
  '2/5',
  '1/2',
  '3/5',
  '5/8',
  '2/3',
  '3/4',
  '4/5',
  '5/6',
  '7/8',
];

/**
 * Map text fractions to decimal values
 */
export const TEXT_FRACTIONS: Record<string, number> = {
  '1/16': 0.0625,
  '1/8': 0.125,
  '1/6': 0.167,
  '1/5': 0.2,
  '1/4': 0.25,
  '1/3': 0.333,
  '3/8': 0.375,
  '2/5': 0.4,
  '1/2': 0.5,
  '3/5': 0.6,
  '5/8': 0.625,
  '2/3': 0.667,
  '3/4': 0.75,
  '4/5': 0.8,
  '5/6': 0.833,
  '7/8': 0.875,
};

/**
 * Find the closest friendly fraction to a decimal value
 * @param decimal The decimal value to convert
 * @param tolerance How close the match needs to be (default 0.05)
 * @returns The fraction string or null if no close match
 */
export function findClosestFraction(decimal: number, tolerance: number = 0.05): string | null {
  // Get just the fractional part
  const fractionalPart = decimal % 1;

  if (fractionalPart < tolerance) {
    return null; // It's essentially a whole number
  }

  // Find the closest fraction
  let closestFraction: string | null = null;
  let closestDiff = Infinity;

  for (const [value, display] of Object.entries(FRACTION_DISPLAY)) {
    const diff = Math.abs(fractionalPart - Number(value));
    if (diff < closestDiff && diff <= tolerance) {
      closestDiff = diff;
      closestFraction = display;
    }
  }

  return closestFraction;
}

/**
 * Convert a decimal to a display string with whole number and fraction
 * @param value The decimal value to convert
 * @returns Display string like "2 1/2" or "1/4" or "3"
 */
export function decimalToDisplay(value: number): string {
  if (value <= 0) {
    return '0';
  }

  const wholePart = Math.floor(value);
  const fractionalPart = value - wholePart;

  // If essentially a whole number
  if (fractionalPart < 0.03) {
    return wholePart.toString();
  }

  // Find closest fraction
  const fraction = findClosestFraction(fractionalPart, 0.05);

  if (fraction) {
    if (wholePart === 0) {
      return fraction;
    }
    return `${wholePart} ${fraction}`;
  }

  // Fall back to decimal display with reasonable precision
  if (wholePart === 0) {
    return value.toFixed(2).replace(/\.?0+$/, '');
  }

  return value.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Parse a text fraction like "1/2" or "1 1/2" to decimal
 */
export function parseFraction(text: string): number | null {
  const cleaned = text.trim();

  // Check for unicode fraction
  for (const [unicode, value] of Object.entries(UNICODE_FRACTIONS)) {
    if (cleaned.includes(unicode)) {
      // Handle mixed numbers like "2½"
      const parts = cleaned.split(unicode);
      const whole = parts[0] ? parseInt(parts[0], 10) || 0 : 0;
      return whole + value;
    }
  }

  // Handle "X/Y" format
  const slashMatch = cleaned.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (slashMatch) {
    const num = parseInt(slashMatch[1], 10);
    const denom = parseInt(slashMatch[2], 10);
    if (denom !== 0) {
      return num / denom;
    }
  }

  // Handle "W X/Y" format (mixed number)
  const mixedMatch = cleaned.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const denom = parseInt(mixedMatch[3], 10);
    if (denom !== 0) {
      return whole + num / denom;
    }
  }

  // Try to parse as regular number
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
