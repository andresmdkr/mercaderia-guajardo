import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from './App';
import { store } from './redux/store';
import { sessionExpired } from './redux/sessionSlice';
import { setUnauthorizedHandler } from './services/api';
import ThemeModeProvider from './theme/ThemeModeProvider';
import './theme/fonts.css';

setUnauthorizedHandler(() => store.dispatch(sessionExpired()));

// Todas las rutas las define App. Se usa este tipo de enrutador porque permite avisar antes de salir de una pantalla (useBlocker).
const router = createBrowserRouter([{ path: '*', element: <App /> }]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeModeProvider>
        <RouterProvider router={router} />
      </ThemeModeProvider>
    </Provider>
  </StrictMode>
);
