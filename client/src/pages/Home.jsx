import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Grid, Paper, Typography, alpha, useTheme } from '@mui/material';
import { flatSections } from '../theme/sections';

function SectionCard({ section }) {
  const theme = useTheme();
  const color = theme.palette.sections[section.key];
  const Icon = section.icon;

  return (
    <Paper
      component={RouterLink}
      to={section.path}
      sx={{
        display: 'block',
        p: 3,
        height: '100%',
        color: 'inherit',
        textDecoration: 'none',
        transition: 'border-color 0.15s, transform 0.15s',
        '&:hover': { borderColor: color, transform: 'translateY(-2px)' },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          mb: 2,
          borderRadius: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          bgcolor: alpha(color, 0.14),
        }}
      >
        <Icon />
      </Box>
      <Typography variant="h6" gutterBottom>
        {section.label}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {section.description}
      </Typography>
    </Paper>
  );
}

export default function Home() {
  const user = useSelector((state) => state.session.user);

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Hola, {user?.name}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        ¿Qué querés hacer hoy?
      </Typography>

      <Grid container spacing={2}>
        {flatSections
          .filter((section) => section.key !== 'home')
          .map((section) => (
            <Grid key={section.key} size={{ xs: 12, sm: 6, md: 4 }}>
              <SectionCard section={section} />
            </Grid>
          ))}
      </Grid>
    </>
  );
}
