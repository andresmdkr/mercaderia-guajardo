// La aplicación de escritorio (Electron) expone `window.desktop` desde su script "preload".
// En el navegador (desarrollo) no existe y vale null: las pantallas ocultan lo que solo funciona en la app instalada.
//
// Lo que ofrece window.desktop:
//   openBackupsFolder()          abre la carpeta de las copias de seguridad
//   restoreBackup(name)          restaura una copia y reinicia la app → { ok, message }
//   enterDemo()                  activa el modo de prueba (base con datos de ejemplo) y reinicia la app → { ok, message }
//   exitDemo(fresh)              sale del modo de prueba y reinicia; con fresh = true aparta los datos reales y arranca vacía → { ok, message }
//   openWhatsapp(url)            abre el chat (enlace wa.me/<número>) en la ventana de WhatsApp de la app, o en el navegador según la opción elegida → { ok, message }
//   shareWhatsappFile({ url, filename, base64 })  guarda el PDF, lo deja copiado como archivo y abre el chat → { ok, message, mode, copied, autoPaste }
//   getWhatsappSettings()        → { mode: 'integrated' (ventana de la app) | 'browser' (navegador del sistema) | 'program' (otro programa), program }
//   setWhatsappMode(mode)        cambia esa opción → { ok }
//   chooseWhatsappProgram()      abre el selector de archivos para elegir el programa (.exe) → { canceled, program }
//   getUpdateStatus()            estado del actualizador → { status, message }
//   checkForUpdates()            busca actualizaciones (el avance llega por onUpdateStatus)
//   installUpdate()              instala la actualización descargada y reinicia
//   onUpdateStatus(callback)     avisa cada cambio del actualizador; devuelve la función para dejar de escuchar
//   chooseFolder()               abre el selector de carpetas de Windows → { canceled, folder }
//   printHtml(html)              abre el diálogo de impresión de Windows con ese documento → { ok, message }
//   copyDiagnostics()            copia al portapapeles el informe de diagnóstico → { ok }
export const desktop = typeof window !== 'undefined' ? (window.desktop ?? null) : null;
