import { KnowledgeModule, KnowledgeGlossaryTerm } from '../models/knowledge.model';
import { INITIAL_KNOWLEDGE_MODULES, INITIAL_GLOSSARY_TERMS } from '../data/initial-knowledge';

export interface IKnowledgeRepository {
  getAllModules(language?: string): Promise<KnowledgeModule[]>;
  getModuleById(id: string): Promise<KnowledgeModule | null>;
  getModuleBySlug(slug: string): Promise<KnowledgeModule | null>;
  getGlossaryTerms(language?: string, category?: string): Promise<KnowledgeGlossaryTerm[]>;
  getGlossaryTermById(id: string): Promise<KnowledgeGlossaryTerm | null>;
  searchKnowledge(query: string, language?: string): Promise<{ modules: KnowledgeModule[]; glossary: KnowledgeGlossaryTerm[] }>;
}

class InMemoryKnowledgeRepository implements IKnowledgeRepository {
  private modules: KnowledgeModule[] = [...INITIAL_KNOWLEDGE_MODULES];
  private glossary: KnowledgeGlossaryTerm[] = [...INITIAL_GLOSSARY_TERMS];

  async getAllModules(language?: string): Promise<KnowledgeModule[]> {
    if (language) {
      const filtered = this.modules.filter((m) => m.language === language);
      if (filtered.length > 0) return filtered;
    }
    return this.modules;
  }

  async getModuleById(id: string): Promise<KnowledgeModule | null> {
    return this.modules.find((m) => m.id === id) || null;
  }

  async getModuleBySlug(slug: string): Promise<KnowledgeModule | null> {
    return this.modules.find((m) => m.slug === slug) || null;
  }

  async getGlossaryTerms(language?: string, category?: string): Promise<KnowledgeGlossaryTerm[]> {
    let results = this.glossary;
    if (language) {
      results = results.filter((g) => g.language === language || g.language === 'en');
    }
    if (category) {
      results = results.filter((g) => g.category === category);
    }
    return results;
  }

  async getGlossaryTermById(id: string): Promise<KnowledgeGlossaryTerm | null> {
    return this.glossary.find((g) => g.id === id) || null;
  }

  async searchKnowledge(query: string, language: string = 'en'): Promise<{ modules: KnowledgeModule[]; glossary: KnowledgeGlossaryTerm[] }> {
    const q = query.toLowerCase();

    const matchedModules = this.modules.filter((m) => {
      const titleMatch = m.title.toLowerCase().includes(q);
      const descMatch = m.description.toLowerCase().includes(q);
      const lessonMatch = m.lessons.some((l) => l.title.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q));
      return titleMatch || descMatch || lessonMatch;
    });

    const matchedGlossary = this.glossary.filter((g) => {
      return (
        g.term.toLowerCase().includes(q) ||
        g.definition.toLowerCase().includes(q) ||
        g.simpleAnalogy.toLowerCase().includes(q)
      );
    });

    return { modules: matchedModules, glossary: matchedGlossary };
  }
}

export const knowledgeRepository = new InMemoryKnowledgeRepository();
