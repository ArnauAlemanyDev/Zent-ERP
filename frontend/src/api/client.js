/**
 * Cliente HTTP centralizado.
 * Todas las llamadas a la API pasan por aquí.
 * Lee la URL base del .env (VITE_API_URL).
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

function getToken() {
  return localStorage.getItem('zent_token');
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers, cache: 'no-store' };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, options);

  // Token expirado → limpiar sesión y recargar
  if (res.status === 401 && token && path !== '/auth/login') {
    localStorage.removeItem('zent_token');
    localStorage.removeItem('zent_usuario');
    window.location.hash = '/login';
    window.location.reload();
    throw new Error('La sesión ha caducado');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  return data;
}

export const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  put:    (path, body)   => request('PUT',    path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  delete: (path)         => request('DELETE', path),
};
