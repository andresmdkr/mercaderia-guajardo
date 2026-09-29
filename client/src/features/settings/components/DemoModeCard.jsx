import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import { desktop } from '../../../services/desktop';
import useDemoMode from '../hooks/useDemoMode';
import DemoExitDialog from './DemoExitDialog';
import EnterDemoButton from './EnterDemoButton';
import SettingsCard from './SettingsCard';

// Modo de prueba: mostrar la app con datos de ejemplo sin tocar los datos reales. Solo en la app instalada.
export default function DemoModeCard() {
  const demo = useDemoMode();
  const [exiting, setExiting] = useState(false);

  if (!desktop || demo === null) return null;

  return (
    <SettingsCard
      icon={ScienceIcon}
      title="Modo de prueba"
      description={
        demo
          ? 'Estás usando datos de ejemplo: no se mezclan con los reales.'
          : 'Para mostrar la aplicación a un cliente: se reinicia con productos, clientes y ventas de ejemplo.'
      }
    >
      {demo ? (
        <>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Podés reiniciar la demo para dejarla como al principio, o salir y volver a tus datos.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button variant="contained" onClick={() => setExiting(true)}>
              Salir del modo de prueba
            </Button>
            <EnterDemoButton label="Reiniciar la demo" restart />
          </Box>
          {exiting && <DemoExitDialog onClose={() => setExiting(false)} />}
        </>
      ) : (
        <>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Tus datos reales no se tocan y podés volver cuando quieras (o empezar de cero).
          </Typography>
          <EnterDemoButton />
        </>
      )}
    </SettingsCard>
  );
}
