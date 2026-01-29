import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { notificationService } from '../services/notification.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const notificationController = {
  async list(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { limit, cursor, type, unread } = req.query as unknown as {
      limit: number;
      cursor?: string;
      type?: string;
      unread?: boolean;
    };

    const result = await notificationService.getByRecipient(wallet, {
      limit: limit ?? 20,
      cursor,
      type: type as any,
      unread,
    });

    res.json({
      success: true,
      data: {
        notifications: result.notifications,
        nextCursor: result.nextCursor,
      },
    });
  },

  async unreadCount(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const count = await notificationService.getUnreadCount(wallet);

    res.json({ success: true, data: { count } });
  },

  async markRead(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { id } = req.params;

    const updated = await notificationService.markAsRead(id, wallet);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Notification not found');
    }

    res.json({ success: true, data: { id, read: true } });
  },

  async markAllRead(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const count = await notificationService.markAllAsRead(wallet);

    res.json({ success: true, data: { markedRead: count } });
  },
};
