// Búsqueda que ignora mayúsculas Y tildes ("gomez" encuentra "Gómez", "ÁRBOL" encuentra "árbol", "nandu" encuentra "Ñandú").
// SQLite no lo trae: su LIKE solo ignora mayúsculas de letras sin tilde. Se resuelve comparando texto "normalizado"
// de los dos lados: el de la búsqueda en JavaScript, y el de las columnas dentro de la propia consulta.
const { Op, literal } = require('sequelize');

// Letra con tilde → letra base. Se cubren el español (á é í ó ú ü ñ) y el italiano (à è ì ò ù), en mayúscula y minúscula.
// OJO con la cantidad: cada letra es un REPLACE anidado en la consulta y el analizador de SQLite se desborda alrededor
// de los 30 niveles ("parser stack overflow"). Son 24 (12 letras × 2), con margen. No agregar más sin probar.
const ACCENT_GROUPS = {
  a: 'áà',
  e: 'éè',
  i: 'íì',
  o: 'óò',
  u: 'úùü',
  n: 'ñ',
};

const REPLACEMENTS = Object.entries(ACCENT_GROUPS).flatMap(([base, accented]) =>
  [...accented].flatMap((letter) => [[letter, base], [letter.toUpperCase(), base]])
);

// Sin tildes ni mayúsculas, y sin caracteres de control (un carácter nulo en la búsqueda rompía la consulta).
// eslint-disable-next-line no-control-regex
const normalizeText = (text) => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\u0000-\u001f\u007f]/g, '').toLowerCase();

// Lo mismo, pero como expresión SQL sobre una columna. `column` es un fragmento de SQL de confianza
// (nunca texto del usuario), por ejemplo '"Product"."name"'.
const normalizedColumn = (column) =>
  `LOWER(${REPLACEMENTS.reduce((expression, [from, to]) => `REPLACE(${expression}, '${from}', '${to}')`, column)})`;

// Texto de SQLite entre comillas (las comillas simples se duplican; el carácter nulo ya se sacó al normalizar).
const sqlString = (text) => `'${text.replace(/'/g, "''")}'`;

// Una columna de teléfono sin espacios, guiones, puntos, paréntesis ni "+" (SQLite no tiene expresiones regulares).
const digitsColumn = (column) =>
  ["' '", "'-'", "'.'", "'('", "')'", "'+'"].reduce((expression, character) => `REPLACE(${expression}, ${character}, '')`, column);

// Variantes de un teléfono escrito en la búsqueda, solo con dígitos: tal cual, y sin el país (54 / 549) o el 0 de larga
// distancia, porque en la base suele estar como "264 458-1305". Vacío si lo escrito no parece un teléfono.
function phoneNeedles(term) {
  if (!/^[\d\s().+-]+$/.test(term)) return [];
  const digits = term.replace(/\D/g, '');
  if (digits.length < 3) return [];
  const withoutCountry = digits.replace(/^549?/, '').replace(/^0+/, '');
  return [...new Set([digits, withoutCountry])].filter((needle) => needle.length >= 3);
}

// Los comodines de LIKE (% _) y la barra se escriben con "\" delante para que cuenten como texto común.
const escapeLike = (text) => text.replace(/[\\%_]/g, (character) => `\\${character}`);

/**
 * Condición "alguna de estas columnas contiene el texto", sin distinguir mayúsculas ni tildes.
 * Los comodines de LIKE que escribe el usuario (% y _) se toman como texto común: buscar "%" no devuelve todo.
 * Con `phoneColumns`, si lo escrito parece un teléfono también se compara solo por dígitos
 * ("4581305" encuentra "264 458-1305").
 */
function searchCondition(columns, term, { phoneColumns = [] } = {}) {
  const like = (expression, needle) => literal(`${expression} LIKE ${sqlString(`%${escapeLike(needle)}%`)} ESCAPE '\\'`);
  const conditions = columns.map((column) => like(normalizedColumn(column), normalizeText(term)));
  for (const column of phoneColumns) {
    for (const needle of phoneNeedles(term)) conditions.push(like(digitsColumn(column), needle));
  }
  return { [Op.or]: conditions };
}

module.exports = { normalizeText, normalizedColumn, searchCondition, digitsColumn };
