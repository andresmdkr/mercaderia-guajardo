import { useDispatch, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { Avatar, ButtonBase, Divider, IconButton, Paper, Tooltip, Typography, alpha } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { logout } from '../redux/sessionSlice';
import { useThemeMode } from '../theme/ThemeModeContext';

// "Usuario de prueba" → "UP" (las palabras chicas como "de" no cuentan)
const SMALL_WORDS = ['de', 'del', 'la', 'las', 'el', 'los', 'y'];
const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter((word) => word && !SMALL_WORDS.includes(word.toLowerCase()))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

// Pie del menú lateral: una píldora en tres partes, todo a la vista y sin abrir nada:
//   [ avatar + nombre ] | [ modo claro/oscuro ] | [ cerrar sesión ]
// Tocar el nombre abre Configuración. El nombre puede ocupar dos líneas antes de cortarse.
export default function UserPill({ onNavigate }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);
  const { mode, toggleMode } = useThemeMode();
  const themeTitle = mode === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
  const ThemeIcon = mode === 'light' ? DarkModeIcon : LightModeIcon;

  return (
    <Paper sx={{ display: 'flex', alignItems: 'stretch', overflow: 'hidden', bgcolor: 'background.paper' }}>
      <Tooltip title="Abrir configuración">
        <ButtonBase
          component={NavLink}
          to="/settings"
          onClick={onNavigate}
          aria-label="Abrir configuración"
          sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 1, p: 1, flexGrow: 1, minWidth: 0, textAlign: 'left', '&:hover': { bgcolor: 'action.hover' } }}
        >
        <Avatar
          sx={(theme) => ({ width: 28, height: 28, fontSize: 11, fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.18), color: 'primary.main' })}
        >
          {initials(user?.name)}
        </Avatar>
        <Typography
          variant="body2"
          title={user?.name}
          sx={{
            fontWeight: 600,
            fontSize: 13,
            lineHeight: 1.25,
            minWidth: 0,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {user?.name}
        </Typography>
        </ButtonBase>
      </Tooltip>
      <Divider orientation="vertical" flexItem />
      <Tooltip title={themeTitle}>
        <IconButton onClick={toggleMode} aria-label={themeTitle} sx={{ borderRadius: 0, width: 40 }}>
          <ThemeIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem />
      <Tooltip title="Cerrar sesión">
        <IconButton onClick={() => dispatch(logout())} aria-label="Cerrar sesión" sx={{ borderRadius: 0, width: 40 }}>
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Paper>
  );
}
