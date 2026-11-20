import { useEffect, useRef, useState } from 'react';
import { acquireSocket, releaseSocket } from './services/socket';

// Keeps the newest callbacks in a ref so the effects below only re-run when the
// photo id changes - not on every render (which would leave/join rooms in a loop).
function useLatest(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}

const sameId = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

/**
 * Subscribes the component to the live room of ONE photo.
 *
 * handlers (all optional):
 *   onComment(comment)  - a new comment was posted on this photo
 *   onPhotoDeleted()    - this photo was deleted by its owner
 *   onResync()          - the socket reconnected after a drop; events may have
 *                         been missed, so re-fetch the data over REST
 * Returns { status }: 'connecting' | 'live' | 'reconnecting'.
 */
export function usePhotoRoom(photoId, handlers) {
  const [status, setStatus] = useState('connecting');
  const latest = useLatest(handlers);

  useEffect(() => {
    if (!photoId) return undefined;

    let socket;
    try {
      socket = acquireSocket();
    } catch {
      setStatus('reconnecting'); // socket unavailable: the page keeps working over REST
      return undefined;
    }

    let joinedBefore = false;
    const join = () => {
      socket.emit('photo:join', photoId, (res) => {
        if (!res || !res.ok) return; // rejected (bad id / too many rooms): stay REST-only
        if (joinedBefore) latest.current.onResync?.(); // this was a re-join after a reconnect
        joinedBefore = true;
      });
    };

    // 'connect' fires on the first connection AND after every automatic
    // reconnection. Rooms are lost when a connection drops, so we re-join here.
    const onConnect = () => { setStatus('live'); join(); };
    const onDown = (reason) => {
      setStatus('reconnecting');
      // The server closed us on purpose: socket.io will not retry by itself.
      if (reason === 'io server disconnect') socket.connect();
    };
    const onComment = (comment) => {
      if (comment && sameId(comment.photoId, photoId)) latest.current.onComment?.(comment);
    };
    const onDeleted = (payload) => {
      if (payload && sameId(payload.photoId, photoId)) latest.current.onPhotoDeleted?.();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDown);
    socket.on('connect_error', onDown);
    socket.on('comment:new', onComment);
    socket.on('photo:deleted', onDeleted);

    if (socket.connected) onConnect(); // socket was already open (shared with another component)
    else setStatus('connecting');

    // Cleanup on unmount / when the photo id changes: no listener or room leaks.
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDown);
      socket.off('connect_error', onDown);
      socket.off('comment:new', onComment);
      socket.off('photo:deleted', onDeleted);
      if (socket.connected) socket.emit('photo:leave', photoId);
      releaseSocket();
    };
  }, [photoId, latest]);

  return { status };
}

/**
 * Global (not room-based) photo events, used by the gallery, the home page and
 * the upload notifier:  onNew(photo)  and  onDeleted({ photoId }).
 */
export function usePhotoFeed(handlers) {
  const latest = useLatest(handlers);

  useEffect(() => {
    let socket;
    try {
      socket = acquireSocket();
    } catch {
      return undefined; // no socket -> no live updates, nothing else changes
    }
    const onNew = (photo) => photo && latest.current.onNew?.(photo);
    const onDeleted = (payload) => payload && latest.current.onDeleted?.(payload);

    socket.on('photo:new', onNew);
    socket.on('photo:deleted', onDeleted);
    return () => {
      socket.off('photo:new', onNew);
      socket.off('photo:deleted', onDeleted);
      releaseSocket();
    };
  }, [latest]);
}
