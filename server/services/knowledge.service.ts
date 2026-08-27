import { IKnowledgeRepository, repositoryFactory } from '../repositories';
import { KnowledgeModule, KnowledgeGlossaryTerm, KnowledgeLesson } from '../models/knowledge.model';
import { getGeminiClient } from '../ai/gemini.client';
import { AI_MODELS } from '../ai/prompts';
import { logger } from '../utils/logger.util';

export class KnowledgeService {
  constructor(private repo: IKnowledgeRepository = repositoryFactory.getKnowledgeRepository()) {}

  async listModules(language?: string): Promise<KnowledgeModule[]> {
    return this.repo.getAllModules(language);
  }

  async getModuleById(id: string): Promise<KnowledgeModule | null> {
    return this.repo.getModuleById(id);
  }

  async getModuleBySlug(slug: string): Promise<KnowledgeModule | null> {
    return this.repo.getModuleBySlug(slug);
  }

  async getLesson(moduleId: string, lessonId: string): Promise<KnowledgeLesson | null> {
    const mod = await this.repo.getModuleById(moduleId);
    if (!mod) return null;
    return mod.lessons.find((l) => l.id === lessonId || l.slug === lessonId) || null;
  }

  async listGlossary(language?: string, category?: string): Promise<KnowledgeGlossaryTerm[]> {
    return this.repo.getGlossaryTerms(language, category);
  }

  async getGlossaryTerm(id: string): Promise<KnowledgeGlossaryTerm | null> {
    return this.repo.getGlossaryTermById(id);
  }

  async search(query: string, language?: string) {
    return this.repo.searchKnowledge(query, language);
  }

  async translateLessonContent(
    lesson: KnowledgeLesson,
    targetLanguage: string
  ): Promise<{ title: string; summary: string; contentMarkdown: string; keyTakeaways: string[] }> {
    const ai = getGeminiClient();
    if (!ai) {
      // Fallback: return original
      return {
        title: lesson.title,
        summary: lesson.summary,
        contentMarkdown: lesson.contentMarkdown,
        keyTakeaways: lesson.keyTakeaways,
      };
    }

    try {
      const prompt = `Translate and culturally localize the following financial lesson into language code "${targetLanguage}".
Title: ${lesson.title}
Summary: ${lesson.summary}
Content Markdown: ${lesson.contentMarkdown}
Key Takeaways: ${JSON.stringify(lesson.keyTakeaways)}

Return a strict JSON object with fields: { "title": string, "summary": string, "contentMarkdown": string, "keyTakeaways": string[] }`;

      const response = await ai.models.generateContent({
        model: AI_MODELS.FAST,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        title: parsed.title || lesson.title,
        summary: parsed.summary || lesson.summary,
        contentMarkdown: parsed.contentMarkdown || lesson.contentMarkdown,
        keyTakeaways: parsed.keyTakeaways || lesson.keyTakeaways,
      };
    } catch (err: any) {
      logger.error('Failed to translate lesson via AI:', err.message);
      return {
        title: lesson.title,
        summary: lesson.summary,
        contentMarkdown: lesson.contentMarkdown,
        keyTakeaways: lesson.keyTakeaways,
      };
    }
  }
}

export const knowledgeService = new KnowledgeService();
