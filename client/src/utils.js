const fmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
export const formatDate = (d) => fmt.format(new Date(d));
export const fullName = (u) => (u ? `${u.firstName} ${u.lastName}` : 'Unknown user');
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
