import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import CategoriesPage from './features/categories/pages/CategoriesPage';
import ProductsPage from './features/products/pages/ProductsPage';
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
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
