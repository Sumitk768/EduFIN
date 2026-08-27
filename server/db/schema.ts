import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    preferredLanguage: text('preferred_language').notNull().default('en'),
    literacyLevel: text('literacy_level').notNull().default('beginner'),
    monthlyIncomeCurrency: text('monthly_income_currency').notNull().default('USD'),
    estimatedMonthlyIncome: doublePrecision('estimated_monthly_income'),
    primaryFinancialGoal: text('primary_financial_goal'),
    completedAssessment: boolean('completed_assessment').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_created_at_idx').on(table.createdAt),
  ]
);

// 2. Financial Modules Table
export const financialModules = pgTable(
  'financial_modules',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    category: text('category').notNull(),
    level: text('level').notNull().default('beginner'),
    title: text('title').notNull(),
    description: text('description').notNull(),
    iconName: text('icon_name').notNull(),
    language: text('language').notNull().default('en'),
    totalLessons: integer('total_lessons').notNull().default(0),
    estimatedTotalMinutes: integer('estimated_total_minutes').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('modules_category_idx').on(table.category),
    index('modules_slug_idx').on(table.slug),
    index('modules_language_idx').on(table.language),
  ]
);

// 3. Lessons Table
export const lessons = pgTable(
  'lessons',
  {
    id: text('id').primaryKey(),
    moduleId: text('module_id')
      .notNull()
      .references(() => financialModules.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    estimatedMinutes: integer('estimated_minutes').notNull().default(5),
    order: integer('order').notNull().default(0),
    summary: text('summary').notNull(),
    contentMarkdown: text('content_markdown').notNull(),
    keyTakeaways: jsonb('key_takeaways').$type<string[]>().notNull(),
    actionableTip: text('actionable_tip').notNull(),
    glossaryTerms: jsonb('glossary_terms').$type<string[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('lessons_module_id_idx').on(table.moduleId),
    index('lessons_slug_idx').on(table.slug),
    index('lessons_order_idx').on(table.order),
  ]
);

// 4. Glossary Terms Table
export const glossaryTerms = pgTable(
  'glossary_terms',
  {
    id: text('id').primaryKey(),
    term: text('term').notNull(),
    category: text('category').notNull(),
    definition: text('definition').notNull(),
    simpleAnalogy: text('simple_analogy').notNull(),
    example: text('example').notNull(),
    language: text('language').notNull().default('en'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('glossary_category_idx').on(table.category),
    index('glossary_term_idx').on(table.term),
    index('glossary_language_idx').on(table.language),
  ]
);

// 5. Assessment Questions Table (Bank)
export const assessmentQuestions = pgTable(
  'assessment_questions',
  {
    id: text('id').primaryKey(),
    category: text('category').notNull(),
    difficulty: text('difficulty').notNull().default('beginner'),
    question: text('question').notNull(),
    options: jsonb('options').$type<{ id: string; text: string }[]>().notNull(),
    explanation: text('explanation').notNull(),
    correctOptionId: text('correct_option_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('assessment_q_category_idx').on(table.category),
  ]
);

// 6. Assessments Table (Results / History)
export const assessments = pgTable(
  'assessments',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    totalQuestions: integer('total_questions').notNull(),
    totalCorrect: integer('total_correct').notNull(),
    overallScorePercentage: doublePrecision('overall_score_percentage').notNull(),
    recommendedLevel: text('recommended_level').notNull(),
    categoryBreakdown: jsonb('category_breakdown').$type<any[]>().notNull(),
    identifiedGaps: jsonb('identified_gaps').$type<string[]>().notNull(),
    strengths: jsonb('strengths').$type<string[]>().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('assessments_user_id_idx').on(table.userId),
    index('assessments_created_at_idx').on(table.createdAt),
  ]
);

// 7. Assessment Answers Table
export const assessmentAnswers = pgTable(
  'assessment_answers',
  {
    id: text('id').primaryKey(),
    assessmentId: text('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    questionId: text('question_id').notNull(),
    selectedOptionId: text('selected_option_id').notNull(),
    isCorrect: boolean('is_correct'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('assessment_answers_assessment_id_idx').on(table.assessmentId),
    index('assessment_answers_question_id_idx').on(table.questionId),
  ]
);

// 8. Knowledge Gaps Table
export const knowledgeGaps = pgTable(
  'knowledge_gaps',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    topicName: text('topic_name').notNull(),
    severity: text('severity').notNull(), // 'low' | 'medium' | 'high' | 'critical'
    scorePercentage: doublePrecision('score_percentage').notNull(),
    detectedReason: text('detected_reason').notNull(),
    recommendedAction: text('recommended_action').notNull(),
    recommendedModuleId: text('recommended_module_id'),
    evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('knowledge_gaps_user_id_idx').on(table.userId),
    index('knowledge_gaps_category_idx').on(table.category),
    index('knowledge_gaps_severity_idx').on(table.severity),
  ]
);

// 9. Learning Paths Table
export const learningPaths = pgTable(
  'learning_paths',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    targetLevel: text('target_level').notNull().default('beginner'),
    totalEstimatedMinutes: integer('total_estimated_minutes').notNull().default(0),
    completedStepsCount: integer('completed_steps_count').notNull().default(0),
    totalStepsCount: integer('total_steps_count').notNull().default(0),
    progressPercentage: doublePrecision('progress_percentage').notNull().default(0),
    personalizedRationale: text('personalized_rationale').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('learning_paths_user_id_idx').on(table.userId),
    index('learning_paths_created_at_idx').on(table.createdAt),
  ]
);

// 10. Learning Path Steps Table
export const learningPathSteps = pgTable(
  'learning_path_steps',
  {
    id: text('id').primaryKey(),
    learningPathId: text('learning_path_id')
      .notNull()
      .references(() => learningPaths.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stepNumber: integer('step_number').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    targetModuleId: text('target_module_id').notNull(),
    estimatedMinutes: integer('estimated_minutes').notNull(),
    status: text('status').notNull().default('not_started'), // 'not_started' | 'in_progress' | 'completed'
    skillsTaught: jsonb('skills_taught').$type<string[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('learning_path_steps_path_id_idx').on(table.learningPathId),
    index('learning_path_steps_user_id_idx').on(table.userId),
    index('learning_path_steps_category_idx').on(table.category),
  ]
);

// 11. Progress Table
export const progress = pgTable(
  'progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    currentLevel: text('current_level').notNull().default('beginner'),
    completedLessonsCount: integer('completed_lessons_count').notNull().default(0),
    completedQuizzesCount: integer('completed_quizzes_count').notNull().default(0),
    averageQuizScorePercentage: doublePrecision('average_quiz_score_percentage').notNull().default(0),
    currentStreakDays: integer('current_streak_days').notNull().default(1),
    longestStreakDays: integer('longest_streak_days').notNull().default(1),
    lastActiveDate: text('last_active_date').notNull(),
    categoryProficiencies: jsonb('category_proficiencies').$type<Record<string, number>>().notNull(),
    earnedBadges: jsonb('earned_badges').$type<any[]>().notNull(),
    recentActivities: jsonb('recent_activities').$type<any[]>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('progress_user_id_idx').on(table.userId),
  ]
);

// 12. Quiz Attempts Table
export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    scorePercentage: doublePrecision('score_percentage').notNull(),
    totalQuestions: integer('total_questions').notNull(),
    correctAnswers: integer('correct_answers').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('quiz_attempts_user_id_idx').on(table.userId),
    index('quiz_attempts_category_idx').on(table.category),
    index('quiz_attempts_created_at_idx').on(table.createdAt),
  ]
);

// 13. Simulator Sessions Table
export const simulatorSessions = pgTable(
  'simulator_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    simulatorType: text('simulator_type').notNull(),
    inputs: jsonb('inputs').notNull(),
    results: jsonb('results').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('simulator_sessions_user_id_idx').on(table.userId),
    index('simulator_sessions_type_idx').on(table.simulatorType),
    index('simulator_sessions_created_at_idx').on(table.createdAt),
  ]
);

// 14. Scam Analyses Table
export const scamAnalyses = pgTable(
  'scam_analyses',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    messageText: text('message_text').notNull(),
    senderInfo: text('sender_info'),
    channel: text('channel').notNull().default('sms'),
    language: text('language').notNull().default('en'),
    scamRiskScore: doublePrecision('scam_risk_score').notNull(),
    riskLevel: text('risk_level').notNull(),
    detectedScamType: text('detected_scam_type').notNull(),
    redFlags: jsonb('red_flags').$type<string[]>().notNull(),
    explanation: text('explanation').notNull(),
    urgencyTacticDetected: boolean('urgency_tactic_detected').notNull().default(false),
    suspiciousElementsFound: jsonb('suspicious_elements_found').$type<any[]>().notNull(),
    safeActionRecommendations: jsonb('safe_action_recommendations').$type<string[]>().notNull(),
    helplineOrReportingAdvice: text('helpline_or_reporting_advice').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('scam_analyses_user_id_idx').on(table.userId),
    index('scam_analyses_risk_level_idx').on(table.riskLevel),
    index('scam_analyses_created_at_idx').on(table.createdAt),
  ]
);

