import { formatDate, fullName } from '../utils';

export default function CommentList({ comments }) {
  if (comments.length === 0) return <p className="muted">No comments yet. Be the first to comment!</p>;
  return (
    <ul className="comment-list">
      {comments.map((c) => (
        <li key={c._id} className="comment">
          <div className="avatar" aria-hidden="true">{(c.user?.firstName || '?')[0].toUpperCase()}</div>
          <div>
            <div className="comment-head">
              <strong>{fullName(c.user)}</strong>
              <small className="muted">{formatDate(c.dateTime)}</small>
            </div>
            <p className="comment-body">{c.comment}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
