import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', color = 'error', onConfirm, onCancel }) {
  return (
    <Dialog open onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} color={color} variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
