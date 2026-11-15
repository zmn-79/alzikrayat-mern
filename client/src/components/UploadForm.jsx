import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessages } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Alert } from './Feedback';
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '../utils';

export default function UploadForm() {
  const notify = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (e) => {
    const f = e.target.files[0];
    setErrors([]);
    if (!f) return setFile(null);
    if (!IMAGE_TYPES.includes(f.type)) { setFile(null); e.target.value = ''; return setErrors(['Only JPEG, PNG, GIF, or WEBP images are allowed.']); }
    if (f.size > MAX_IMAGE_BYTES) { setFile(null); e.target.value = ''; return setErrors(['The image must be smaller than 5 MB.']); }
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    const problems = [];
    if (!title.trim()) problems.push('A title is required.');
    if (!file) problems.push('Please choose an image to upload.');
    if (problems.length) return setErrors(problems);

    const formData = new FormData();          // multipart/form-data
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('photo', file);

    setBusy(true);
    setErrors([]);
    try {
      const { photo } = await api.uploadPhoto(formData);
      notify('Photo uploaded successfully');
      navigate(`/photos/${photo._id}`);
    } catch (err) {
      setErrors(errorMessages(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="form" noValidate>
      <label htmlFor="title">Title</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
      <label htmlFor="description">Description <span className="muted">(optional)</span></label>
      <textarea id="description" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
      <label htmlFor="photo">Photo</label>
      <input id="photo" type="file" accept={IMAGE_TYPES.join(',')} onChange={pick} required />
      <small className="muted">JPEG, PNG, GIF or WEBP, up to 5 MB.</small>
      {preview && <img src={preview} alt="Selected preview" className="upload-preview" />}
      {errors.length > 0 && <Alert messages={errors} />}
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Uploading…' : 'Upload photo'}</button>
    </form>
  );
}
