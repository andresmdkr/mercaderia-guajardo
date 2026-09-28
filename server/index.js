require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/db');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a PostgreSQL');
    app.listen(PORT, () => console.log(`Server escuchando en http://localhost:${PORT}`));
  } catch (error) {
    console.error('No se pudo conectar a la base:', error.message);
    process.exit(1);
  }
}

start();
