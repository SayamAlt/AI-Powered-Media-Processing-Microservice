import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export default function NotificationBadge() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => client.get('/notifications').then(r => r.data),
    refetchInterval: 15000,
  });

  const markAllRead = useMutation({
    mutationFn: () => client.put('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  return (
    <div className="notif-wrapper">
      <button className="notif-trigger" onClick={() => setOpen(v => !v)} aria-label="Notifications">
        <span className="bell-icon">&#128276;</span>
        {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span>Notifications</span>
            {unread > 0 && (
              <button className="btn-link small" onClick={() => markAllRead.mutate()}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 && <p className="notif-empty">No notifications</p>}
          {notifications.map(n => (
            <div key={n._id} className={`notif-item${!n.read ? ' unread' : ''}`}>
              <p className="notif-msg">{n.message}</p>
              <small className="notif-time">{new Date(n.createdAt).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}