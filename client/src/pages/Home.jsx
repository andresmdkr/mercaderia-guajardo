import { Link as RouterLink } from 'react-router-dom';
import { Button, Paper, Typography } from '@mui/material';

export default function Home() {
  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Control de stock
      </Typography>
      <Button variant="contained" component={RouterLink} to="/products">
        Ir a productos
      </Button>
    </Paper>
  );
}
