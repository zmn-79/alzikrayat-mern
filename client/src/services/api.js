// Thin fetch wrapper around the Express REST API.
// Contains no secrets: the only thing stored in the browser is the user's JWT.
const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'alzikrayat_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

/** Turns the server's relative image path into a URL the <img> tag can load. */
export const imageSrc = (imageUrl) => `${BASE}${imageUrl}`;

export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request(path, { method = 'GET', json, formData, signal, auth = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token && auth) headers.Authorization = `Bearer ${token}`;

  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (formData) {
    body = formData; // the browser sets the multipart boundary itself
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body, signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && auth) window.dispatchEvent(new Event('alzikrayat:unauthorized'));
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data?.errors || []);
  }
  return data;
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', json: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', json: payload }),
  getPhotos: (signal) => request('/api/photos', { signal }),
  getPhoto: (id, signal) => request(`/api/photos/${id}`, { signal }),
  uploadPhoto: (formData) => request('/api/photos', { method: 'POST', formData, auth: true }),
  deletePhoto: (id) => request(`/api/photos/${id}`, { method: 'DELETE', auth: true }),
  addComment: (id, comment) =>
    request(`/api/photos/${id}/comments`, { method: 'POST', json: { comment }, auth: true }),
};

/** Joins the server's message with any per-field messages for display. */
export const errorMessages = (err) =>
  err instanceof ApiError && err.errors.length ? err.errors : [err.message || 'Something went wrong'];
