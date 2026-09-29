import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import CategoriesPage from './features/categories/pages/CategoriesPage';
import CustomersPage from './features/customers/pages/CustomersPage';
import ProductsPage from './features/products/pages/ProductsPage';
import NewSalePage from './features/sales/pages/NewSalePage';
import SummariesPage from './features/sales/pages/SummariesPage';
import ReportsPage from './features/reports/pages/ReportsPage';
import SettingsPage from './features/settings/pages/SettingsPage';
import SalesPage from './features/sales/pages/SalesPage';
import StockPage from './features/stock/pages/StockPage';
import { checkSession } from './redux/sessionSlice';

export default function App() {
  const dispatch = useDispatch();

  // Al abrir la app se consulta si ya hay una sesión (la cookie no se puede leer desde JS).
  useEffect(() => {
    dispatch(checkSession());
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/new" element={<NewSalePage />} />
          <Route path="/sales/summaries" element={<SummariesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/categories" element={<CategoriesPage />} />          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/products/stock" element={<StockPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
