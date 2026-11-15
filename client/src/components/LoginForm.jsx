import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, errorMessages } from '../services/api';
import { readLastLogin, useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert } from './Feedback';
import { formatDate } from '../utils';

export default function LoginForm() {
  const { loginSuccess } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lastLogin] = useState(readLastLogin); // read before this login overwrites it

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) return setErrors(['Email and password are both required.']);
    setBusy(true);
    setErrors([]);
    try {
      const data = await api.login(form);
      loginSuccess(data);
      notify(`Welcome back, ${data.user.firstName}!`);
      navigate(location.state?.from || '/gallery', { replace: true });
    } catch (err) {
      setErrors(errorMessages(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="form" noValidate>
      {location.state?.from && <Alert type="info" messages="Please log in to continue." />}
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={change} required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={change} required />
      {errors.length > 0 && <Alert messages={errors} />}
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      {lastLogin && <p className="muted small center-text">Last login from this computer was {formatDate(lastLogin)}</p>}
    </form>
  );
}
