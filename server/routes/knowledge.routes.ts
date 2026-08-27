import { Router } from 'express';
import { knowledgeController } from '../controllers/knowledge.controller';

const router = Router();

router.get('/modules', (req, res, next) => knowledgeController.listModules(req, res, next));
router.get('/modules/:id', (req, res, next) => knowledgeController.getModuleById(req, res, next));
router.get('/modules/:moduleId/lessons/:lessonId', (req, res, next) =>
  knowledgeController.getLesson(req, res, next)
);
router.get('/glossary', (req, res, next) => knowledgeController.listGlossary(req, res, next));
router.get('/glossary/:id', (req, res, next) => knowledgeController.getGlossaryTerm(req, res, next));
router.get('/search', (req, res, next) => knowledgeController.search(req, res, next));

export default router;
