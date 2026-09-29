'use strict';
// Arma desktop/app con lo que va dentro del instalador: el servidor, sus migraciones y la interfaz compilada.
// Uso: node scripts/prepare-app.js   (antes hay que compilar la interfaz: cd client && npm run build)
// La estructura copia la del repositorio (app/server, app/client/dist) para que el servidor encuentre todo
// con sus rutas de siempre. Sus dependencias las instala desktop/package.json (se comprueba que coincidan).

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const target = path.resolve(__dirname, '..', 'app');

function fail(message) {
  console.error(`prepare-app: ${message}`);
  process.exit(1);
}

const clientDist = path.join(root, 'client', 'dist');
if (!fs.existsSync(path.join(clientDist, 'index.html'))) fail('falta client/dist. Compilá la interfaz: cd client && npm run build');

// El servidor y la app de escritorio tienen que usar exactamente las mismas versiones de las librerías.
const serverPackage = JSON.parse(fs.readFileSync(path.join(root, 'server', 'package.json'), 'utf8'));
const desktopPackage = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
for (const [name, range] of Object.entries(serverPackage.dependencies)) {
  const installed = desktopPackage.dependencies[name];
  if (!installed) fail(`desktop/package.json no tiene la dependencia "${name}" del servidor`);
  if (installed !== range.replace(/^[\^~]/, '')) fail(`"${name}": el servidor pide ${range} y desktop tiene ${installed}. Igualalas.`);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.join(target, 'server'), { recursive: true });

// Los scripts (seed, create-user, backup...) son de desarrollo: no van dentro de la app.
fs.cpSync(path.join(root, 'server', 'src'), path.join(target, 'server', 'src'), {
  recursive: true,
  filter: (source) => path.relative(path.join(root, 'server', 'src'), source) !== 'scripts',
});
fs.cpSync(path.join(root, 'server', 'migrations'), path.join(target, 'server', 'migrations'), { recursive: true });
fs.copyFileSync(path.join(root, 'server', 'package.json'), path.join(target, 'server', 'package.json'));
fs.cpSync(clientDist, path.join(target, 'client', 'dist'), { recursive: true });

console.log(`prepare-app: listo en ${target}`);
