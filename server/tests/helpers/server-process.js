// Proceso hijo de las pruebas: levanta el servidor real (con migraciones) en un puerto libre y avisa cuál.
// Se ejecuta con el Node de las pruebas, o con el de Electron 22 (Node 16) si se define TEST_NODE_BIN.
const { startServer } = require('../../src/server');

startServer({ port: 0, host: '127.0.0.1' })
  .then((server) => console.log(`READY ${server.address().port}`))
  .catch((error) => {
    console.error(`FALLO ${error.stack || error}`);
    process.exit(1);
  });
