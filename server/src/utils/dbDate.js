// SQLite guarda las fechas como texto en UTC ("2026-09-29 03:00:00.000 +00:00") y las compara como texto.
// En las consultas SQL a mano hay que pasar las fechas en ese mismo formato (Sequelize las mandaría en hora local).
const dbDate = (date = new Date()) => date.toISOString().replace('T', ' ').replace('Z', ' +00:00');

module.exports = { dbDate };
