// Búsqueda que ignora mayúsculas Y tildes ("gomez" encuentra "Gómez", "ÁRBOL" encuentra "árbol", "nandu" encuentra "Ñandú").
// SQLite no lo trae: su LIKE solo ignora mayúsculas de letras sin tilde. Se resuelve comparando texto "normalizado"
// de los dos lados: el de la búsqueda en JavaScript, y el de las columnas dentro de la propia consulta.
const { Op, literal, where } = require('sequelize');

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

// Texto sin tildes y en minúsculas (para lo que escribe el usuario).
const normalizeText = (text) => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lo mismo, pero como expresión SQL sobre una columna. `column` es un fragmento de SQL de confianza
// (nunca texto del usuario), por ejemplo '"Product"."name"'.
const normalizedColumn = (column) =>
  `LOWER(${REPLACEMENTS.reduce((expression, [from, to]) => `REPLACE(${expression}, '${from}', '${to}')`, column)})`;

// Condición "alguna de estas columnas contiene el texto", sin distinguir mayúsculas ni tildes.
function searchCondition(columns, term) {
  const pattern = `%${normalizeText(term)}%`;
  return { [Op.or]: columns.map((column) => where(literal(normalizedColumn(column)), { [Op.like]: pattern })) };
}

module.exports = { normalizeText, normalizedColumn, searchCondition };
