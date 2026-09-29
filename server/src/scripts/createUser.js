// Uso: npm run create-user
// Pide usuario, nombre y contraseña por la terminal y crea el usuario.
const readline = require('readline');
const { sequelize } = require('../db');
const authController = require('../controllers/authController');
const { migrateUp } = require('../utils/migrator');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let muted = false;

// Mientras `muted` es true no se muestra lo que se escribe (para la contraseña).
const originalWrite = rl._writeToOutput.bind(rl);
rl._writeToOutput = (text) => {
  if (!muted) originalWrite(text);
};

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      muted = false;
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
    muted = hidden;
  });
}

async function main() {
  await migrateUp(sequelize); // con una base nueva, primero se crea el esquema
  const username = await ask('Usuario: ');
  const name = await ask('Nombre: ');
  const password = await ask('Contraseña (mín. 8 caracteres): ', { hidden: true });
  rl.close();

  if (!username || !name) throw new Error('Usuario y nombre son obligatorios');
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');

  const user = await authController.createUser({ username, name, password });
  console.log(`Usuario "${user.username}" creado (id ${user.id})`);
}

main()
  .catch((error) => {
    console.error('No se pudo crear el usuario:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
