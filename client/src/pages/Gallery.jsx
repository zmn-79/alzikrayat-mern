import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks';
import { useAuth } from '../context/AuthContext';
import PhotoCard from '../components/PhotoCard';
import { Alert, EmptyState, Spinner } from '../components/Feedback';

export default function Gallery() {
  const { isAuthenticated } = useAuth();
  const { loading, error, data, reload } = useAsync((signal) => api.getPhotos(signal), []);
  const photos = data?.photos || [];

  return (
    <section>
      <div className="section-head">
        <h1>Gallery{!loading && !error && ` (${photos.length})`}</h1>
        {isAuthenticated && <Link to="/upload" className="btn btn-primary">+ Upload photo</Link>}
      </div>
      {loading && <Spinner label="Loading photos…" />}
      {error && <Alert messages={error.message}><button className="link-btn" onClick={reload}>Try again</button></Alert>}
      {!loading && !error && photos.length === 0 && (
        <EmptyState title="The gallery is empty">
          <p>No photos have been shared yet.</p>
          <Link to={isAuthenticated ? '/upload' : '/login'} className="btn btn-primary">
            {isAuthenticated ? 'Upload the first photo' : 'Log in to upload'}
          </Link>
        </EmptyState>
      )}
      <div className="grid">{photos.map((p) => <PhotoCard key={p._id} photo={p} />)}</div>
    </section>
  );
}
