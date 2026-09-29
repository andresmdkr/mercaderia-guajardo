import { useEffect, useState } from 'react';
import { FormControlLabel, Paper, Radio, RadioGroup, Typography } from '@mui/material';
import { desktop } from '../../../services/desktop';

// Dónde se abre WhatsApp cuando en Clientes se toca "Abrir en esta computadora". Solo en la app instalada.
export default function WhatsAppCard() {
  const [mode, setMode] = useState(null);

  useEffect(() => {
    let cancelled = false;
    desktop?.getWhatsappMode().then((value) => !cancelled && setMode(value));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!desktop || mode === null) return null;

  const handleChange = async (event) => {
    const next = event.target.value;
    setMode(next);
    await desktop.setWhatsappMode(next);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        WhatsApp en esta computadora
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        Al escribirle a un cliente desde Clientes → WhatsApp → «Abrir en esta computadora».
      </Typography>
      <RadioGroup value={mode} onChange={handleChange}>
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
          sx={{ alignItems: 'flex-start' }}
        />
      </RadioGroup>
    </Paper>
  );
}
