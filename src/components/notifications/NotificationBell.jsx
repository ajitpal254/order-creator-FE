import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  CircleAlert,
  CreditCard,
  FileText,
  Info,
  MessageSquare,
  Package,
  Tag,
  Truck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationKeys, notificationsApi } from '../../api/notifications';
import { formatRelativeTime } from './relativeTime';
import './notifications.css';

// Map a notification `type` to an icon. Unknown types fall back to the
// generic bell so new backend types never break the panel.
const iconForType = (type) => {
  const t = String(type || '').toLowerCase();
  if (t.includes('ship') || t.includes('deliver') || t.includes('transit')) return Truck;
  if (t.includes('order')) return Package;
  if (t.includes('invoice')) return FileText;
  if (t.includes('pay')) return CreditCard;
  if (t.includes('message') || t.includes('chat')) return MessageSquare;
  if (t.includes('promo') || t.includes('offer') || t.includes('discount')) return Tag;
  if (t.includes('alert') || t.includes('warning')) return CircleAlert;
  if (t.includes('system') || t.includes('info')) return Info;
  return Bell;
};

const itemId = (item) => item._id ?? item.id;

const PanelSkeleton = () => (
  <div className="notification-panel-status" aria-busy="true" aria-label="Loading notifications">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="notification-skeleton-row">
        <div className="skeleton-block" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div className="skeleton-block" style={{ height: '13px', width: '60%' }} />
          <div className="skeleton-block" style={{ height: '12px', width: '90%' }} />
        </div>
      </div>
    ))}
  </div>
);

export const NotificationBell = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Unread badge: polled every 30s, only while a user is logged in.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  // The list itself is only fetched when the panel is opened.
  const {
    data: notifications = [],
    isLoading: listLoading,
    isError: listError,
  } = useQuery({
    queryKey: notificationKeys.list,
    queryFn: async () => {
      const res = await notificationsApi.list({ page: 1, limit: 20 });
      return Array.isArray(res?.data) ? res.data : [];
    },
    enabled: isAuthenticated && open,
  });

  const invalidateNotifications = () => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.list });
    queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
  };

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: invalidateNotifications,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: invalidateNotifications,
  });

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open ]);

  if (!isAuthenticated) return null;

  const handleItemClick = (item) => {
    if (!item.read) {
      markReadMutation.mutate(itemId(item));
    }
    setOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  return (
    <div className="notification-bell" ref={wrapperRef}>
      <button
        type="button"
        className="btn btn-secondary btn-sm notification-bell-button"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="notification-badge" data-testid="unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="notification-panel-header">
            <span className="notification-panel-title">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {listLoading ? (
            <PanelSkeleton />
          ) : listError ? (
            <div className="notification-panel-status">
              <p className="notification-empty-title">Couldn&apos;t load notifications</p>
              <p className="notification-empty-body">Please try again in a moment.</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-panel-status">
              <Bell size={28} className="notification-empty-icon" />
              <p className="notification-empty-title">No notifications yet</p>
              <p className="notification-empty-body">
                You&apos;re all caught up — order updates will show up here.
              </p>
            </div>
          ) : (
            <ul className="notification-list">
              {notifications.map((item) => {
                const Icon = iconForType(item.type);
                const id = itemId(item);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`notification-item${item.read ? ' is-read' : ' is-unread'}`}
                      onClick={() => handleItemClick(item)}
                    >
                      <span className="notification-item-icon">
                        <Icon size={16} />
                      </span>
                      <span className="notification-item-content">
                        <span className="notification-item-top">
                          <span className="notification-item-title">{item.title}</span>
                          <span className="notification-item-time">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </span>
                        {item.body && (
                          <span className="notification-item-body">{item.body}</span>
                        )}
                      </span>
                      {!item.read && <span className="notification-unread-dot" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
