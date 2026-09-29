import { Box, Radio, Typography, alpha } from '@mui/material';

// Una opción para elegir (tipo tarjeta): título, explicación y, si hace falta, algo extra abajo (children).
// Toda la tarjeta se puede tocar; la elegida se marca con el color principal.
export default function ChoiceOption({ name, value, selected, onSelect, title, description, children }) {
  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        p: 1.5,
        pr: 2,
        border: 1,
        borderRadius: 2,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
        transition: 'border-color 120ms, background-color 120ms',
        '&:hover': { borderColor: selected ? 'primary.main' : 'text.disabled' },
      })}
    >
      <Radio
        checked={selected}
        onChange={() => onSelect(value)}
        value={value}
        name={name}
        size="small"
        slotProps={{ input: { 'aria-label': title } }}
        sx={{ mt: -0.25, p: 0.75 }}
      />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Box component="label" sx={{ cursor: 'pointer', display: 'block' }} onClick={() => onSelect(value)}>
          <Typography sx={{ fontWeight: 600, lineHeight: 1.4 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
        {children}
      </Box>
    </Box>
  );
}
