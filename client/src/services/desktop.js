// La aplicación de escritorio (Electron) expone `window.desktop` desde su script "preload".
// En el navegador (desarrollo) no existe y vale null: las pantallas ocultan lo que solo funciona en la app instalada.
//
// Lo que ofrece window.desktop:
//   openBackupsFolder()          abre la carpeta de las copias de seguridad
//   restoreBackup(name)          restaura una copia y reinicia la app → { ok, message }
//   getUpdateStatus()            estado del actualizador → { status, message }
//   checkForUpdates()            busca actualizaciones (el avance llega por onUpdateStatus)
//   installUpdate()              instala la actualización descargada y reinicia
//   onUpdateStatus(callback)     avisa cada cambio del actualizador; devuelve la función para dejar de escuchar
//   printHtml(html)              abre el diálogo de impresión de Windows con ese documento → { ok, message }
//   copyDiagnostics()            copia al portapapeles el informe de diagnóstico → { ok }
export const desktop = typeof window !== 'undefined' ? (window.desktop ?? null) : null;
