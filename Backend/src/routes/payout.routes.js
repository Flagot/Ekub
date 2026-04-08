import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware.js';
import { executePayoutForCurrentCycle, listPayoutsForGroup, chooseRandomWinner, payWinnerForCycle } from '../controllers/payout.controller.js';

const router = Router();

router.use(authRequired);

router.post('/groups/:groupId/choose-winner', chooseRandomWinner);
router.post('/groups/:groupId/execute-current', executePayoutForCurrentCycle);
router.post('/groups/:groupId/cycles/:cycleNumber/pay-winner', payWinnerForCycle);
router.get('/groups/:groupId', listPayoutsForGroup);

export default router;

