import { create } from 'zustand';

/**
 * Estado global de autenticación.
 * Persiste el token en localStorage para sobrevivir reinicios de la app.
 */
export const useAuthStore = create((set) => ({
  token:   localStorage.getItem('zent_token') || null,
  usuario: JSON.parse(localStorage.getItem('zent_usuario') || 'null'),

  login: (token, usuario) => {
    localStorage.setItem('zent_token', token);
    localStorage.setItem('zent_usuario', JSON.stringify(usuario));
    set({ token, usuario });
  },

  logout: () => {
    localStorage.removeItem('zent_token');
    localStorage.removeItem('zent_usuario');
    set({ token: null, usuario: null });
  },
}));
