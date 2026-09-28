const { BusinessSettings } = require('../db');

const DEFAULT_NAME = 'Mercadería Guajardo';

// Si por algún motivo la fila no existe, se crea con el nombre por defecto.
async function getBusiness() {
  const [settings] = await BusinessSettings.findOrCreate({ where: { id: 1 }, defaults: { id: 1, name: DEFAULT_NAME } });
  return settings;
}

async function updateBusiness(data) {
  const settings = await getBusiness();
  return settings.update(data);
}

module.exports = { getBusiness, updateBusiness };
