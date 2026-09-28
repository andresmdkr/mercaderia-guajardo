require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ ok: true, db: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, db: 'error', message: error.message });
  }
});

app.use('/api', routes);
// Una ruta /api que no existe responde JSON (y no la página de la app).
app.use('/api', (req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

// Si existe la interfaz compilada (client/dist), el mismo servidor la sirve. Así la app corre en un
// solo puerto, sin CORS ni proxy (versión de escritorio o hosting). En desarrollo no existe y no se usa.
const clientDist = path.resolve(process.env.CLIENT_DIST ?? path.join(__dirname, '..', '..', 'client', 'dist'));
const indexHtml = path.join(clientDist, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(
    express.static(clientDist, {
      index: false,
      // Los archivos de /assets llevan un hash en el nombre: se pueden guardar "para siempre".
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    })
  );
  // Cualquier otra pantalla (ej. /products, /sales/new) devuelve la app y React Router se encarga.
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}

app.use(errorHandler);

module.exports = app;
