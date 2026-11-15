import { Link } from 'react-router-dom';
import { EmptyState } from '../components/Feedback';

export default function NotFound() {
  return (
    <EmptyState title="Page not found">
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="btn btn-primary">Go home</Link>
    </EmptyState>
  );
}
