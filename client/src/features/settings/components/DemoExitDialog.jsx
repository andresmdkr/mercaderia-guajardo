import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { desktop } from '../../../services/desktop';

const CONFIRM_WORD = 'EMPEZAR';

// Salir del modo de prueba: volver a los datos de antes, o empezar de cero (que exige escribir una palabra,
// porque los datos actuales se apartan como copia y la aplicación arranca vacía).
export default function DemoExitDialog({ onClose }) {
  const [choice, setChoice] = useState('keep');
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const fresh = choice === 'fresh';
  const canConfirm = !busy && (!fresh || word.trim().toUpperCase() === CONFIRM_WORD);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    const result = await desktop.exitDemo(fresh);
    // Si salió bien la aplicación se reinicia sola: el diálogo queda en "Reiniciando…" hasta que se cierra la ventana.
    if (!result.ok) {
      setError(result.message || 'No se pudo salir del modo de prueba');
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Salir del modo de prueba</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          La aplicación se va a reiniciar. Los datos de ejemplo se descartan.
        </Typography>
        <FormControl>
          <RadioGroup value={choice} onChange={(event) => setChoice(event.target.value)}>
            <FormControlLabel
              value="keep"
              control={<Radio />}
              label={
                <>
                  <strong>Volver a mis datos</strong>
                  <Typography variant="body2" color="text.secondary">
                    Se retoman los datos que había antes de la prueba. No se borra nada.
                  </Typography>
                </>
              }
              sx={{ alignItems: 'flex-start', mb: 1 }}
            />
            <FormControlLabel
              value="fresh"
              control={<Radio />}
              label={
                <>
                  <strong>Empezar de cero</strong>
                  <Typography variant="body2" color="text.secondary">
                    Los datos actuales se guardan como copia de seguridad (se pueden restaurar desde Configuración) y la
                    aplicación arranca vacía, pidiendo crear el usuario.
                  </Typography>
                </>
              }
              sx={{ alignItems: 'flex-start' }}
            />
          </RadioGroup>
        </FormControl>
        {fresh && (
          <TextField
            label={`Escribí ${CONFIRM_WORD} para confirmar`}
            value={word}
            onChange={(event) => setWord(event.target.value)}
            fullWidth
            size="small"
            autoFocus
            sx={{ mt: 2 }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="contained" color={fresh ? 'error' : 'primary'} onClick={handleConfirm} disabled={!canConfirm}>
          {busy ? 'Reiniciando…' : 'Salir de la prueba'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
