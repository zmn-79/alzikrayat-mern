import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessages, imageSrc } from '../services/api';
import { useAsync } from '../hooks';
import { usePhotoRoom } from '../useRealtime';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CommentForm from '../components/CommentForm';
import CommentList from '../components/CommentList';
import LiveStatus from '../components/LiveStatus';
import { Alert, Spinner } from '../components/Feedback';
import { formatDate, fullName } from '../utils';

export default function PhotoDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState([]);
  const [removed, setRemoved] = useState(false); // photo deleted by its owner while we were looking at it
  const { loading, error, data, setData, reload } = useAsync((signal) => api.getPhoto(id, signal), [id]);

  useEffect(() => setRemoved(false), [id]);

  // Used for BOTH sources of a new comment: the REST response of our own form
  // and the live "comment:new" event. Skipping known _ids means the author
  // (who receives the comment twice) never sees it duplicated.
  const addComment = (comment) => setData((d) => {
    if (!d || d.comments.some((c) => c._id === comment._id)) return d;
    return { ...d, comments: [...d.comments, comment] };
  });

  // After a dropped connection some events may have been missed: ask REST for the truth.
  const resyncComments = () => {
    api.getPhoto(id)
      .then((fresh) => setData((d) => (d ? { ...d, comments: fresh.comments } : d)))
      .catch(() => { /* still offline or photo gone - the next event or reload will fix it */ });
  };

  // Hooks must run on every render, so this sits above the early returns below.
  const { status } = usePhotoRoom(id, {
    onComment: addComment,
    onResync: resyncComments,
    onPhotoDeleted: () => setRemoved(true),
  });

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
  if (removed) {
    return (
      <div>
        <Alert type="info" messages="This photo was just deleted by its owner." />
        <Link to="/gallery">← Back to gallery</Link>
      </div>
    );
  }

  const { photo, comments } = data;
  const isOwner = isAuthenticated && user._id === photo.userId;

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
        <div className="section-head">
          <h2>Comments ({comments.length})</h2>
          <LiveStatus status={status} />
        </div>
        <CommentList comments={comments} />
        {isAuthenticated
          ? <CommentForm photoId={photo._id} onAdded={addComment} />
          : <p className="muted"><Link to="/login" state={{ from: `/photos/${photo._id}` }}>Log in</Link> to add a comment.</p>}
      </section>
    </article>
  );
}
