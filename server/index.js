require('dotenv').config();
const { DB_FILE } = require('./src/db');
const { startServer } = require('./src/server');

const PORT = process.env.PORT || 3001;

startServer({ port: PORT })
  .then(() => {
    console.log(`Base de datos: ${DB_FILE}`);
    console.log(`Server escuchando en http://localhost:${PORT}`);
  })
  .catch((error) => {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  });
