/**
 * src/inputMapping.js
 * Central mapping module for SNES controller inputs.
 * Maps logical button names to Nostalgist core identifiers.
 */

// Logical button names used throughout the app
export const BUTTONS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  A: 'a',
  B: 'b',
  X: 'x',
  Y: 'y',
  L: 'l',
  R: 'r',
  START: 'start',
  SELECT: 'select',
};

/**
 * Convert a logical button name to Nostalgist core identifier
 * @param {string} buttonName - Logical button name (e.g., 'a', 'up', 'start')
 * @param {number} player - Player number (1 or 2)
 * @returns {string} Core identifier (e.g., 'a', 'P2_a')
 */
export function toCoreId(buttonName, player = 1) {
  return player === 2 ? `P2_${buttonName}` : buttonName;
}

/**
 * Get all SNES button names as an array
 * @returns {string[]}
 */
export function getAllButtons() {
  return Object.values(BUTTONS);
}

/**
 * Check if a button name is valid
 * @param {string} buttonName
 * @returns {boolean}
 */
export function isValidButton(buttonName) {
  return Object.values(BUTTONS).includes(buttonName);
}
