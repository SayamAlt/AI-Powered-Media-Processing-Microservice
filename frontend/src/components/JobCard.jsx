import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
  failed: '#ef4444',
};

export default function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job._id}`} className={`job-card${job.flagged ? ' flagged' : ''}`}>
      <div className="job-card-thumb">
        {job.imageUrl && (
          <img src={job.imageUrl} alt={job.originalName} loading="lazy" />
        )}
      </div>
      <div className="job-card-body">
        <div className="job-card-row">
          <span className="job-name">{job.originalName}</span>
          {job.flagged && <span className="flag-pill">Flagged</span>}
        </div>
        <span className="job-status" style={{ color: STATUS_COLORS[job.status] }}>
          {job.status}
        </span>
        {job.caption && <p className="job-preview-caption">{job.caption}</p>}
        <small className="job-date">{new Date(job.createdAt).toLocaleString()}</small>
      </div>
    </Link>
  );
}