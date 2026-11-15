import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessages } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert } from './Feedback';

const empty = { firstName: '', lastName: '', email: '', password: '', location: '', occupation: '' };

export default function RegisterForm() {
  const { loginSuccess } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const problems = [];
    if (!form.firstName.trim()) problems.push('First name is required.');
    if (!form.lastName.trim()) problems.push('Last name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) problems.push('Please enter a valid email address.');
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      problems.push('Password must be at least 8 characters and include a letter and a number.');
    }
    if (problems.length) return setErrors(problems);

    setBusy(true);
    setErrors([]);
    try {
      const data = await api.register(form);
      loginSuccess(data, { remember: false });
      notify(`Welcome to Alzikrayat, ${data.user.firstName}!`);
      navigate('/gallery', { replace: true });
    } catch (err) {
      setErrors(errorMessages(err)); // server-side Joi / duplicate-email messages
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="form" noValidate>
      <div className="grid-2">
        <div>
          <label htmlFor="firstName">First name</label>
          <input id="firstName" name="firstName" value={form.firstName} onChange={change} maxLength={50} autoComplete="given-name" required />
        </div>
        <div>
          <label htmlFor="lastName">Last name</label>
          <input id="lastName" name="lastName" value={form.lastName} onChange={change} maxLength={50} autoComplete="family-name" required />
        </div>
      </div>
      <label htmlFor="reg-email">Email</label>
      <input id="reg-email" name="email" type="email" value={form.email} onChange={change} autoComplete="email" required />
      <label htmlFor="reg-password">Password</label>
      <input id="reg-password" name="password" type="password" value={form.password} onChange={change} autoComplete="new-password" required />
      <small className="muted">At least 8 characters, with a letter and a number.</small>
      <div className="grid-2">
        <div>
          <label htmlFor="location">Location <span className="muted">(optional)</span></label>
          <input id="location" name="location" value={form.location} onChange={change} maxLength={100} />
        </div>
        <div>
          <label htmlFor="occupation">Occupation <span className="muted">(optional)</span></label>
          <input id="occupation" name="occupation" value={form.occupation} onChange={change} maxLength={100} />
        </div>
      </div>
      {errors.length > 0 && <Alert messages={errors} />}
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
    </form>
  );
}
