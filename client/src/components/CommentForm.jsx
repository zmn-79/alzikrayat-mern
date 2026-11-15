import { useState } from 'react';
import { api, errorMessages } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Alert } from './Feedback';

const MAX = 1000;

export default function CommentForm({ photoId, onAdded }) {
  const notify = useToast();
  const [text, setText] = useState('');
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return setErrors(['Please enter a comment.']);
    setBusy(true);
    setErrors([]);
    try {
      const { comment } = await api.addComment(photoId, trimmed);
      onAdded(comment);          // parent appends it - no page reload
      setText('');
      notify('Comment posted');
    } catch (err) {
      setErrors(errorMessages(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="comment-form" noValidate>
      <label htmlFor="comment">Add a comment</label>
      <textarea
        id="comment" rows="3" value={text} maxLength={MAX}
        onChange={(e) => setText(e.target.value)} placeholder="Share your thoughts…"
      />
      <div className="form-row">
        <small className="muted">{text.length}/{MAX}</small>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Posting…' : 'Post comment'}</button>
      </div>
      {errors.length > 0 && <Alert messages={errors} />}
    </form>
  );
}
