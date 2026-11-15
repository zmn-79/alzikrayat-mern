import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, setToken } from '../services/api';

const AuthContext = createContext(null);
const USER_KEY = 'alzikrayat_user';
const LAST_LOGIN_KEY = 'alzikrayat_last_login';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function readUser() {
  try {
    return getToken() ? JSON.parse(localStorage.getItem(USER_KEY)) : null;
  } catch {
    return null;
  }
}

/** "Last login from this computer" reminder; expires after 7 days like the PHP version. */
export function readLastLogin() {
  try {
    const entry = JSON.parse(localStorage.getItem(LAST_LOGIN_KEY));
    if (entry && Date.now() - entry.at < SEVEN_DAYS) return new Date(entry.at);
  } catch { /* ignore corrupt value */ }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const loginSuccess = useCallback(({ token, user: u }, { remember = true } = {}) => {
    setToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    if (remember) localStorage.setItem(LAST_LOGIN_KEY, JSON.stringify({ at: Date.now() }));
    setUser(u);
  }, []);

  // Expired/invalid token reported by the API layer -> sign the user out.
  useEffect(() => {
    window.addEventListener('alzikrayat:unauthorized', logout);
    return () => window.removeEventListener('alzikrayat:unauthorized', logout);
  }, [logout]);

  const value = useMemo(() => ({ user, isAuthenticated: !!user, loginSuccess, logout }), [user, loginSuccess, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
