'use strict';
// Genera build/icon.ico (y icon.png) dibujando el ícono con Electron. Se corre una sola vez:
//   npx electron scripts/make-icon.js
// Un .ico puede guardar imágenes PNG: se arma con varios tamaños (16 a 256).

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const SIZES = [16, 32, 48, 64, 128, 256];
const PAGE = `<canvas id="c"></canvas><script>
window.draw = (size) => {
  const c = document.getElementById('c');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size * 0.22;
  g.fillStyle = '#C96442';
  g.beginPath();
  g.moveTo(r, 0); g.arcTo(size, 0, size, size, r); g.arcTo(size, size, 0, size, r);
  g.arcTo(0, size, 0, 0, r); g.arcTo(0, 0, size, 0, r); g.closePath(); g.fill();
  // caja de mercadería: tapa y cuerpo en blanco
  g.fillStyle = '#FFFFFF';
  const w = size * 0.56, x = (size - w) / 2, lid = size * 0.16, body = size * 0.34, y = size * 0.27;
  g.fillRect(x - size * 0.03, y, w + size * 0.06, lid);
  g.fillRect(x, y + lid + size * 0.03, w, body);
  g.fillStyle = '#C96442';
  g.fillRect(size * 0.42, y + lid + size * 0.03, size * 0.16, size * 0.1);
  return c.toDataURL('image/png');
};
</script>`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(PAGE)}`);
  const images = [];
  for (const size of SIZES) {
    const dataUrl = await win.webContents.executeJavaScript(`window.draw(${size})`);
    images.push({ size, data: Buffer.from(dataUrl.split(',')[1], 'base64') });
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // tipo: ícono
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size === 256 ? 0 : size;
    entry[1] = size === 256 ? 0 : size;
    entry.writeUInt16LE(1, 4); // planos
    entry.writeUInt16LE(32, 6); // bits por píxel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  const out = path.join(__dirname, '..', 'build');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'icon.ico'), Buffer.concat([header, ...entries, ...images.map((image) => image.data)]));
  fs.writeFileSync(path.join(out, 'icon.png'), images[images.length - 1].data);
  app.exit(0);
});
