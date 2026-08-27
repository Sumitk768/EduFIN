import { eq, ilike, or, and, asc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { IKnowledgeRepository } from './knowledge.repository';
import { KnowledgeModule, KnowledgeGlossaryTerm, KnowledgeLesson } from '../models/knowledge.model';
import { db as defaultDb } from '../db/index';
import * as schema from '../db/schema';
import { logger } from '../utils/logger.util';

export class PostgresKnowledgeRepository implements IKnowledgeRepository {
  constructor(private db: NodePgDatabase<typeof schema> = defaultDb) {}

  async getAllModules(language?: string): Promise<KnowledgeModule[]> {
    try {
      let moduleQuery = this.db.select().from(schema.financialModules);
      if (language) {
        // Try filtering by language, fallback if none found
        const filtered = await this.db
          .select()
          .from(schema.financialModules)
          .where(eq(schema.financialModules.language, language));

        if (filtered.length > 0) {
          return this.attachLessonsToModules(filtered);
        }
      }

      const allModules = await moduleQuery;
      return this.attachLessonsToModules(allModules);
    } catch (err: any) {
      logger.error('PostgresKnowledgeRepository.getAllModules error:', err.message);
      throw new Error(`Failed to list knowledge modules: ${err.message}`, { cause: err });
    }
  }

  async getModuleById(id: string): Promise<KnowledgeModule | null> {
    try {
      const rows = await this.db
        .select()
        .from(schema.financialModules)
        .where(eq(schema.financialModules.id, id))
        .limit(1);

      if (rows.length === 0) return null;
      const modules = await this.attachLessonsToModules(rows);
      return modules[0] || null;
    } catch (err: any) {
      logger.error(`PostgresKnowledgeRepository.getModuleById error for id ${id}:`, err.message);
      throw new Error(`Failed to get module by ID: ${err.message}`, { cause: err });
    }
  }

  async getModuleBySlug(slug: string): Promise<KnowledgeModule | null> {
    try {
      const rows = await this.db
        .select()
        .from(schema.financialModules)
        .where(eq(schema.financialModules.slug, slug))
        .limit(1);

      if (rows.length === 0) return null;
      const modules = await this.attachLessonsToModules(rows);
      return modules[0] || null;
    } catch (err: any) {
      logger.error(`PostgresKnowledgeRepository.getModuleBySlug error for slug ${slug}:`, err.message);
      throw new Error(`Failed to get module by slug: ${err.message}`, { cause: err });
    }
  }

  async getGlossaryTerms(language?: string, category?: string): Promise<KnowledgeGlossaryTerm[]> {
    try {
      const conditions = [];

      if (language) {
        conditions.push(or(eq(schema.glossaryTerms.language, language), eq(schema.glossaryTerms.language, 'en')));
      }

      if (category) {
        conditions.push(eq(schema.glossaryTerms.category, category));
      }

      let query = this.db.select().from(schema.glossaryTerms);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const rows = await query;
      return rows.map((r) => this.mapGlossaryToDomain(r));
    } catch (err: any) {
      logger.error('PostgresKnowledgeRepository.getGlossaryTerms error:', err.message);
      throw new Error(`Failed to list glossary terms: ${err.message}`, { cause: err });
    }
  }

  async getGlossaryTermById(id: string): Promise<KnowledgeGlossaryTerm | null> {
    try {
      const rows = await this.db
        .select()
        .from(schema.glossaryTerms)
        .where(eq(schema.glossaryTerms.id, id))
        .limit(1);

      if (rows.length === 0) return null;
      return this.mapGlossaryToDomain(rows[0]);
    } catch (err: any) {
      logger.error(`PostgresKnowledgeRepository.getGlossaryTermById error for id ${id}:`, err.message);
      throw new Error(`Failed to get glossary term: ${err.message}`, { cause: err });
    }
  }

  async searchKnowledge(
    query: string,
    language: string = 'en'
  ): Promise<{ modules: KnowledgeModule[]; glossary: KnowledgeGlossaryTerm[] }> {
    try {
      const q = `%${query.trim().toLowerCase()}%`;

      // Search modules and lessons
      const allModules = await this.getAllModules(language);
      const queryLower = query.toLowerCase();

      const matchedModules = allModules.filter((m) => {
        const titleMatch = m.title.toLowerCase().includes(queryLower);
        const descMatch = m.description.toLowerCase().includes(queryLower);
        const lessonMatch = m.lessons.some(
          (l) => l.title.toLowerCase().includes(queryLower) || l.summary.toLowerCase().includes(queryLower)
        );
        return titleMatch || descMatch || lessonMatch;
      });

      // Search glossary terms
      const allGlossary = await this.getGlossaryTerms(language);
      const matchedGlossary = allGlossary.filter((g) => {
        return (
          g.term.toLowerCase().includes(queryLower) ||
          g.definition.toLowerCase().includes(queryLower) ||
          g.simpleAnalogy.toLowerCase().includes(queryLower)
        );
      });

      return {
        modules: matchedModules,
        glossary: matchedGlossary,
      };
    } catch (err: any) {
      logger.error('PostgresKnowledgeRepository.searchKnowledge error:', err.message);
      throw new Error(`Failed to search knowledge base: ${err.message}`, { cause: err });
    }
  }

  private async attachLessonsToModules(
    moduleRows: (typeof schema.financialModules.$inferSelect)[]
  ): Promise<KnowledgeModule[]> {
    if (moduleRows.length === 0) return [];

    const moduleIds = moduleRows.map((m) => m.id);
    const lessonRows = await this.db
      .select()
      .from(schema.lessons)
      .orderBy(asc(schema.lessons.order));

    const lessonsByModule = new Map<string, KnowledgeLesson[]>();
    for (const l of lessonRows) {
      const list = lessonsByModule.get(l.moduleId) || [];
      list.push(this.mapLessonToDomain(l));
      lessonsByModule.set(l.moduleId, list);
    }

    return moduleRows.map((m) => {
      const lessons = lessonsByModule.get(m.id) || [];
      const totalLessons = lessons.length || m.totalLessons;
      const estimatedTotalMinutes = lessons.reduce((acc, l) => acc + l.estimatedMinutes, 0) || m.estimatedTotalMinutes;

      return {
        id: m.id,
        slug: m.slug,
        category: m.category as any,
        level: m.level as any,
        title: m.title,
        description: m.description,
        iconName: m.iconName,
        language: m.language,
        lessons,
        totalLessons,
        estimatedTotalMinutes,
      };
    });
  }

  private mapLessonToDomain(row: typeof schema.lessons.$inferSelect): KnowledgeLesson {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      estimatedMinutes: row.estimatedMinutes,
      order: row.order,
      summary: row.summary,
      contentMarkdown: row.contentMarkdown,
      keyTakeaways: Array.isArray(row.keyTakeaways) ? row.keyTakeaways : [],
      actionableTip: row.actionableTip,
      glossaryTerms: Array.isArray(row.glossaryTerms) ? row.glossaryTerms : [],
    };
  }

  private mapGlossaryToDomain(row: typeof schema.glossaryTerms.$inferSelect): KnowledgeGlossaryTerm {
    return {
      id: row.id,
      term: row.term,
      category: row.category as any,
      definition: row.definition,
      simpleAnalogy: row.simpleAnalogy,
      example: row.example,
      language: row.language,
    };
  }
}
