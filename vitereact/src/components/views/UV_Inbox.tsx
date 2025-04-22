import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector, fetch_unread_count,
         increment_unread, decrement_unread, set_unread_count } from '@/store/main';

type NotificationItem = {
  id: string;
  type: 'assignment' | 'comment' | 'subtask_assignment';
  task_id: string;
  comment_id: string | null;
  triggered_by: string;
  is_read: boolean;
  created_at: string;
};

const UV_Inbox: React.FC = () => {
  const dispatch = useAppDispatch();
  const token = useAppSelector(s => s.auth.token);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch notifications list & unread count on mount
  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    // global badge count
    dispatch(fetch_unread_count());
    // fetch full list
    axios
      .get<NotificationItem[]>('/api/notifications')
      .then(resp => {
        // sort newest first
        const sorted = resp.data.slice().sort((a,b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setNotifications(sorted);
      })
      .catch(err => {
        setErrorMessage(err?.message || 'Failed to load notifications');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [dispatch]);

  // Real-time subscription
  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(import.meta.env.VITE_API_BASE_URL, {
      auth: { token }
    });
    // New notification arrives
    socket.on('notification_created', (payload: NotificationItem) => {
      setNotifications(prev => [payload, ...prev]);
      dispatch(increment_unread());
    });
    // Notification mark-read/unread or all-read
    socket.on('notification_updated', (payload: {
      notification_id: string;
      is_read: boolean;
      all_read?: boolean;
    }) => {
      const { notification_id, is_read, all_read } = payload;
      if (all_read) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
        dispatch(set_unread_count(0));
      } else {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification_id ? { ...n, is_read } : n
          )
        );
        if (is_read) dispatch(decrement_unread());
        else dispatch(increment_unread());
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [dispatch, token]);

  // Handlers
  const handleMarkAllRead = async () => {
    try {
      await axios.post('/api/notifications/mark_all_read');
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      dispatch(set_unread_count(0));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to mark all read');
    }
  };

  const handleClearAll = () => {
    setNotifications([]);
    dispatch(set_unread_count(0));
  };

  const handleToggleRead = async (id: string, currentlyRead: boolean) => {
    try {
      await axios.patch(`/api/notifications/${id}`, {
        is_read: !currentlyRead
      });
      setNotifications(prev =>
        prev.map(n =>
          n.id === id ? { ...n, is_read: !currentlyRead } : n
        )
      );
      if (currentlyRead) dispatch(increment_unread());
      else dispatch(decrement_unread());
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update notification');
    }
  };

  // Helper to render icon and summary
  const renderSummary = (n: NotificationItem) => {
    switch (n.type) {
      case 'assignment':
        return `${n.triggered_by} assigned you to a task`;
      case 'comment':
        return `${n.triggered_by} commented on your task`;
      case 'subtask_assignment':
        return `${n.triggered_by} assigned you to a subtask`;
      default:
        return 'Notification';
    }
  };

  const renderIcon = (type: string) => {
    if (type === 'assignment') return '👤';
    if (type === 'comment') return '💬';
    if (type === 'subtask_assignment') return '📋';
    return '🔔';
  };

  return (
    <>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Inbox</h1>
          <div>
            <button
              onClick={handleMarkAllRead}
              disabled={notifications.every(n => n.is_read)}
              className="bg-blue-600 disabled:bg-blue-300 text-white px-3 py-1 rounded"
            >
              Mark All Read
            </button>
            <button
              onClick={handleClearAll}
              disabled={notifications.length === 0}
              className="ml-2 bg-gray-600 disabled:bg-gray-300 text-white px-3 py-1 rounded"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="bg-white rounded shadow divide-y">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              Loading notifications…
            </div>
          ) : errorMessage ? (
            <div className="p-4 text-center text-red-500">
              {errorMessage}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications
            </div>
          ) : (
            notifications.map(n => {
              const time = new Date(n.created_at).toLocaleString();
              const summary = renderSummary(n);
              const icon = renderIcon(n.type);
              return (
                <div
                  key={n.id}
                  className={
                    `flex items-start justify-between p-4 hover:bg-gray-50 ` +
                    `${!n.is_read ? 'bg-gray-100' : ''}`
                  }
                >
                  <div className="flex-1">
                    <Link
                      to={`/tasks/${n.task_id}`}
                      className="inline-flex items-center space-x-2"
                    >
                      <span className="text-lg">{icon}</span>
                      <span className="font-medium text-blue-600 hover:underline">
                        {summary}
                      </span>
                    </Link>
                    <div className="text-sm text-gray-500 mt-1">
                      {time}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleRead(n.id, n.is_read)}
                    className="ml-4 text-sm text-blue-600 hover:underline"
                  >
                    {n.is_read ? 'Mark Unread' : 'Mark Read'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default UV_Inbox;