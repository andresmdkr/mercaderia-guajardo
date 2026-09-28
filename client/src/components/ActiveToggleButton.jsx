import { useState } from 'react';
import { Button } from '@mui/material';
import ConfirmDialog from './ConfirmDialog';

// Botón "Dar de baja" / "Reactivar" para el pie de los formularios de edición.
// Dar de baja pide confirmación; reactivar no, porque es inofensivo.
export default function ActiveToggleButton({ active, description, onToggle, disabled }) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    setConfirming(false);
    onToggle();
  };

  return (
    <>
      <Button
        color={active ? 'error' : 'primary'}
        disabled={disabled}
        onClick={active ? () => setConfirming(true) : onToggle}
      >
        {active ? 'Dar de baja' : 'Reactivar'}
      </Button>

      {confirming && (
        <ConfirmDialog
          title="Dar de baja"
          message={`¿Dar de baja ${description}? Deja de aparecer en los listados y en las ventas, pero se conserva su historial. Podés reactivarlo cuando quieras.`}
          confirmLabel="Dar de baja"
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
