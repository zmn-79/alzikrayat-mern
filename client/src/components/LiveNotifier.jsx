import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePhotoFeed } from '../useRealtime';

/**
 * Renders nothing. Mounted once in App: shows a toast whenever somebody else
 * uploads a photo, on whichever page the visitor currently is.
 */
export default function LiveNotifier() {
  const { user } = useAuth();
  const notify = useToast();

  usePhotoFeed({
    onNew: (photo) => {
      if (user && photo.userId === user._id) return; // the uploader already got a "Photo uploaded" toast
      const who = photo.user?.firstName || 'Someone';
      notify(`${who} just uploaded a new photo: "${photo.title}"`, 'info');
    },
  });

  return null;
}
