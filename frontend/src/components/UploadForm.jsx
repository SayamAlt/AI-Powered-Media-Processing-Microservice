import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

const ACCEPTED = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] };

export default function UploadForm() {
  const [error, setError] = useState(null);
  const qc = useQueryClient();

  const upload = useMutation({
    mutationFn: file => {
      const form = new FormData();
      form.append('image', file);
      return client.post('/upload', form);
    },
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: err => {
      setError(err.response?.data?.error || 'Upload failed');
    },
  });

  const onDrop = useCallback(accepted => {
    setError(null);
    if (accepted[0]) upload.mutate(accepted[0]);
  }, [upload]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
  });

  const rejection = fileRejections[0];
  const rejectionMsg = rejection
    ? rejection.errors[0]?.code === 'file-too-large'
      ? 'File exceeds 5MB limit'
      : rejection.errors[0]?.message || 'Invalid file'
    : null;

  return (
    <div className="upload-section">
      <div
        {...getRootProps()}
        className={`dropzone${isDragActive ? ' active' : ''}${upload.isPending ? ' uploading' : ''}`}
      >
        <input {...getInputProps()} />
        {upload.isPending
          ? <p>Uploading...</p>
          : isDragActive
          ? <p>Drop image here</p>
          : <p>Drag and drop a JPG, PNG, or WEBP image here, or click to browse (max 5MB)</p>
        }
      </div>
      {rejectionMsg && <p className="msg error">{rejectionMsg}</p>}
      {error && <p className="msg error">{error}</p>}
      {upload.isSuccess && <p className="msg success">Upload queued for processing.</p>}
    </div>
  );
}