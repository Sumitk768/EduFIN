import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../server/db/schema';
import { seedDatabase } from '../server/db/seed';
import { PostgresUserRepository } from '../server/repositories/postgres-user.repository';
import { PostgresKnowledgeRepository } from '../server/repositories/postgres-knowledge.repository';
import { PostgresAssessmentRepository } from '../server/repositories/postgres-assessment.repository';
import { PostgresGapDetectionRepository } from '../server/repositories/postgres-gap-detection.repository';
import { PostgresLearningPathRepository } from '../server/repositories/postgres-learning-path.repository';
import { PostgresProgressRepository } from '../server/repositories/postgres-progress.repository';
import { UserService } from '../server/services/user.service';
import { KnowledgeService } from '../server/services/knowledge.service';
import { AssessmentService } from '../server/services/assessment.service';
import { GapDetectionService } from '../server/services/gap-detection.service';
import { LearningPathService } from '../server/services/learning-path.service';
import { ProgressService } from '../server/services/progress.service';
import { checkDatabaseConnection } from '../server/db/index';

describe('EduFIN PostgreSQL & Drizzle ORM Persistence Tests', () => {
  let memDb: any;
  let pool: any;
  let testDb: any;

  before(async () => {
    // Initialize in-memory PostgreSQL instance for exact dialect & constraint testing
    memDb = newDb();
    memDb.public.registerFunction({
      name: 'current_database',
      args: [],
      returns: memDb.public.getType('text'),
      implementation: () => 'edufin_test',
    });
    memDb.public.registerFunction({
      name: 'version',
      args: [],
      returns: memDb.public.getType('text'),
      implementation: () => 'PostgreSQL 16.0 (pg-mem)',
    });

    const pgAdapter = memDb.adapters.createPg();
    pool = new pgAdapter.Pool();

    // Wrap pool.query to handle pg-mem differences with Drizzle ORM
    const originalQuery = pool.query.bind(pool);
    pool.query = async function (text: any, params: any, callback: any) {
      if (typeof text === 'object' && text !== null) {
        const isArrayMode = text.rowMode === 'array';
        const { types, rowMode, ...rest } = text;

        const res = await originalQuery(rest, params);
        if (isArrayMode && res && Array.isArray(res.rows)) {
          res.rows = res.rows.map((row: any) => Object.values(row));
        }
        if (callback) callback(null, res);
        return res;
      }
      return originalQuery(text, params, callback);
    } as any;

    testDb = drizzle(pool, { schema });

    // Execute Schema DDL
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        preferred_language text NOT NULL DEFAULT 'en',
        literacy_level text NOT NULL DEFAULT 'beginner',
        monthly_income_currency text NOT NULL DEFAULT 'USD',
        estimated_monthly_income double precision,
        primary_financial_goal text,
        completed_assessment boolean NOT NULL DEFAULT false,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS financial_modules (
        id text PRIMARY KEY,
        slug text NOT NULL UNIQUE,
        category text NOT NULL,
        level text NOT NULL DEFAULT 'beginner',
        title text NOT NULL,
        description text NOT NULL,
        icon_name text NOT NULL,
        language text NOT NULL DEFAULT 'en',
        total_lessons integer NOT NULL DEFAULT 0,
        estimated_total_minutes integer NOT NULL DEFAULT 0,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS lessons (
        id text PRIMARY KEY,
        module_id text NOT NULL REFERENCES financial_modules(id) ON DELETE CASCADE,
        slug text NOT NULL,
        title text NOT NULL,
        estimated_minutes integer NOT NULL DEFAULT 5,
        "order" integer NOT NULL DEFAULT 0,
        summary text NOT NULL,
        content_markdown text NOT NULL,
        key_takeaways jsonb NOT NULL,
        actionable_tip text NOT NULL,
        glossary_terms jsonb NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS glossary_terms (
        id text PRIMARY KEY,
        term text NOT NULL,
        category text NOT NULL,
        definition text NOT NULL,
        simple_analogy text NOT NULL,
        example text NOT NULL,
        language text NOT NULL DEFAULT 'en',
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS assessment_questions (
        id text PRIMARY KEY,
        category text NOT NULL,
        difficulty text NOT NULL DEFAULT 'beginner',
        question text NOT NULL,
        options jsonb NOT NULL,
        explanation text NOT NULL,
        correct_option_id text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS assessments (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_questions integer NOT NULL,
        total_correct integer NOT NULL,
        overall_score_percentage double precision NOT NULL,
        recommended_level text NOT NULL,
        category_breakdown jsonb NOT NULL,
        identified_gaps jsonb NOT NULL,
        strengths jsonb NOT NULL,
        completed_at timestamp with time zone NOT NULL DEFAULT now(),
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS assessment_answers (
        id text PRIMARY KEY,
        assessment_id text NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        question_id text NOT NULL,
        selected_option_id text NOT NULL,
        is_correct boolean,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS knowledge_gaps (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category text NOT NULL,
        topic_name text NOT NULL,
        severity text NOT NULL,
        score_percentage double precision NOT NULL,
        detected_reason text NOT NULL,
        recommended_action text NOT NULL,
        recommended_module_id text,
        evaluated_at timestamp with time zone NOT NULL DEFAULT now(),
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS learning_paths (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        target_level text NOT NULL DEFAULT 'beginner',
        total_estimated_minutes integer NOT NULL DEFAULT 0,
        completed_steps_count integer NOT NULL DEFAULT 0,
        total_steps_count integer NOT NULL DEFAULT 0,
        progress_percentage double precision NOT NULL DEFAULT 0,
        personalized_rationale text NOT NULL,
        generated_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS learning_path_steps (
        id text PRIMARY KEY,
        learning_path_id text NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        step_number integer NOT NULL,
        title text NOT NULL,
        description text NOT NULL,
        category text NOT NULL,
        target_module_id text NOT NULL,
        estimated_minutes integer NOT NULL,
        status text NOT NULL DEFAULT 'not_started',
        skills_taught jsonb NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS progress (
        id text PRIMARY KEY,
        user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        current_level text NOT NULL DEFAULT 'beginner',
        completed_lessons_count integer NOT NULL DEFAULT 0,
        completed_quizzes_count integer NOT NULL DEFAULT 0,
        average_quiz_score_percentage double precision NOT NULL DEFAULT 0,
        current_streak_days integer NOT NULL DEFAULT 1,
        longest_streak_days integer NOT NULL DEFAULT 1,
        last_active_date text NOT NULL,
        category_proficiencies jsonb NOT NULL,
        earned_badges jsonb NOT NULL,
        recent_activities jsonb NOT NULL,
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category text NOT NULL,
        score_percentage double precision NOT NULL,
        total_questions integer NOT NULL,
        correct_answers integer NOT NULL,
        metadata jsonb,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS simulator_sessions (
        id text PRIMARY KEY,
        user_id text REFERENCES users(id) ON DELETE SET NULL,
        simulator_type text NOT NULL,
        inputs jsonb NOT NULL,
        results jsonb NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS scam_analyses (
        id text PRIMARY KEY,
        user_id text REFERENCES users(id) ON DELETE SET NULL,
        message_text text NOT NULL,
        sender_info text,
        channel text NOT NULL DEFAULT 'sms',
        language text NOT NULL DEFAULT 'en',
        scam_risk_score double precision NOT NULL,
        risk_level text NOT NULL,
        detected_scam_type text NOT NULL,
        red_flags jsonb NOT NULL,
        explanation text NOT NULL,
        urgency_tactic_detected boolean NOT NULL DEFAULT false,
        suspicious_elements_found jsonb NOT NULL,
        safe_action_recommendations jsonb NOT NULL,
        helpline_or_reporting_advice text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS chat_conversations (
        id text PRIMARY KEY,
        user_id text REFERENCES users(id) ON DELETE SET NULL,
        title text,
        language text NOT NULL DEFAULT 'en',
        context_category text,
        user_level text NOT NULL DEFAULT 'beginner',
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id text PRIMARY KEY,
        conversation_id text NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        role text NOT NULL,
        content text NOT NULL,
        metadata jsonb,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
  });

  after(async () => {
    if (pool) await pool.end();
  });

  it('1. Verifies database connectivity probe', async () => {
    const status = await checkDatabaseConnection(pool);
    assert.equal(status.connected, true);
    assert.equal(typeof status.latencyMs, 'number');
  });

  it('2. Verifies Idempotent Database Seeding (Runs twice without duplicate violations)', async () => {
    // First run
    const seed1 = await seedDatabase(testDb);
    assert.equal(seed1.usersSeeded, 1);
    assert.ok(seed1.modulesSeeded >= 3);
    assert.ok(seed1.lessonsSeeded >= 6);
    assert.ok(seed1.glossarySeeded >= 5);
    assert.ok(seed1.questionsSeeded >= 5);

    // Second run must succeed idempotently without creating duplicates
    const seed2 = await seedDatabase(testDb);
    assert.equal(seed2.usersSeeded, 1);
    assert.equal(seed2.modulesSeeded, seed1.modulesSeeded);
  });

  it('3. Verifies PostgresUserRepository CRUD and unique email constraints', async () => {
    const userRepo = new PostgresUserRepository(testDb);

    // Create user
    const created = await userRepo.create({
      name: 'Rahul Varma',
      email: 'rahul.varma@example.com',
      preferredLanguage: 'hi',
      monthlyIncomeCurrency: 'INR',
      estimatedMonthlyIncome: 65000,
      primaryFinancialGoal: 'Stock market investing & tax optimization',
    });
    assert.ok(created.id);
    assert.equal(created.name, 'Rahul Varma');
    assert.equal(created.email, 'rahul.varma@example.com');

    // Find by ID
    const foundById = await userRepo.findById(created.id);
    assert.ok(foundById);
    assert.equal(foundById.id, created.id);

    // Find by Email
    const foundByEmail = await userRepo.findByEmail('rahul.varma@example.com');
    assert.ok(foundByEmail);
    assert.equal(foundByEmail.id, created.id);

    // Update
    const updated = await userRepo.update(created.id, {
      literacyLevel: 'intermediate',
      estimatedMonthlyIncome: 70000,
    });
    assert.ok(updated);
    assert.equal(updated.literacyLevel, 'intermediate');
    assert.equal(updated.estimatedMonthlyIncome, 70000);

    // Duplicate email rejection
    await assert.rejects(
      async () => {
        await userRepo.create({
          name: 'Duplicate Rahul',
          email: 'rahul.varma@example.com',
        });
      },
      /unique|duplicate|Failed to create user/i
    );

    // Delete
    const deleted = await userRepo.delete(created.id);
    assert.equal(deleted, true);

    const checkDeleted = await userRepo.findById(created.id);
    assert.equal(checkDeleted, null);
  });

  it('4. Verifies PostgresKnowledgeRepository and lesson relations', async () => {
    const knowledgeRepo = new PostgresKnowledgeRepository(testDb);

    const modules = await knowledgeRepo.getAllModules('en');
    assert.ok(modules.length >= 3);
    assert.ok(modules[0].lessons.length > 0);

    const budgetingMod = await knowledgeRepo.getModuleBySlug('budgeting-mastery');
    assert.ok(budgetingMod);
    assert.equal(budgetingMod.slug, 'budgeting-mastery');
    assert.ok(budgetingMod.lessons.length >= 2);

    const glossary = await knowledgeRepo.getGlossaryTerms('en');
    assert.ok(glossary.length >= 5);

    const searchRes = await knowledgeRepo.searchKnowledge('compound');
    assert.ok(searchRes.modules.length > 0 || searchRes.glossary.length > 0);
  });

  it('5. Verifies PostgresAssessmentRepository saving and retrieval', async () => {
    const userRepo = new PostgresUserRepository(testDb);
    const assessmentRepo = new PostgresAssessmentRepository(testDb);

    const testUser = await userRepo.create({
      name: 'Amina Al-Mansoor',
      email: 'amina.mansoor@example.com',
      preferredLanguage: 'ar',
    });

    const questions = await assessmentRepo.getAssessmentQuestions();
    assert.ok(questions.length > 0);

    const saved = await assessmentRepo.saveResult({
      assessmentId: 'test-assess-001',
      userId: testUser.id,
      completedAt: new Date().toISOString(),
      totalQuestions: 10,
      totalCorrect: 7,
      overallScorePercentage: 70,
      recommendedLevel: 'intermediate',
      categoryBreakdown: [
        {
          category: 'budgeting_basics',
          categoryName: 'Budgeting & Cashflow',
          totalQuestions: 2,
          correctAnswers: 2,
          scorePercentage: 100,
          proficiencyLevel: 'advanced',
        },
        {
          category: 'investing_fundamentals',
          categoryName: 'Investing & Wealth Growth',
          totalQuestions: 2,
          correctAnswers: 1,
          scorePercentage: 50,
          proficiencyLevel: 'intermediate',
        },
      ],
      identifiedGaps: ['Investing & Wealth Growth'],
      strengths: ['Budgeting & Cashflow'],
    });

    assert.equal(saved.assessmentId, 'test-assess-001');

    const latest = await assessmentRepo.getLatestResultByUserId(testUser.id);
    assert.ok(latest);
    assert.equal(latest.overallScorePercentage, 70);
    assert.equal(latest.recommendedLevel, 'intermediate');
  });

  it('6. Verifies PostgresGapDetectionRepository persistence', async () => {
    const userRepo = new PostgresUserRepository(testDb);
    const gapRepo = new PostgresGapDetectionRepository(testDb);

    const user = await userRepo.create({
      name: 'Carlos Mendez',
      email: 'carlos.mendez@example.com',
      preferredLanguage: 'es',
    });

    const profile = await gapRepo.saveKnowledgeProfile({
      userId: user.id,
      evaluatedAt: new Date().toISOString(),
      overallLiteracyLevel: 'beginner',
      gapSummary: {
        criticalGapsCount: 1,
        highGapsCount: 1,
        mediumGapsCount: 0,
        lowGapsCount: 0,
      },
      identifiedGaps: [
        {
          id: 'gap-001',
          category: 'debt_and_credit',
          topicName: 'Debt & Credit Management',
          severity: 'critical',
          scorePercentage: 20,
          detectedReason: 'Scored 20% in debt assessment',
          recommendedAction: 'Study debt payoff strategies and credit utilization.',
          recommendedModuleId: 'mod-debt-credit',
        },
      ],
      masteredTopics: ['Budgeting'],
      aiInsights: 'Focus urgently on high interest credit management.',
    });

    assert.ok(profile.identifiedGaps.length === 1);

    const loaded = await gapRepo.getKnowledgeProfileByUserId(user.id);
    assert.ok(loaded);
    assert.equal(loaded.gapSummary.criticalGapsCount, 1);
    assert.equal(loaded.identifiedGaps[0].category, 'debt_and_credit');
  });

  it('7. Verifies PostgresLearningPathRepository & step completion progression', async () => {
    const userRepo = new PostgresUserRepository(testDb);
    const pathRepo = new PostgresLearningPathRepository(testDb);

    const user = await userRepo.create({
      name: 'Fatima Zahra',
      email: 'fatima.zahra@example.com',
      preferredLanguage: 'fr',
    });

    const createdPath = await pathRepo.saveLearningPath({
      id: 'lp-user-001',
      userId: user.id,
      title: "Fatima's Personalized Learning Path",
      targetLevel: 'beginner',
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalEstimatedMinutes: 45,
      completedStepsCount: 0,
      totalStepsCount: 2,
      progressPercentage: 0,
      steps: [
        {
          id: 'step-101',
          stepNumber: 1,
          title: 'Understanding 50/30/20 Budgeting',
          description: 'Learn income division principles',
          category: 'budgeting_basics',
          targetModuleId: 'mod-budgeting-101',
          estimatedMinutes: 15,
          status: 'not_started',
          skillsTaught: ['50/30/20 Rule', 'Expense categorization'],
        },
        {
          id: 'step-102',
          stepNumber: 2,
          title: 'Building 3-Month Emergency Fund',
          description: 'Safety net allocation',
          category: 'emergency_savings',
          targetModuleId: 'mod-emergency-fund',
          estimatedMinutes: 20,
          status: 'not_started',
          skillsTaught: ['Liquid savings', 'Risk protection'],
        },
      ],
      personalizedRationale: 'Built for beginner mastery',
    });

    assert.equal(createdPath.totalStepsCount, 2);
    assert.equal(createdPath.progressPercentage, 0);

    // Complete Step 1
    const updated1 = await pathRepo.updateStepStatus(user.id, 'step-101', 'completed');
    assert.ok(updated1);
    assert.equal(updated1.completedStepsCount, 1);
    assert.equal(updated1.progressPercentage, 50);

    // Complete Step 2
    const updated2 = await pathRepo.updateStepStatus(user.id, 'step-102', 'completed');
    assert.ok(updated2);
    assert.equal(updated2.completedStepsCount, 2);
    assert.equal(updated2.progressPercentage, 100);
  });

  it('8. Verifies PostgresProgressRepository streaks, badges, and quiz tracking', async () => {
    const userRepo = new PostgresUserRepository(testDb);
    const progressRepo = new PostgresProgressRepository(testDb);

    const user = await userRepo.create({
      name: 'Ananya Iyer',
      email: 'ananya.iyer@example.com',
      preferredLanguage: 'en',
    });

    const initProgress = await progressRepo.getUserProgress(user.id);
    assert.equal(initProgress.userId, user.id);
    assert.equal(initProgress.completedLessonsCount, 0);

    // Increment lesson completion
    const afterLesson = await progressRepo.incrementLessonCompletion(user.id, 'budgeting_basics');
    assert.equal(afterLesson.completedLessonsCount, 1);
    assert.ok(afterLesson.categoryProficiencies.budgeting_basics >= 25);

    // Record quiz score
    const afterQuiz = await progressRepo.recordQuizScore(user.id, 'budgeting_basics', 90);
    assert.equal(afterQuiz.completedQuizzesCount, 1);
    assert.equal(afterQuiz.averageQuizScorePercentage, 90);
  });

  it('9. Verifies Cascading Foreign Key Deletion', async () => {
    const userRepo = new PostgresUserRepository(testDb);
    const assessmentRepo = new PostgresAssessmentRepository(testDb);

    const ephemeralUser = await userRepo.create({
      name: 'Ephemeral User',
      email: 'ephemeral@example.com',
    });

    await assessmentRepo.saveResult({
      assessmentId: 'assess-ephemeral-1',
      userId: ephemeralUser.id,
      completedAt: new Date().toISOString(),
      totalQuestions: 5,
      totalCorrect: 4,
      overallScorePercentage: 80,
      recommendedLevel: 'advanced',
      categoryBreakdown: [],
      identifiedGaps: [],
      strengths: [],
    });

    // Delete user
    await userRepo.delete(ephemeralUser.id);

    // Confirm assessment record is automatically cleaned up via CASCADE
    const assessCheck = await assessmentRepo.getLatestResultByUserId(ephemeralUser.id);
    assert.equal(assessCheck, null);
  });

  it('10. Verifies Service Layer with PostgreSQL dependency injection', async () => {
    const userRepo = new PostgresUserRepository(testDb);
    const knowledgeRepo = new PostgresKnowledgeRepository(testDb);
    const assessmentRepo = new PostgresAssessmentRepository(testDb);
    const progressRepo = new PostgresProgressRepository(testDb);

    const userService = new UserService(userRepo);
    const knowledgeService = new KnowledgeService(knowledgeRepo);
    const assessmentService = new AssessmentService(assessmentRepo, userRepo, progressRepo);

    // Test User Service
    const user = await userService.createUser({
      name: 'Deepak Patel',
      email: 'deepak.patel@example.com',
      preferredLanguage: 'gu',
    });
    assert.ok(user.id);

    // Test Knowledge Service
    const modules = await knowledgeService.listModules('en');
    assert.ok(modules.length >= 3);

    // Test Assessment Service
    const questions = await assessmentService.getQuestions();
    assert.ok(questions.length >= 5);

    const submissionResult = await assessmentService.submitAssessment({
      userId: user.id,
      answers: questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: q.options[0].id,
      })),
    });
    assert.ok(submissionResult);
    assert.equal(submissionResult.userId, user.id);
  });
});
