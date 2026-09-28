import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getErrorMessage } from '../services/api';
import { fetchCurrentUser, loginRequest, logoutRequest } from '../services/authService';

// status: 'checking' (todavía no sabemos si hay sesión) | 'authenticated' | 'anonymous'
const initialState = { user: null, status: 'checking' };

export const checkSession = createAsyncThunk('session/check', () => fetchCurrentUser());

export const login = createAsyncThunk('session/login', async ({ username, password }, { rejectWithValue }) => {
  try {
    return await loginRequest(username, password);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const logout = createAsyncThunk('session/logout', () => logoutRequest());

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    // Se dispara cuando el backend responde 401 (sesión vencida).
    sessionExpired(state) {
      state.user = null;
      state.status = 'anonymous';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(checkSession.rejected, (state) => {
        state.user = null;
        state.status = 'anonymous';
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'anonymous';
      });
  },
});

export const { sessionExpired } = sessionSlice.actions;
export default sessionSlice.reducer;
