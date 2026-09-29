import { useEffect, useState } from 'react';
import { Box, Button, FormControlLabel, Paper, Radio, RadioGroup, Typography } from '@mui/material';
import { desktop } from '../../../services/desktop';

// Dónde se abre WhatsApp cuando en Clientes se toca "Abrir en esta computadora". Solo en la app instalada.
export default function WhatsAppCard() {
  const [settings, setSettings] = useState(null); // { mode, program }

  useEffect(() => {
    let cancelled = false;
    desktop?.getWhatsappSettings().then((value) => !cancelled && setSettings(value));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!desktop || settings === null) return null;

  const chooseProgram = async () => {
    const result = await desktop.chooseWhatsappProgram();
    if (result.canceled) return false;
    setSettings((current) => ({ ...current, program: result.program }));
    return true;
  };

  const handleChange = async (event) => {
    const mode = event.target.value;
    // "En otra aplicación" necesita un programa: si todavía no hay uno, se pide primero (y si no elige, no cambia nada).
    if (mode === 'program' && !settings.program && !(await chooseProgram())) return;
    setSettings((current) => ({ ...current, mode }));
    await desktop.setWhatsappMode(mode);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        WhatsApp en esta computadora
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        Al escribirle a un cliente desde Clientes → WhatsApp → «Abrir en esta computadora».
      </Typography>
      <RadioGroup value={settings.mode} onChange={handleChange}>
        <FormControlLabel
          value="integrated"
          control={<Radio />}
          label={
            <>
              <strong>En una ventana de la aplicación</strong>
              <Typography variant="body2" color="text.secondary">
                Escaneás el QR una sola vez y queda guardado. Usa bastante memoria mientras está abierta.
              </Typography>
            </>
          }
          sx={{ alignItems: 'flex-start', mb: 1 }}
        />
        <FormControlLabel
          value="browser"
          control={<Radio />}
          label={
            <>
              <strong>En el navegador de la computadora</strong>
              <Typography variant="body2" color="text.secondary">
                Si la ventana de la aplicación se cierra sola o la computadora se pone lenta.
              </Typography>
            </>
          }
          sx={{ alignItems: 'flex-start', mb: 1 }}
        />
        <FormControlLabel
          value="program"
          control={<Radio />}
          label={
            <>
              <strong>En otra aplicación</strong>
              <Typography variant="body2" color="text.secondary">
                Un programa de WhatsApp aparte (por ejemplo WhatsAppPrueba.exe). Se le pasa el número del cliente.
              </Typography>
            </>
          }
          sx={{ alignItems: 'flex-start' }}
        />
      </RadioGroup>
      <Box sx={{ mt: 1, ml: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        <Button size="small" variant="outlined" onClick={chooseProgram}>
          {settings.program ? 'Cambiar programa…' : 'Elegir programa…'}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
          {settings.program ?? 'Todavía no elegiste ninguno'}
        </Typography>
      </Box>
    </Paper>
  );
}
