import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';

// Secciones de la app. El color de cada una vive en el tema (palette.sections[key]).
// Al sumar una pantalla nueva, se agrega acá y aparece en el menú y en la portada.
export const sections = [
  { key: 'home', label: 'Inicio', path: '/', icon: HomeIcon },
  {
    key: 'products',
    label: 'Productos',
    path: '/products',
    icon: InventoryIcon,
    description: 'Alta, edición y stock de tus productos',
  },
  {
    key: 'categories',
    label: 'Categorías',
    path: '/categories',
    icon: CategoryIcon,
    description: 'Organizá tus productos por rubro',
  },
];

export const getSection = (key) => sections.find((section) => section.key === key);
