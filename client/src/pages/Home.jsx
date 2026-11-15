import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks';
import { useAuth } from '../context/AuthContext';
import PhotoCard from '../components/PhotoCard';
import { Alert, EmptyState, Spinner } from '../components/Feedback';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { loading, error, data, reload } = useAsync((signal) => api.getPhotos(signal), []);
  const photos = data?.photos || [];

  // Stats are computed from real API data (no hard-coded numbers).
  const contributors = new Set(photos.map((p) => p.userId)).size;
  const comments = photos.reduce((sum, p) => sum + (p.commentCount || 0), 0);

  return (
    <>
      <section className="hero">
        <h1>Alzikrayat</h1>
        <p>
          “Our memories” - a simple space to upload the moments that matter, tell the story
          behind them, and comment on the memories your friends share back.
        </p>
        <div className="hero-actions">
          <Link to="/gallery" className="btn btn-light">Explore the gallery</Link>
          {isAuthenticated
            ? <Link to="/upload" className="btn btn-ghost">Upload a photo</Link>
            : <Link to="/register" className="btn btn-ghost">Create an account</Link>}
        </div>
      </section>

      {!loading && !error && (
        <section className="stats">
          <div className="card stat"><strong>{photos.length}</strong><span>Photos shared</span></div>
          <div className="card stat"><strong>{contributors}</strong><span>Contributors</span></div>
          <div className="card stat"><strong>{comments}</strong><span>Comments</span></div>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>Recent memories</h2>
          {photos.length > 6 && <Link to="/gallery">View all →</Link>}
        </div>
        {loading && <Spinner label="Loading recent photos…" />}
        {error && <Alert messages={error.message}><button className="link-btn" onClick={reload}>Try again</button></Alert>}
        {!loading && !error && photos.length === 0 && (
          <EmptyState title="No photos yet">
            <p>Be the first to share a memory.</p>
            <Link to={isAuthenticated ? '/upload' : '/register'} className="btn btn-primary">
              {isAuthenticated ? 'Upload a photo' : 'Sign up to upload'}
            </Link>
          </EmptyState>
        )}
        <div className="grid">{photos.slice(0, 6).map((p) => <PhotoCard key={p._id} photo={p} />)}</div>
      </section>
    </>
  );
}
