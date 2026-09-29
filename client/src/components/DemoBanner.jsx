import { useState } from 'react';
import { Alert, Button } from '@mui/material';
import DemoExitDialog from '../features/settings/components/DemoExitDialog';
import useDemoMode from '../features/settings/hooks/useDemoMode';
import { desktop } from '../services/desktop';

// Franja fija arriba de cada pantalla mientras la app está en modo de prueba: que nadie confunda los datos de
// ejemplo con los reales.
export default function DemoBanner() {
  const demo = useDemoMode();
  const [exiting, setExiting] = useState(false);

  if (!demo) return null;

  return (
    <>
      <Alert
        severity="info"
        variant="filled"
        sx={{
          position: { md: 'sticky' },
          top: 0,
          zIndex: 5,
          mb: 2.5,
          py: 0,
          alignItems: 'center',
          '& .MuiAlert-message': { py: 0.75, fontSize: 13.5, fontWeight: 600 },
          '& .MuiAlert-icon': { py: 0.75, fontSize: 20 },
          '& .MuiAlert-action': { py: 0.25 },
        }}
        action={
          desktop && (
            <Button color="inherit" size="small" onClick={() => setExiting(true)} sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
              Salir de la prueba
            </Button>
          )
        }
      >
        Modo de prueba: los datos son de ejemplo, no son reales
      </Alert>
      {exiting && <DemoExitDialog onClose={() => setExiting(false)} />}
    </>
  );
}
