import { Box, Switch, Typography } from '@mui/material';

// Un interruptor con título y explicación (para opciones que se prenden y se apagan).
export default function SwitchOption({ checked, onChange, disabled = false, title, description }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, opacity: disabled ? 0.55 : 1 }}>
      <Switch
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        slotProps={{ input: { 'aria-label': title } }}
        sx={{ mt: -0.5 }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, lineHeight: 1.4 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Box>
  );
}
