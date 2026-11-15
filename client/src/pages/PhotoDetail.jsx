import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessages, imageSrc } from '../services/api';
import { useAsync } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CommentForm from '../components/CommentForm';
import CommentList from '../components/CommentList';
import { Alert, Spinner } from '../components/Feedback';
import { formatDate, fullName } from '../utils';

export default function PhotoDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState([]);
  const { loading, error, data, setData, reload } = useAsync((signal) => api.getPhoto(id, signal), [id]);

  if (loading) return <Spinner label="Loading photo…" />;
  if (error) {
    return (
      <div>
        <Alert messages={error.status === 404 || error.status === 400 ? 'This photo could not be found. It may have been deleted.' : error.message}>
          {error.status !== 404 && error.status !== 400 && <button className="link-btn" onClick={reload}>Try again</button>}
        </Alert>
        <Link to="/gallery">← Back to gallery</Link>
      </div>
    );
  }

  const { photo, comments } = data;
  const isOwner = isAuthenticated && user._id === photo.userId;

  const addComment = (comment) => setData({ ...data, comments: [...comments, comment] });

  const handleDelete = async () => {
    if (!window.confirm('Delete this photo? This cannot be undone.')) return;
    setDeleting(true);
    setDeleteErrors([]);
    try {
      await api.deletePhoto(photo._id);
      notify('Photo deleted');
      navigate('/gallery');
    } catch (err) {
      setDeleteErrors(errorMessages(err));
      setDeleting(false);
    }
  };

  return (
    <article className="detail">
      <Link to="/gallery" className="back">← Back to gallery</Link>
      <div className="detail-layout">
        <img className="detail-img" src={imageSrc(photo.imageUrl)} alt={photo.title} />
        <aside className="detail-info card">
          <h1>{photo.title}</h1>
          <p className="muted">By {fullName(photo.user)}<br /><small>{formatDate(photo.dateTime)}</small></p>
          {photo.description && <p className="pre">{photo.description}</p>}
          {isOwner && (
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete photo'}
            </button>
          )}
          {deleteErrors.length > 0 && <Alert messages={deleteErrors} />}
        </aside>
      </div>

      <section className="comments">
        <h2>Comments ({comments.length})</h2>
        <CommentList comments={comments} />
        {isAuthenticated
          ? <CommentForm photoId={photo._id} onAdded={addComment} />
          : <p className="muted"><Link to="/login" state={{ from: `/photos/${photo._id}` }}>Log in</Link> to add a comment.</p>}
      </section>
    </article>
  );
}
