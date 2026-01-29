import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import type { NotificationType } from '../types/index.js';

interface CreateNotificationData {
  recipient: string;
  type: NotificationType;
  fromWallet?: string;
  postId?: string;
  commentId?: string;
  amount?: number;
}

export const notificationService = {
  async create(data: CreateNotificationData) {
    const { error, data: row } = await supabase
      .from('notifications')
      .insert({
        recipient: data.recipient,
        type: data.type,
        from_wallet: data.fromWallet ?? null,
        post_id: data.postId ?? null,
        comment_id: data.commentId ?? null,
        amount: data.amount ?? null,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, data }, 'Failed to create notification');
      throw error;
    }

    return row;
  },

  async getByRecipient(
    wallet: string,
    opts: { limit: number; cursor?: string; type?: NotificationType; unread?: boolean }
  ) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient', wallet)
      .order('created_at', { ascending: false })
      .limit(opts.limit + 1); // fetch one extra to determine nextCursor

    if (opts.cursor) {
      query = query.lt('created_at', opts.cursor);
    }

    if (opts.type) {
      query = query.eq('type', opts.type);
    }

    if (opts.unread) {
      query = query.eq('read', false);
    }

    const { data: rows, error } = await query;

    if (error) {
      logger.error({ error, wallet }, 'Failed to fetch notifications');
      throw error;
    }

    const hasMore = rows && rows.length > opts.limit;
    const notifications = hasMore ? rows.slice(0, opts.limit) : (rows ?? []);
    const nextCursor = hasMore ? notifications[notifications.length - 1].created_at : null;

    return { notifications, nextCursor };
  },

  async getUnreadCount(wallet: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient', wallet)
      .eq('read', false);

    if (error) {
      logger.error({ error, wallet }, 'Failed to get unread count');
      throw error;
    }

    return count ?? 0;
  },

  async markAsRead(id: string, wallet: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('recipient', wallet)
      .select()
      .single();

    if (error) {
      logger.error({ error, id, wallet }, 'Failed to mark notification as read');
      return false;
    }

    return !!data;
  },

  async markAllAsRead(wallet: string): Promise<number> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient', wallet)
      .eq('read', false)
      .select();

    if (error) {
      logger.error({ error, wallet }, 'Failed to mark all notifications as read');
      throw error;
    }

    return data?.length ?? 0;
  },
};
