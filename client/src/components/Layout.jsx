import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Collapse,
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
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { logout } from '../redux/sessionSlice';
import { sections } from '../theme/sections';
import ThemeToggle from './ThemeToggle';

const DRAWER_WIDTH = 252;

// "Usuario de prueba" → "UP" (las palabras chicas como "de" no cuentan)
const SMALL_WORDS = ['de', 'del', 'la', 'las', 'el', 'los', 'y'];
const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter((word) => word && !SMALL_WORDS.includes(word.toLowerCase()))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

function NavItem({ section, onNavigate, nested = false }) {
  const theme = useTheme();
  const { pathname } = useLocation();
  const color = theme.palette.sections[section.key];
  const Icon = section.icon;
  const hasChildren = Boolean(section.children?.length);

  // Un grupo con submenú se marca solo cuando estás en su página principal;
  // estando en un hijo, el grupo queda desplegado y se marca el hijo.
  let selected = pathname.startsWith(section.path);
  if (section.path === '/') selected = pathname === section.path;
  // Con submenú, la sección se marca salvo que la pantalla sea una de sus subsecciones (así /sales/new sigue marcando Ventas).
  if (hasChildren) selected = pathname.startsWith(section.path) && !section.children.some((child) => pathname.startsWith(child.path));
  const expanded = hasChildren && pathname.startsWith(section.path);

  return (
    <>
      <ListItemButton
        component={NavLink}
        to={section.path}
        onClick={onNavigate}
        selected={selected}
        sx={{
          borderRadius: 2.5,
          mb: 0.5,
          pl: nested ? 3.5 : 2,
          '&.Mui-selected': { bgcolor: alpha(color, 0.14), '&:hover': { bgcolor: alpha(color, 0.2) } },
        }}
      >
        <ListItemIcon sx={{ minWidth: nested ? 34 : 38, color }}>
          <Icon fontSize="small" />
        </ListItemIcon>
        {/* Los subitems van un poco más chicos y en una sola línea ("Actualizar precios" se partía en dos) */}
        <ListItemText
          primary={section.label}
          slotProps={{ primary: { fontSize: nested ? 14 : 14.5, fontWeight: selected ? 600 : 500, noWrap: true } }}
        />
      </ListItemButton>

      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List disablePadding>
            {section.children.map((child) => (
              <NavItem key={child.key} section={child} onNavigate={onNavigate} nested />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

function SidebarContent({ onNavigate }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const user = useSelector((state) => state.session.user);
  const salesColor = theme.palette.sections.sales;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Typography variant="h6" sx={{ px: 1.5, py: 1.5, mb: 1 }}>
        Mercadería Guajardo
      </Typography>

      {/* Ventas es lo más importante: acceso directo siempre a mano */}
      <Button
        component={NavLink}
        to="/sales/new"
        onClick={onNavigate}
        variant="contained"
        startIcon={<AddShoppingCartIcon />}
        sx={{
          mb: 2,
          py: 1.1,
          bgcolor: salesColor,
          color: theme.palette.getContrastText(salesColor),
          '&:hover': { bgcolor: salesColor, filter: 'brightness(0.92)' },
        }}
      >
        Nueva venta
      </Button>

      <List disablePadding sx={{ flexGrow: 1 }}>
        {sections.map((section) => (
          <NavItem key={section.key} section={section} onNavigate={onNavigate} />
        ))}
      </List>

      {/* Pie del menú en dos filas: quién está usando la app (con el nombre completo) y, debajo, tema y salir */}
      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, px: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.18), color: 'primary.main' }}>
            {initials(user?.name)}
          </Avatar>
          <Typography variant="body2" noWrap title={user?.name} sx={{ fontWeight: 600, minWidth: 0 }}>
            {user?.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <ThemeToggle />
          <Button size="small" color="inherit" onClick={() => dispatch(logout())} startIcon={<LogoutIcon fontSize="small" />}>
            Salir
          </Button>
        </Box>
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
