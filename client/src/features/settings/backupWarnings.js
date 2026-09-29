// Texto de la advertencia de la copia externa (es solo una recomendación: nunca bloquea nada).
// `external` es el estado que devuelve el servidor: { folder, lastError, state, daysSinceCopy, warning }.
export function externalWarningText(external, { short = false } = {}) {
  if (!external?.warning) return null;
  if (short && external.state === 'stale') return `Hace ${external.daysSinceCopy} días que no se copia a la carpeta externa. ¿Está conectado el pendrive?`;
  if (short && external.state === 'none') return 'Tus copias están solo en esta PC: si el disco falla, se pierden. Te recomendamos una copia extra en un pendrive o en la nube.';
  if (external.state === 'error') return `No se pudo hacer la copia externa: ${external.lastError}`;
  if (external.state === 'stale') {
    return `Hace ${external.daysSinceCopy} días que no se guarda una copia en la carpeta externa (${external.folder}). ¿Está conectado el pendrive?`;
  }
  return 'Tus copias de seguridad están solo en esta computadora: si el disco falla, se pierden. Te recomendamos guardar una copia extra en un pendrive o en la nube (Google Drive, Dropbox).';
}
