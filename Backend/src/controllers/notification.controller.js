import { Notification } from '../models/notification.model.js';

export async function listMyNotifications(req, res) {
  try {
    const userId = req.user.sub;
    const notifications = await Notification.find({ user: userId })
      .populate('group', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json(notifications);
  } catch (err) {
    console.error('ListMyNotifications error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const userId = req.user.sub;
    const { notificationId } = req.params;

    const notification = await Notification.findOne({ _id: notificationId, user: userId });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    return res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    console.error('MarkNotificationRead error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    const userId = req.user.sub;
    await Notification.updateMany({ user: userId, isRead: false }, { $set: { isRead: true } });
    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('MarkAllNotificationsRead error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

