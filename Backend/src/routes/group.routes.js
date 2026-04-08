import { Router } from 'express';
import { authRequired } from '../middleware/auth.middleware.js';
import {
  createGroup,
  listMyGroups,
  listPublicGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  requestToJoinGroup,
  withdrawJoinRequest,
  approveMember,
  rejectMember,
  setPayoutOrder,
  getDashboard,
  getGroupSchedule,
  getGroupPaymentTracking,
  getMemberCycleData,
  getGroupMyContributions,
  getGroupWinners,
} from '../controllers/group.controller.js';

const router = Router();

router.use(authRequired);

router.get('/dashboard', getDashboard);
router.get('/mine', listMyGroups);
router.get('/public', listPublicGroups);
router.post('/', createGroup);
router.get('/:groupId', getGroup);
router.patch('/:groupId', updateGroup);
router.delete('/:groupId', deleteGroup);
router.post('/:groupId/members', addMember);
router.delete('/:groupId/members/:memberId', removeMember);
router.get('/:groupId/schedule', getGroupSchedule);
router.get('/:groupId/payment-tracking', getGroupPaymentTracking);
router.get('/:groupId/cycles/:cycleNumber/members/:userId', getMemberCycleData);
router.get('/:groupId/my-contributions', getGroupMyContributions);
router.get('/:groupId/winners', getGroupWinners);
router.post('/:groupId/join', requestToJoinGroup);
router.post('/:groupId/withdraw-request', withdrawJoinRequest);
router.post('/:groupId/members/:memberId/approve', approveMember);
router.post('/:groupId/members/:memberId/reject', rejectMember);
router.post('/:groupId/payout-order', setPayoutOrder);

export default router;

