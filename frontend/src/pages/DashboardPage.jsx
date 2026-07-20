import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import UploadForm from '../components/UploadForm';
import JobCard from '../components/JobCard';
import { usePolling } from '../hooks/usePolling';
import client from '../api/client';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => client.get('/jobs').then(r => r.data),
  });

  const jobs = data?.jobs || [];
  const hasActive = jobs.some(j => j.status === 'pending' || j.status === 'processing');
  usePolling(['jobs'], hasActive, 3000);

  const flagged = jobs.filter(j => j.flagged);
  const normal = jobs.filter(j => !j.flagged);

  return (
    <Layout>
      <div className="dashboard">
        <section className="section">
          <h2>Upload Image</h2>
          <UploadForm />
        </section>
        <section className="section">
          <h2>Your Jobs</h2>
          {isLoading && <p className="loading-text">Loading...</p>}
          {!isLoading && jobs.length === 0 && (
            <p className="empty-text">No uploads yet. Upload your first image above.</p>
          )}
          {flagged.length > 0 && (
            <div className="job-group">
              <h3 className="group-label flagged-label">Flagged</h3>
              {flagged.map(j => <JobCard key={j._id} job={j} />)}
            </div>
          )}
          {normal.length > 0 && (
            <div className="job-group">
              {flagged.length > 0 && <h3 className="group-label">All Jobs</h3>}
              {normal.map(j => <JobCard key={j._id} job={j} />)}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}