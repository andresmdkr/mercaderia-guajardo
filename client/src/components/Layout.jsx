import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCartOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import { menuItems, settingsMenuItem } from '../theme/sections';
import DemoBanner from './DemoBanner';
import SectionTabs from './SectionTabs';
import UserPill from './UserPill';

const DRAWER_WIDTH = 252;

// Qué ítem del menú corresponde a la pantalla actual (el de Ventas también marca Nueva venta y Resúmenes, etc.).
function useActiveKey() {
  const { pathname } = useLocation();
  const all = [...menuItems, settingsMenuItem];
  const found = all.find((item) => item.prefix && (pathname === item.prefix || pathname.startsWith(`${item.prefix}/`)));
  if (found) return found.key;
  return pathname === '/' ? 'home' : null;
}

// Un ítem del menú: grande, con ícono y nombre. Todos iguales y neutros; el que estás usando lleva una pastilla suave
// con el color principal.
function NavItem({ item, active, onNavigate }) {
  const Icon = item.icon;

  return (
    <ListItemButton
      component={NavLink}
      to={item.path}
      onClick={onNavigate}
      selected={active}
      sx={(theme) => ({
        borderRadius: 2.5,
        minHeight: 46,
        px: 1.75,
        mb: 0.5,
        color: 'text.primary',
        '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.05) },
        '&.Mui-selected': {
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.16) },
        },
      })}
    >
      <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.main' : 'text.secondary' }}>
        <Icon />
      </ListItemIcon>
      <ListItemText primary={item.label} slotProps={{ primary: { fontSize: 15, fontWeight: active ? 700 : 500, noWrap: true } }} />
    </ListItemButton>
  );
}

function SidebarContent({ onNavigate }) {
  const theme = useTheme();
  const activeKey = useActiveKey();
  const salesColor = theme.palette.sections.sales;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      {/* Vender es lo más importante: el botón más grande, siempre arriba y siempre a mano */}
      <Button
        component={NavLink}
        to="/sales/new"
        onClick={onNavigate}
        variant="contained"
        size="large"
        startIcon={<AddShoppingCartIcon />}
        sx={{
          mt: 0.5,
          mb: 3,
          py: 1.25,
          fontSize: 15,
          bgcolor: salesColor,
          color: theme.palette.getContrastText(salesColor),
          '&:hover': { bgcolor: salesColor, filter: 'brightness(0.92)' },
        }}
      >
        Nueva venta
      </Button>

      {/* Las opciones de trabajo arriba; Configuración abajo de todo, pegada a la línea del pie */}
      <Box component="nav" aria-label="Menú principal" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <List disablePadding>
          {menuItems.map((item) => (
            <NavItem key={item.key} item={item} active={activeKey === item.key} onNavigate={onNavigate} />
          ))}
        </List>
        <List disablePadding sx={{ mb: 1 }}>
          <NavItem item={settingsMenuItem} active={activeKey === settingsMenuItem.key} onNavigate={onNavigate} />
        </List>
      </Box>

      {/* Pie: quién está usando la app, con el modo claro/oscuro y cerrar sesión a la vista */}
      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
        <UserPill onNavigate={onNavigate} />
      </Box>
    </Box>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);
  const { pathname } = useLocation();

  const drawerPaperSx = (theme) => ({
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    bgcolor: theme.palette.sidebar,
    borderRight: `1px solid ${theme.palette.divider}`,
    borderTop: 0,
    borderBottom: 0,
    borderLeft: 0,
  });

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Barra superior: solo en pantallas chicas */}
      <AppBar position="fixed" color="inherit" sx={{ display: { md: 'none' }, bgcolor: 'background.paper', border: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Abrir menú" sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Mercadería Guajardo
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={closeMobile}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': drawerPaperSx }}
      >
        <SidebarContent onNavigate={closeMobile} />
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{ display: { xs: 'none', md: 'block' }, width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': drawerPaperSx }}
      >
        <SidebarContent />
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 4 } }}>
        <Toolbar sx={{ display: { md: 'none' } }} />
        <Container maxWidth="lg" disableGutters>
          <DemoBanner />
          <SectionTabs />
          {/* Cada pantalla aparece con un fundido corto (solo opacidad y 4 px de movimiento: liviano para PC vieja) */}
          <Box
            key={pathname}
            sx={{
              animation: 'pageIn 180ms ease-out',
              '@keyframes pageIn': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
            }}
          >
            <Outlet />
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
