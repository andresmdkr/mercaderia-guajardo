'use strict';

// Pantalla de la prueba de compatibilidad. Pide el informe al servidor local cada segundo y medio.
// Todo el texto que viene del sistema se inserta con textContent (nunca como HTML).

const $ = (id) => document.getElementById(id);
let lastReport = null;
let lastLines = [];

// Revisiones que solo se pueden hacer desde la pantalla (el motor web).
function browserChecks() {
  let currency = '';
  try {
    currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(1234.5);
  } catch (error) {
    currency = `error: ${error.message}`;
  }
  let storage = false;
  try {
    localStorage.setItem('prueba', '1');
    storage = localStorage.getItem('prueba') === '1';
    localStorage.removeItem('prueba');
  } catch (error) {
    storage = false;
  }
  const wasm = typeof WebAssembly === 'object';
  const moneyOk = /1\.234,50/.test(currency);
  return {
    id: 'web',
    label: 'Pantalla y motor web',
    ok: moneyOk && storage && wasm,
    detail: `moneda "${currency}" ${moneyOk ? 'ok' : 'MAL'} · almacenamiento ${storage ? 'ok' : 'FALLA'} · WebAssembly ${wasm ? 'ok' : 'FALLA'} · pantalla ${screen.width}x${screen.height}`,
  };
}

function render(report) {
  const checks = [...report.checks, browserChecks()];
  const failed = checks.filter((item) => !item.ok);
  const onlyInternet = failed.length > 0 && failed.every((item) => item.id === 'internet');

  $('version').textContent = report.version;

  const list = $('checks');
  list.textContent = '';
  for (const item of checks) {
    const li = document.createElement('li');
    const mark = document.createElement('span');
    mark.className = `mark ${item.ok ? 'ok' : item.id === 'internet' ? 'warn' : 'bad'}`;
    mark.textContent = item.ok ? '✓' : item.id === 'internet' ? '!' : '✗';
    const body = document.createElement('div');
    const label = document.createElement('div');
    label.className = 'check-label';
    label.textContent = item.label;
    const detail = document.createElement('div');
    detail.className = 'check-detail';
    detail.textContent = item.detail;
    body.append(label, detail);
    li.append(mark, body);
    list.append(li);
  }

  const banner = $('banner');
  const waitingInternet = !checks.some((item) => item.id === 'internet');
  if (failed.length === 0 && !waitingInternet) {
    banner.className = 'banner ok';
    $('banner-icon').textContent = '✓';
    $('banner-title').textContent = 'Todo funciona en esta computadora';
    $('banner-text').textContent = 'La aplicación puede instalarse y actualizarse sin problemas.';
  } else if (failed.length === 0) {
    banner.className = 'banner checking';
    $('banner-icon').textContent = '…';
    $('banner-title').textContent = 'Revisando la conexión a internet…';
    $('banner-text').textContent = 'Esto puede tardar hasta 15 segundos.';
  } else if (onlyInternet) {
    banner.className = 'banner warn';
    $('banner-icon').textContent = '!';
    $('banner-title').textContent = 'Funciona, pero no hay conexión para actualizar';
    $('banner-text').textContent = 'La aplicación anda bien; sin internet no podrá buscar versiones nuevas.';
  } else {
    banner.className = 'banner bad';
    $('banner-icon').textContent = '✗';
    $('banner-title').textContent = `Hay ${failed.length} problema${failed.length === 1 ? '' : 's'}`;
    $('banner-text').textContent = 'Tocá "Copiar informe" y pegámelo en el chat.';
  }

  $('update-message').textContent = report.update.message;
  $('btn-install').hidden = report.update.status !== 'ready';
  $('btn-check').disabled = report.update.status === 'checking' || report.update.status === 'downloading';

  lastReport = report;
  lastLines = [
    `Mercadería Guajardo — prueba de compatibilidad — versión ${report.version}${report.packaged ? '' : ' (modo desarrollo)'}`,
    `Informe generado: ${new Date().toLocaleString('es-AR')}`,
    '',
    ...checks.map((item) => `${item.ok ? '[OK]  ' : '[FALLA]'} ${item.label}: ${item.detail}`),
    '',
    `Actualizaciones: ${report.update.message}`,
    `Navegador interno: ${navigator.userAgent}`,
  ];
}

async function refresh() {
  try {
    const response = await fetch('/api/report', { cache: 'no-store' });
    render(await response.json());
  } catch (error) {
    $('banner').className = 'banner bad';
    $('banner-icon').textContent = '✗';
    $('banner-title').textContent = 'La aplicación no responde';
    $('banner-text').textContent = error.message;
  }
}

async function copyReport() {
  const text = lastLines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Plan B para motores viejos: seleccionar un texto oculto y copiar
    const area = document.createElement('textarea');
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  $('copy-result').textContent = 'Informe copiado. Pegalo en el chat.';
  setTimeout(() => ($('copy-result').textContent = ''), 5000);
}

$('btn-copy').addEventListener('click', copyReport);
$('btn-check').addEventListener('click', async () => {
  await fetch('/api/check-update', { method: 'POST' });
  refresh();
});
$('btn-install').addEventListener('click', () => fetch('/api/install-update', { method: 'POST' }));

refresh();
setInterval(refresh, 1500);
