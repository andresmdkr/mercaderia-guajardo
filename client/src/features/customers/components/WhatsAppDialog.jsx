import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import ComputerIcon from '@mui/icons-material/DesktopWindowsOutlined';
import QrCode from '../../../components/QrCode';
import { whatsappUrl } from '../../../utils/whatsapp';

// Dos formas de escribirle a un cliente por WhatsApp: escaneando el QR con el celular (no gasta memoria de la PC)
// o abriendo WhatsApp Web / la app de WhatsApp en esta computadora.
export default function WhatsAppDialog({ customer, onClose }) {
  const url = whatsappUrl(customer.phone);

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>WhatsApp de {customer.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <QrCode value={url} label={`Código QR para escribirle a ${customer.name} por WhatsApp`} />
          <Typography sx={{ textAlign: 'center' }}>
            Abrí la cámara del celular, apuntala al código y tocá el enlace: se abre el chat con <strong>{customer.phone}</strong>.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap' }}>
        <Button startIcon={<ComputerIcon />} component="a" href={url} target="_blank" rel="noopener noreferrer">
          Abrir en esta computadora
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
