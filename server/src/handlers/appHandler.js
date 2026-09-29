const { version: serverVersion } = require('../../package.json');

// Versión de la aplicación (se muestra en Configuración). La app de escritorio define APP_VERSION con su propia
// versión (la de los instaladores); en desarrollo se usa la del package.json del servidor.
// `demo` avisa si la app está en modo de prueba (APP_MODE=demo, lo define la app de escritorio): es público porque
// la pantalla de ingreso también lo necesita (para mostrar el usuario de la demo).
function getVersion(req, res) {
  res.json({ version: process.env.APP_VERSION || serverVersion, demo: process.env.APP_MODE === 'demo' });
}

module.exports = { getVersion };
