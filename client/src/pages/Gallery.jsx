import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks';
import { usePhotoFeed } from '../useRealtime';
import { useAuth } from '../context/AuthContext';
import PhotoCard from '../components/PhotoCard';
import { Alert, EmptyState, Spinner } from '../components/Feedback';

export default function Gallery() {
  const { isAuthenticated } = useAuth();
  const { loading, error, data, setData, reload } = useAsync((signal) => api.getPhotos(signal), []);
  const photos = data?.photos || [];
  const [freshIds, setFreshIds] = useState([]); // cards that arrived live (briefly highlighted)

  // Live updates: a photo uploaded elsewhere is added at the top, a deleted one disappears.
  usePhotoFeed({
    onNew: (photo) => {
      setData((d) => (!d || d.photos.some((p) => p._id === photo._id)
        ? d
        : { ...d, count: d.count + 1, photos: [photo, ...d.photos] }));
      setFreshIds((ids) => [...ids, photo._id]);
    },
    onDeleted: ({ photoId }) => setData((d) => (!d ? d : {
      ...d,
      count: d.photos.filter((p) => p._id !== photoId).length,
      photos: d.photos.filter((p) => p._id !== photoId),
    })),
  });

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
      <div className="grid">{photos.map((p) => <PhotoCard key={p._id} photo={p} highlight={freshIds.includes(p._id)} />)}</div>
    </section>
  );
}
