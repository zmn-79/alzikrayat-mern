import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

export default function LoginRegister({ mode = 'login' }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/gallery" replace />;
  const isLogin = mode === 'login';

  return (
    <div className="auth-card card">
      <div className="tabs" role="tablist">
        <Link to="/login" role="tab" aria-selected={isLogin} className={isLogin ? 'active' : ''}>Log in</Link>
        <Link to="/register" role="tab" aria-selected={!isLogin} className={!isLogin ? 'active' : ''}>Sign up</Link>
      </div>
      <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
      {isLogin ? <LoginForm /> : <RegisterForm />}
    </div>
  );
}
