import { Link } from 'react-router-dom';
import { imageSrc } from '../services/api';
import { formatDate, fullName } from '../utils';

export default function PhotoCard({ photo }) {
  return (
    <article className="card photo-card">
      <Link to={`/photos/${photo._id}`} className="photo-thumb" aria-label={`Open ${photo.title}`}>
        <img src={imageSrc(photo.imageUrl)} alt={photo.title} loading="lazy" />
      </Link>
      <div className="card-body">
        <h3 className="card-title"><Link to={`/photos/${photo._id}`}>{photo.title}</Link></h3>
        {photo.description && <p className="card-text clamp">{photo.description}</p>}
        <div className="card-meta">
          <span>By {fullName(photo.user)}</span>
          <span>{formatDate(photo.dateTime)}</span>
        </div>
        <div className="card-meta">
          <span>💬 {photo.commentCount ?? 0} {photo.commentCount === 1 ? 'comment' : 'comments'}</span>
        </div>
      </div>
    </article>
  );
}
