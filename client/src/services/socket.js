// One shared Socket.io connection for the whole React app.
//
// Components never call io() themselves. They "acquire" the socket on mount and
// "release" it on unmount; a reference counter makes sure that
//   - only ONE connection exists, even with React.StrictMode (which mounts,
//     unmounts and re-mounts every effect in development), and
//   - the connection is closed once nobody uses it any more.
import { io } from 'socket.io-client';

// Same convention as services/api.js: empty in development (the Vite proxy
// forwards /socket.io to Express), set only when the API lives on another origin.
const BASE = import.meta.env.VITE_API_URL || '';

let socket = null;
let users = 0;       // how many components currently hold the socket
let closeTimer = null;

export function acquireSocket() {
  // A release a moment ago scheduled a disconnect: cancel it, we are needed again.
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (!socket) {
    socket = io(BASE || window.location.origin, {
      reconnectionDelay: 1000,     // back off 1s, 2s, 4s ... up to 8s, so a dead
      reconnectionDelayMax: 8000,  // server is not hammered with requests
    });
  }
  users += 1;
  return socket;
}

export function releaseSocket() {
  users = Math.max(0, users - 1);
  if (users > 0 || closeTimer) return;
  // Wait a tick before closing: StrictMode's fake unmount is followed by an
  // immediate re-mount, and we want to reuse the live connection in that case.
  closeTimer = setTimeout(() => {
    closeTimer = null;
    if (users === 0 && socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  }, 300);
}
