import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware.js';
import { listMyContributions, confirmContributionPayment, selfConfirmContribution, updateContributionStatus, markDefaultersForCycle } from '../controllers/contribution.controller.js';

const router = Router();

router.use(authRequired);

router.get('/mine', listMyContributions);
router.post('/:contributionId/confirm', confirmContributionPayment);
router.post('/:contributionId/self-confirm', selfConfirmContribution);
router.patch('/:contributionId/status', updateContributionStatus);
router.post('/groups/:groupId/cycles/:cycleNumber/mark-defaulters', markDefaultersForCycle);

export default router;

