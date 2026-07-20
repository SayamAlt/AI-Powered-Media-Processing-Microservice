import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { usePolling } from '../hooks/usePolling';
import client from '../api/client';

const STATUS_COLORS = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
  failed: '#ef4444',
};

export default function JobDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  const { data: job, isLoading, error: fetchError } = useQuery({
    queryKey: ['job', id],
    queryFn: () => client.get(`/jobs/${id}`).then(r => r.data),
  });

  const isActive = job?.status === 'pending' || job?.status === 'processing';
  usePolling(['job', id], isActive, 3000);

  const retry = useMutation({
    mutationFn: () => client.post(`/jobs/${id}/retry`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  if (isLoading) {
    return <Layout><p className="loading-text">Loading job...</p></Layout>;
  }

  if (fetchError || !job) {
    return <Layout><p className="msg error">Job not found.</p></Layout>;
  }

  return (
    <Layout>
      <div className="job-detail">
        <Link to="/" className="back-link">Back to Dashboard</Link>
        <h2>Job Detail</h2>
        {job.flagged && (
          <div className="flagged-banner">
            Content flagged: {job.flaggedCategories?.join(', ')}
          </div>
        )}
        <div className="detail-grid">
          <div className="detail-image-col">
            {job.imageUrl && (
              <img className="detail-image" src={job.imageUrl} alt={job.originalName} />
            )}
          </div>
          <div className="detail-info-col">
            <div className="info-row">
              <span className="info-label">File</span>
              <span>{job.originalName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span style={{ color: STATUS_COLORS[job.status], fontWeight: 600 }}>{job.status}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Submitted</span>
              <span>{new Date(job.createdAt).toLocaleString()}</span>
            </div>
            {job.status === 'processing' && (
              <p className="processing-msg">Processing your image through the AI pipeline...</p>
            )}
            {job.status === 'failed' && (
              <div className="failed-section">
                <p className="msg error">Error: {job.error || 'Unknown error'}</p>
                <button
                  className="btn-retry"
                  onClick={() => retry.mutate()}
                  disabled={retry.isPending}
                >
                  {retry.isPending ? 'Retrying...' : 'Retry Job'}
                </button>
              </div>
            )}
            {job.caption && (
              <div className="result-block">
                <h3>Caption</h3>
                <p className="caption-text">{job.caption}</p>
              </div>
            )}
            {job.labels && job.labels.length > 0 && (
              <div className="result-block">
                <h3>Detected Labels</h3>
                <ul className="label-list">
                  {job.labels.map((l, i) => (
                    <li key={i} className="label-item">
                      <span>{l.description}</span>
                      <span className="label-score">{(l.score * 100).toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {job.safetyResult && (
              <div className="result-block">
                <h3>Safety Check</h3>
                <table className="safety-table">
                  <tbody>
                    {Object.entries(job.safetyResult).map(([cat, val]) => (
                      <tr key={cat} className={['LIKELY', 'VERY_LIKELY'].includes(val) ? 'flagged-row' : ''}>
                        <td className="safety-cat">{cat}</td>
                        <td className="safety-val">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}