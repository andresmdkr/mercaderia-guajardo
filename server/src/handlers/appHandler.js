const { version } = require('../../package.json');

// Versión de la aplicación (se muestra en Configuración; después la usará el actualizador).
function getVersion(req, res) {
  res.json({ version });
}

module.exports = { getVersion };
