import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db as defaultDb } from './index';
import * as schema from './schema';
import { INITIAL_KNOWLEDGE_MODULES, INITIAL_GLOSSARY_TERMS } from '../data/initial-knowledge';
import { INITIAL_ASSESSMENT_QUESTIONS } from '../data/initial-assessments';
import { logger } from '../utils/logger.util';
import bcrypt from 'bcryptjs';

export async function seedDatabase(db: NodePgDatabase<typeof schema> = defaultDb) {
  logger.info('Starting EduFIN database seeding...');

  // 1. Seed Demo User
  const demoUserId = '00000000-0000-0000-0000-000000000001';
  const demoPasswordHash = bcrypt.hashSync('Priya@EduFin2026', 8);
  await db
    .insert(schema.users)
    .values({
      id: demoUserId,
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      passwordHash: demoPasswordHash,
      preferredLanguage: 'hi',
      literacyLevel: 'beginner',
      monthlyIncomeCurrency: 'INR',
      estimatedMonthlyIncome: 45000,
      primaryFinancialGoal: 'Building emergency savings and learning compound growth',
      completedAssessment: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.users.id,
      set: {
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        passwordHash: demoPasswordHash,
        preferredLanguage: 'hi',
        literacyLevel: 'beginner',
        monthlyIncomeCurrency: 'INR',
        estimatedMonthlyIncome: 45000,
        primaryFinancialGoal: 'Building emergency savings and learning compound growth',
        updatedAt: new Date(),
      },
    });
  logger.info('Seeded/verified default demo user (Priya Sharma).');

  // 2. Seed Financial Modules and Lessons
  let moduleCount = 0;
  let lessonCount = 0;

  for (const mod of INITIAL_KNOWLEDGE_MODULES) {
    await db
      .insert(schema.financialModules)
      .values({
        id: mod.id,
        slug: mod.slug,
        category: mod.category,
        level: mod.level,
        title: mod.title,
        description: mod.description,
        iconName: mod.iconName,
        language: mod.language || 'en',
        totalLessons: mod.totalLessons,
        estimatedTotalMinutes: mod.estimatedTotalMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.financialModules.id,
        set: {
          slug: mod.slug,
          category: mod.category,
          level: mod.level,
          title: mod.title,
          description: mod.description,
          iconName: mod.iconName,
          language: mod.language || 'en',
          totalLessons: mod.totalLessons,
          estimatedTotalMinutes: mod.estimatedTotalMinutes,
          updatedAt: new Date(),
        },
      });
    moduleCount++;

    for (const les of mod.lessons) {
      await db
        .insert(schema.lessons)
        .values({
          id: les.id,
          moduleId: mod.id,
          slug: les.slug,
          title: les.title,
          estimatedMinutes: les.estimatedMinutes,
          order: les.order,
          summary: les.summary,
          contentMarkdown: les.contentMarkdown,
          keyTakeaways: les.keyTakeaways,
          actionableTip: les.actionableTip,
          glossaryTerms: les.glossaryTerms,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.lessons.id,
          set: {
            moduleId: mod.id,
            slug: les.slug,
            title: les.title,
            estimatedMinutes: les.estimatedMinutes,
            order: les.order,
            summary: les.summary,
            contentMarkdown: les.contentMarkdown,
            keyTakeaways: les.keyTakeaways,
            actionableTip: les.actionableTip,
            glossaryTerms: les.glossaryTerms,
            updatedAt: new Date(),
          },
        });
      lessonCount++;
    }
  }
  logger.info(`Seeded/verified ${moduleCount} financial modules and ${lessonCount} lessons.`);

  // 3. Seed Glossary Terms
  let glossaryCount = 0;
  for (const term of INITIAL_GLOSSARY_TERMS) {
    await db
      .insert(schema.glossaryTerms)
      .values({
        id: term.id,
        term: term.term,
        category: term.category,
        definition: term.definition,
        simpleAnalogy: term.simpleAnalogy,
        example: term.example,
        language: term.language || 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.glossaryTerms.id,
        set: {
          term: term.term,
          category: term.category,
          definition: term.definition,
          simpleAnalogy: term.simpleAnalogy,
          example: term.example,
          language: term.language || 'en',
          updatedAt: new Date(),
        },
      });
    glossaryCount++;
  }
  logger.info(`Seeded/verified ${glossaryCount} glossary terms.`);

  // 4. Seed Assessment Questions
  let questionCount = 0;
  for (const q of INITIAL_ASSESSMENT_QUESTIONS) {
    await db
      .insert(schema.assessmentQuestions)
      .values({
        id: q.id,
        category: q.category,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        explanation: q.explanation,
        correctOptionId: q.correctOptionId,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.assessmentQuestions.id,
        set: {
          category: q.category,
          difficulty: q.difficulty,
          question: q.question,
          options: q.options,
          explanation: q.explanation,
          correctOptionId: q.correctOptionId,
        },
      });
    questionCount++;
  }
  logger.info(`Seeded/verified ${questionCount} assessment questions.`);

  return {
    usersSeeded: 1,
    modulesSeeded: moduleCount,
    lessonsSeeded: lessonCount,
    glossarySeeded: glossaryCount,
    questionsSeeded: questionCount,
  };
}

// Allow direct execution via CLI
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then((summary) => {
      logger.info('Database seed finished successfully:', summary);
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Database seed error:', err);
      process.exit(1);
    });
}
