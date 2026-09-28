// Períodos de fechas predefinidos (Hoy, Esta semana...) para los filtros de Ventas y Reportes.

const pad = (n) => String(n).padStart(2, '0');

// Fecha local como AAAA-MM-DD (toISOString usaría UTC y corre el día).
export const toISODate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const DATE_PRESETS = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  all: 'Todas',
};

// Devuelve { from, to } como AAAA-MM-DD ('' = sin límite).
export function presetRange(preset) {
  const now = new Date();
  if (preset === 'today') return { from: toISODate(now), to: toISODate(now) };
  if (preset === 'week') {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // la semana arranca el lunes
    return { from: toISODate(monday), to: toISODate(now) };
  }
  if (preset === 'month') return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISODate(now) };
  return { from: '', to: '' };
}
