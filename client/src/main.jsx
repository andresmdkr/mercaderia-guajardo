import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { store } from './redux/store';
import { sessionExpired } from './redux/sessionSlice';
import { setUnauthorizedHandler } from './services/api';
import ThemeModeProvider from './theme/ThemeModeProvider';

setUnauthorizedHandler(() => store.dispatch(sessionExpired()));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeModeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeModeProvider>
    </Provider>
  </StrictMode>
);
