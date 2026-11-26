// Si VITE_API_URL está vacío, las peticiones son relativas al host actual (recomendado en producción).
// Para desarrollo local, puedes poner http://localhost:3001 en el .env
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

async function request(path, options = {}) {
  const token = localStorage.getItem('portal_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && token && path !== '/api/portal/auth/login') {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_usuario');
    window.location.reload();
  }

  // Handle parsing only if response comes with content
  if (!response.ok) {
    let errorMessage = 'Ha ocurrido un error en la petición';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      // no json message
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch (e) {
    return null; // Empty response body but ok status
  }
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
};
