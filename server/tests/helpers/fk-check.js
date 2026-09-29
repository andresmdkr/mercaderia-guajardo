// Comprueba, con las conexiones de la propia aplicación (src/db.js), que las claves foráneas están activas:
// intenta borrar un producto que tiene historial de stock. Imprime el resultado como JSON.
const { Product, StockMovement, sequelize, User } = require('../../src/db');
const { migrateUp } = require('../../src/utils/migrator');

(async () => {
  await migrateUp(sequelize);
  const [{ foreign_keys: pragma }] = await sequelize.query('PRAGMA foreign_keys', { type: 'SELECT' });

  const user = await User.create({ username: 'fk', name: 'FK', passwordHash: 'x' });
  const item = await Product.create({ code: 'FK1', name: 'FK', costPrice: 1, salePrice: 2, stock: 1 });
  await StockMovement.create({ productId: item.id, userId: user.id, type: 'in', quantity: 1, stockBefore: 0, stockAfter: 1 });

  let rejected = false;
  await item.destroy().catch((error) => {
    rejected = /FOREIGN KEY|foreign key/i.test(`${error.name} ${error.message} ${error.parent?.message}`);
  });
  console.log(`RESULTADO ${JSON.stringify({ pragma, rejected, stillThere: Boolean(await Product.findByPk(item.id)) })}`);
  await sequelize.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
