// Cómo se muestra cada tipo de copia de seguridad (viene del sufijo del nombre del archivo).
export const BACKUP_KINDS = {
  manual: { label: 'Manual', color: 'default' },
  automatico: { label: 'Automática', color: 'success' },
  'antes-de-migrar': { label: 'Antes de actualizar', color: 'info' },
  'antes-de-restaurar': { label: 'Antes de restaurar', color: 'warning' },
};