// 15. Chat Conversations Table
export const chatConversations = pgTable(
  'chat_conversations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title'),
    language: text('language').notNull().default('en'),
    contextCategory: text('context_category'),
    userLevel: text('user_level').notNull().default('beginner'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('chat_conversations_user_id_idx').on(table.userId),
    index('chat_conversations_created_at_idx').on(table.createdAt),
  ]
);

// 16. Chat Messages Table
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => chatConversations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'user' | 'assistant' | 'system'
    content: text('content').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('chat_messages_conversation_id_idx').on(table.conversationId),
    index('chat_messages_created_at_idx').on(table.createdAt),
  ]
);

// Relationships Definition
export const usersRelations = relations(users, ({ many, one }) => ({
  assessments: many(assessments),
  knowledgeGaps: many(knowledgeGaps),
  learningPaths: many(learningPaths),
  progress: one(progress, {
    fields: [users.id],
    references: [progress.userId],
  }),
  quizAttempts: many(quizAttempts),
  simulatorSessions: many(simulatorSessions),
  scamAnalyses: many(scamAnalyses),
  chatConversations: many(chatConversations),
}));

export const financialModulesRelations = relations(financialModules, ({ many }) => ({
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  module: one(financialModules, {
    fields: [lessons.moduleId],
    references: [financialModules.id],
  }),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  user: one(users, {
    fields: [assessments.userId],
    references: [users.id],
  }),
  answers: many(assessmentAnswers),
}));

export const assessmentAnswersRelations = relations(assessmentAnswers, ({ one }) => ({
  assessment: one(assessments, {
    fields: [assessmentAnswers.assessmentId],
    references: [assessments.id],
  }),
}));

export const learningPathsRelations = relations(learningPaths, ({ one, many }) => ({
  user: one(users, {
    fields: [learningPaths.userId],
    references: [users.id],
  }),
  steps: many(learningPathSteps),
}));

export const learningPathStepsRelations = relations(learningPathSteps, ({ one }) => ({
  learningPath: one(learningPaths, {
    fields: [learningPathSteps.learningPathId],
    references: [learningPaths.id],
  }),
}));

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}));
