import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { desktop } from '../../../services/desktop';
import ChoiceOption from './ChoiceOption';
import SettingsCard from './SettingsCard';

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

  const handleSelect = async (mode) => {
    // "En otra aplicación" necesita un programa: si todavía no hay uno, se pide primero (y si no elige, no cambia nada).
    if (mode === 'program' && !settings.program && !(await chooseProgram())) return;
    setSettings((current) => ({ ...current, mode }));
    await desktop.setWhatsappMode(mode);
  };

  const option = (value, title, description, children) => (
    <ChoiceOption name="whatsapp-mode" value={value} selected={settings.mode === value} onSelect={handleSelect} title={title} description={description}>
      {children}
    </ChoiceOption>
  );

  return (
    <SettingsCard
      icon={WhatsAppIcon}
      title="WhatsApp en esta computadora"
      description="Dónde se abre al escribirle a un cliente desde Clientes → WhatsApp → «Abrir en esta computadora», y al enviar un comprobante."
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }} role="radiogroup" aria-label="Dónde abrir WhatsApp">
        {option('integrated', 'En una ventana de la aplicación', 'Escaneás el QR una sola vez y queda guardado. Usa bastante memoria mientras está abierta.')}
        {option('browser', 'En el navegador de la computadora', 'Si la ventana de la aplicación se cierra sola o la computadora se pone lenta.')}
        {option(
          'program',
          'En otra aplicación',
          'Un programa de WhatsApp aparte (por ejemplo WhatsAppGuajardo.exe): se le pasa el número del cliente.',
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            <Button size="small" variant="outlined" onClick={chooseProgram}>
              {settings.program ? 'Cambiar programa…' : 'Elegir programa…'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              {settings.program ?? 'Todavía no elegiste ninguno'}
            </Typography>
          </Box>
        )}
      </Box>
    </SettingsCard>
  );
}
