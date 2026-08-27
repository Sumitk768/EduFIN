import { Router } from 'express';
import healthRoutes from './health.routes';
import userRoutes from './user.routes';
import assessmentRoutes from './assessment.routes';
import knowledgeRoutes from './knowledge.routes';
import gapDetectionRoutes from './gap-detection.routes';
import learningPathRoutes from './learning-path.routes';
import assistantRoutes from './assistant.routes';
import questionGenRoutes from './question-gen.routes';
import simulatorRoutes from './simulator.routes';
import scamCheckerRoutes from './scam-checker.routes';
import progressRoutes from './progress.routes';

const router = Router();

// Mount System Routes
router.use('/', healthRoutes);

// Mount API v1 Core Backend Modules
const v1Router = Router();

v1Router.use('/users', userRoutes);
v1Router.use('/assessment', assessmentRoutes);
v1Router.use('/knowledge', knowledgeRoutes);
v1Router.use('/gaps', gapDetectionRoutes);
v1Router.use('/learning-path', learningPathRoutes);
v1Router.use('/assistant', assistantRoutes);
v1Router.use('/question-gen', questionGenRoutes);
v1Router.use('/simulators', simulatorRoutes);
v1Router.use('/scam-checker', scamCheckerRoutes);
v1Router.use('/progress', progressRoutes);

router.use('/v1', v1Router);

export default router;
