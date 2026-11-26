import { create } from 'zustand';

// Intentar recuperar el estado inicial del localStorage
const initialToken = localStorage.getItem('portal_token');
const initialUser = localStorage.getItem('portal_usuario') 
  ? JSON.parse(localStorage.getItem('portal_usuario')) 
  : null;

export const useAuthStore = create((set) => ({
  token: initialToken,
  usuario: initialUser,
  isAuthenticated: !!initialToken,

  login: (token, usuario) => {
    localStorage.setItem('portal_token', token);
    localStorage.setItem('portal_usuario', JSON.stringify(usuario));
    set({ token, usuario, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_usuario');
    set({ token: null, usuario: null, isAuthenticated: false });
  }
}));
