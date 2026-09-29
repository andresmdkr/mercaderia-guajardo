import { useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { desktop } from '../../../services/desktop';
import useDemoMode from '../hooks/useDemoMode';
import DemoExitDialog from './DemoExitDialog';
import EnterDemoButton from './EnterDemoButton';

// Modo de prueba: mostrar la app con datos de ejemplo sin tocar los datos reales. Solo en la app instalada.
export default function DemoModeCard() {
  const demo = useDemoMode();
  const [exiting, setExiting] = useState(false);

  if (!desktop || demo === null) return null;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Modo de prueba
      </Typography>
      {demo ? (
        <>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Estás en modo de prueba: los datos son de ejemplo y no se mezclan con los reales. Para dejar la demo como al
            principio podés reiniciarla.
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
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Para mostrar la aplicación a un cliente: se reinicia con productos, clientes y ventas de ejemplo. Tus datos
            reales no se tocan y podés volver cuando quieras (o empezar de cero).
          </Typography>
          <EnterDemoButton />
        </>
      )}
    </Paper>
  );
}
