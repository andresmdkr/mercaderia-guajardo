import api from '../../../services/api';

export const fetchBusinessSettings = () => api.get('/settings/business').then((res) => res.data);

// Versión de la aplicación y modo: { version, demo }
export const fetchAppVersion = () => api.get('/version').then((res) => res.data);

// Copias de seguridad: { folder, items: [{ name, size, createdAt, kind }] }
export const fetchBackups = () => api.get('/backups').then((res) => res.data);

export const createBackup = () => api.post('/backups').then((res) => res.data);

// Copia externa (opcional): { folder, lastCopyAt, lastError, state: none|error|stale|pending|ok, daysSinceCopy, warning }
export const fetchExternalBackup = () => api.get('/backups/external').then((res) => res.data);

// folder = ruta completa, o null para quitarla
export const setExternalBackupFolder = (folder) => api.put('/backups/external', { folder }).then((res) => res.data);

export const updateBusinessSettings = (data) => api.put('/settings/business', data).then((res) => res.data);
