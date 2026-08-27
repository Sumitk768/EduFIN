import { Request, Response, NextFunction } from 'express';
import { knowledgeService } from '../services/knowledge.service';
import { sendSuccess, sendError } from '../utils/response.util';

export class KnowledgeController {
  async listModules(req: Request, res: Response, next: NextFunction) {
    try {
      const language = (req.query.language as string) || 'en';
      const modules = await knowledgeService.listModules(language);
      return sendSuccess(res, modules, 'Financial knowledge modules retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getModuleById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const mod = await knowledgeService.getModuleById(id);
      if (!mod) {
        return sendError(res, 'MODULE_NOT_FOUND', `Module with ID ${id} was not found.`, 404);
      }
      return sendSuccess(res, mod, 'Module retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const { moduleId, lessonId } = req.params;
      const targetLanguage = req.query.language as string | undefined;

      const lesson = await knowledgeService.getLesson(moduleId, lessonId);
      if (!lesson) {
        return sendError(res, 'LESSON_NOT_FOUND', `Lesson ${lessonId} not found in module ${moduleId}.`, 404);
      }

      if (targetLanguage && targetLanguage !== 'en') {
        const translated = await knowledgeService.translateLessonContent(lesson, targetLanguage);
        return sendSuccess(
          res,
          { ...lesson, ...translated, language: targetLanguage },
          `Lesson localized into ${targetLanguage}`
        );
      }

      return sendSuccess(res, lesson, 'Lesson retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async listGlossary(req: Request, res: Response, next: NextFunction) {
    try {
      const language = req.query.language as string | undefined;
      const category = req.query.category as string | undefined;
      const terms = await knowledgeService.listGlossary(language, category);
      return sendSuccess(res, terms, 'Glossary terms retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getGlossaryTerm(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const term = await knowledgeService.getGlossaryTerm(id);
      if (!term) {
        return sendError(res, 'TERM_NOT_FOUND', `Glossary term ${id} was not found.`, 404);
      }
      return sendSuccess(res, term, 'Glossary term retrieved');
    } catch (err) {
      next(err);
    }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || '';
      const language = (req.query.language as string) || 'en';

      if (!q.trim()) {
        return sendError(res, 'EMPTY_QUERY', 'Search query parameter "q" is required.', 400);
      }

      const results = await knowledgeService.search(q, language);
      return sendSuccess(res, results, `Search results for "${q}"`);
    } catch (err) {
      next(err);
    }
  }
}

export const knowledgeController = new KnowledgeController();
