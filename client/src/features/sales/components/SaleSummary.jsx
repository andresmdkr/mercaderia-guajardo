import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CustomerPicker from '../../customers/components/CustomerPicker';
import { formatMoney } from '../../../utils/format';
import { centsToMoney } from '../cartMath';
import { PAYMENT_METHODS } from '../salesConstants';

function Row({ label, children, sx }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...sx }}>
      <Typography color="text.secondary">{label}</Typography>
      {children}
    </Box>
  );
}

export default function SaleSummary({
  totals,
  discount,
  onDiscountChange,
  customer,
  onCustomerChange,
  paymentMethod,
  onPaymentMethodChange,
  notes,
  onNotesChange,
  submitError,
  submitting,
  canConfirm,
  onConfirm,
}) {
  return (
    <Paper sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <CustomerPicker value={customer} onChange={onCustomerChange} />

      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={paymentMethod}
        onChange={(event, value) => value && onPaymentMethodChange(value)}
      >
        {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
          <ToggleButton key={key} value={key}>
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={discount.type}
          onChange={(event, value) => value && onDiscountChange({ ...discount, type: value })}
        >
          <ToggleButton value="amount" sx={{ px: 1.5 }}>
            $
          </ToggleButton>
          <ToggleButton value="percent" sx={{ px: 1.5 }}>
            %
          </ToggleButton>
        </ToggleButtonGroup>
        <TextField
          label="Descuento"
          type="number"
          size="small"
          fullWidth
          value={discount.value}
          onChange={(event) => onDiscountChange({ ...discount, value: event.target.value })}
          error={Boolean(totals.discountError)}
          helperText={totals.discountError}
          slotProps={{
            htmlInput: { min: 0, step: discount.type === 'percent' ? 1 : 'any' },
            input: {
              endAdornment: <InputAdornment position="end">{discount.type === 'percent' ? '%' : '$'}</InputAdornment>,
            },
          }}
        />
      </Box>

      <TextField
        label="Notas (opcional)"
        size="small"
        fullWidth
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        slotProps={{ htmlInput: { maxLength: 300 } }}
      />

      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Row label="Subtotal">
          <Typography>{formatMoney(centsToMoney(totals.subtotalCents))}</Typography>
        </Row>
        {totals.discountCents > 0 && (
          <Row label="Descuento">
            <Typography color="error.main">− {formatMoney(centsToMoney(totals.discountCents))}</Typography>
          </Row>
        )}
        <Row label="Total" sx={{ mt: 1 }}>
          <Typography
            component="p"
            sx={{
              color: (theme) => theme.palette.sections.sales,
              fontFamily: (theme) => theme.typography.fontFamily, // cifras en sans, nunca serif
              fontSize: 32,
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            {formatMoney(centsToMoney(totals.totalCents))}
          </Typography>
        </Row>
      </Box>

      {submitError && <Alert severity="error">{submitError}</Alert>}

      <Button
        variant="contained"
        size="large"
        disabled={!canConfirm}
        onClick={onConfirm}
        startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
        sx={{
          bgcolor: (theme) => theme.palette.sections.sales,
          color: (theme) => theme.palette.getContrastText(theme.palette.sections.sales),
          '&:hover': { bgcolor: (theme) => theme.palette.sections.sales, filter: 'brightness(0.92)' },
        }}
      >
        Confirmar venta
      </Button>
    </Paper>
  );
}
