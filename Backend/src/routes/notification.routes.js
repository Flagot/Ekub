import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware.js';
import { listMyNotifications, markNotificationRead, markAllNotificationsRead } from '../controllers/notification.controller.js';

const router = Router();

router.use(authRequired);

router.get('/', listMyNotifications);
router.post('/read-all', markAllNotificationsRead);
router.post('/:notificationId/read', markNotificationRead);

export default router;

