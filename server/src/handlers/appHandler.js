const { version: serverVersion } = require('../../package.json');

// Versión de la aplicación (se muestra en Configuración). La app de escritorio define APP_VERSION con su propia
// versión (la de los instaladores); en desarrollo se usa la del package.json del servidor.
function getVersion(req, res) {
  res.json({ version: process.env.APP_VERSION || serverVersion });
}

module.exports = { getVersion };
