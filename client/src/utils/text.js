// Texto para comparar: sin tildes ni mayúsculas ("Gómez" y "gomez" son lo mismo).
export const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
