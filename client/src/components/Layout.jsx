import { Link as RouterLink, Outlet } from 'react-router-dom';
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory2';

export default function Layout() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ color: 'inherit', textDecoration: 'none', flexGrow: 1 }}>
            Mercadería Guajardo
          </Typography>
          <Button color="inherit" component={RouterLink} to="/products" startIcon={<InventoryIcon />}>
            Productos
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
