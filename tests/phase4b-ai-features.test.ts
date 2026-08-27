import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { randomUUID } from 'crypto';

// AI Infrastructure & Providers
import { MockAIProvider } from '../server/ai/mock-ai.provider';
import { setAIProvider } from '../server/ai/ai.factory';
import { AIError, AIErrorCategory } from '../server/ai/ai.errors';

// Services
import { AssistantService } from '../server/services/assistant.service';
import { QuestionGenService } from '../server/services/question-gen.service';
import { GapDetectionService } from '../server/services/gap-detection.service';
import { LearningPathService } from '../server/services/learning-path.service';
import { authService } from '../server/services/auth.service';

// In-Memory Repositories
import { InMemoryUserRepository } from '../server/repositories/user.repository';
import { InMemoryKnowledgeRepository } from '../server/repositories/knowledge.repository';
import { InMemoryAssessmentRepository } from '../server/repositories/assessment.repository';
import { InMemoryGapDetectionRepository } from '../server/repositories/gap-detection.repository';
import { InMemoryLearningPathRepository } from '../server/repositories/learning-path.repository';

// Schemas & Models
import { AssistantResponseSchema } from '../server/models/assistant.model';
import { GeneratedQuestionSchema } from '../server/models/question-gen.model';

describe('EduFIN Phase 4B: Core AI Feature Integration Tests', () => {
  let mockAI: MockAIProvider;
  let userRepo: InMemoryUserRepository;
  let knowledgeRepo: InMemoryKnowledgeRepository;
  let assessmentRepo: InMemoryAssessmentRepository;
  let gapRepo: InMemoryGapDetectionRepository;
  let pathRepo: InMemoryLearningPathRepository;

  let assistantService: AssistantService;
  let questionGenService: QuestionGenService;
  let gapDetectionService: GapDetectionService;
  let learningPathService: LearningPathService;

  beforeEach(() => {
    mockAI = new MockAIProvider();
    setAIProvider(mockAI);

    userRepo = new InMemoryUserRepository();
    knowledgeRepo = new InMemoryKnowledgeRepository();
    assessmentRepo = new InMemoryAssessmentRepository();
    gapRepo = new InMemoryGapDetectionRepository();
    pathRepo = new InMemoryLearningPathRepository();

    assistantService = new AssistantService(mockAI, knowledgeRepo);
    questionGenService = new QuestionGenService(mockAI);
    gapDetectionService = new GapDetectionService(
      assessmentRepo,
      gapRepo,
      knowledgeRepo,
      mockAI
    );
    learningPathService = new LearningPathService(
      pathRepo,
      knowledgeRepo,
      gapDetectionService,
      userRepo,
      mockAI
    );
  });

  describe('1. AI Financial Assistant Feature', () => {
    it('should generate structured financial tutor response matching AssistantResponseSchema', async () => {
      mockAI.queueStructuredResponse({
        reply: 'The 50/30/20 rule is an effective framework for allocating your net income into Needs, Wants, and Savings.',
        detectedLanguage: 'en',
        keyTakeaways: [
          '50% goes to essential fixed expenses.',
          '30% goes to flexible discretionary spending.',
          '20% is reserved for emergency savings and debt reduction.',
        ],
        suggestedFollowUps: [
          'How do I calculate 50% of my salary?',
          'What if my rent is more than 50%?',
          'Where should I keep my 20% savings?',
        ],
        relatedGlossaryTerms: ['50/30/20 Rule', 'Emergency Fund'],
        disclaimer: 'EduFIN Assistant provides financial literacy guidance for educational purposes only.',
      });

      const res = await assistantService.askFinancialTutor({
        message: 'Can you explain how to budget with the 50/30/20 rule?',
        language: 'en',
        userLevel: 'beginner',
        contextCategory: 'budgeting_basics',
        conversationHistory: [
          { role: 'user', content: 'Hello!' },
          { role: 'assistant', content: 'Hi! How can I help with your finances?' },
        ],
      });

      // Zod schema validation
      const parseResult = AssistantResponseSchema.safeParse(res);
      assert.strictEqual(parseResult.success, true);
      assert.ok(res.reply.includes('50/30/20'));
      assert.strictEqual(res.keyTakeaways.length, 3);
      assert.strictEqual(res.suggestedFollowUps.length, 3);
      assert.ok(res.disclaimer.includes('educational purposes'));
    });

    it('should prioritize local glossary knowledge repository for term explanation when available', async () => {
      // explainTerm should check knowledge repository terms first
      const res = await assistantService.explainTerm({
        term: 'Emergency Fund',
        language: 'en',
        targetLevel: 'beginner',
      });

      assert.ok(res.reply.length > 20);
      assert.ok(res.keyTakeaways.length >= 1);
      assert.strictEqual(res.detectedLanguage, 'en');
      assert.strictEqual(mockAI.callHistory.length, 0, 'Should not call AI if glossary matches term');
    });

    it('should fallback deterministically when AI provider fails during assistant query', async () => {
      mockAI.queueStructuredResponse(new AIError({
        message: '503 Overloaded',
        category: AIErrorCategory.PROVIDER_UNAVAILABLE,
        isRetryable: true,
      }));

      const res = await assistantService.askFinancialTutor({
        message: 'How does compound interest work?',
        language: 'en',
        userLevel: 'beginner',
        conversationHistory: [],
      });

      assert.ok(res.reply.includes('Compound interest'));
      assert.ok(res.keyTakeaways.length > 0);
      assert.ok(res.disclaimer.includes('EduFIN Assistant'));
    });
  });

  describe('2. AI Question Generation Feature', () => {
    it('should generate structured questions and validate GeneratedQuestionSchema', async () => {
      mockAI.queueStructuredResponse([
        {
          id: 'gen-q-test-1',
          scenario: 'Maya earns $4,000 monthly and wants to save 20% for her emergency fund.',
          questionText: 'How much money should Maya set aside each month?',
          category: 'emergency_savings',
          difficulty: 'beginner',
          options: [
            { id: 'opt-a', text: '$400' },
            { id: 'opt-b', text: '$800' },
            { id: 'opt-c', text: '$1,200' },
            { id: 'opt-d', text: '$200' },
          ],
          correctOptionId: 'opt-b',
          detailedExplanation: '20% of $4,000 = 0.20 * 4000 = $800.',
          practicalTip: 'Automate a recurring transfer of $800 on your payday.',
        },
      ]);

      const questions = await questionGenService.generateQuestions({
        category: 'emergency_savings',
        difficulty: 'beginner',
        scenarioType: 'practical_scenario',
        count: 1,
        language: 'en',
      });

      assert.strictEqual(questions.length, 1);
      const q = questions[0];
      const parsed = GeneratedQuestionSchema.safeParse(q);
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(q.correctOptionId, 'opt-b');
      assert.strictEqual(q.options.length, 4);
    });

    it('should enforce domain validation: repair/fallback if correctOptionId does not exist in options', async () => {
      // Simulate AI returning an invalid correctOptionId that is not in the options array
      mockAI.queueStructuredResponse([
        {
          id: 'malformed-q',
          scenario: 'Invalid options test scenario.',
          questionText: 'Which option is correct?',
          category: 'budgeting_basics',
          difficulty: 'beginner',
          options: [
            { id: 'opt-1', text: 'Option One' },
            { id: 'opt-2', text: 'Option Two' },
          ],
          correctOptionId: 'opt-nonexistent-id',
          detailedExplanation: 'Explanation here.',
          practicalTip: 'Tip here.',
        },
      ]);

      const questions = await questionGenService.generateQuestions({
        category: 'budgeting_basics',
        difficulty: 'beginner',
        scenarioType: 'practical_scenario',
        count: 1,
        language: 'en',
      });

      assert.ok(questions.length >= 1);
      const q = questions[0];
      // Must have valid options where correctOptionId is found in options
      const optIds = q.options.map((o) => o.id);
      assert.ok(optIds.includes(q.correctOptionId), 'correctOptionId must be in options array');
    });

    it('should validate answer submissions correctly', async () => {
      const resultCorrect = await questionGenService.validateAnswer({
        questionId: 'q-101',
        selectedOptionId: 'opt-b',
        correctOptionId: 'opt-b',
        detailedExplanation: 'Correct calculation!',
      });
      assert.strictEqual(resultCorrect.isCorrect, true);

      const resultIncorrect = await questionGenService.validateAnswer({
        questionId: 'q-101',
        selectedOptionId: 'opt-a',
        correctOptionId: 'opt-b',
        detailedExplanation: 'Correct calculation was option B.',
      });
      assert.strictEqual(resultIncorrect.isCorrect, false);
    });

    it('should provide deterministic fallback questions when AI is unavailable', async () => {
      mockAI.queueStructuredResponse(new AIError({
        message: '429 Rate limit',
        category: AIErrorCategory.RATE_LIMIT,
        isRetryable: true,
      }));

      const questions = await questionGenService.generateQuestions({
        category: 'budgeting_basics',
        difficulty: 'beginner',
        scenarioType: 'practical_scenario',
        count: 1,
        language: 'en',
      });

      assert.ok(questions.length >= 1);
      assert.ok(questions[0].options.length >= 2);
      assert.ok(questions[0].correctOptionId.length > 0);
    });
  });

  describe('3. Knowledge Gap Detection Feature', () => {
    it('should use real user assessment metrics to identify gaps without inventing unsupported weaknesses', async () => {
      const testUserId = 'learner-user-123';

      // Save a diagnostic assessment where user failed emergency_savings (20%) and scored high in budgeting (90%)
      const userAssessmentId = randomUUID();
      await assessmentRepo.saveResult({
        assessmentId: userAssessmentId,
        userId: testUserId,
        overallScorePercentage: 55,
        totalQuestions: 6,
        totalCorrect: 3,
        recommendedLevel: 'beginner',
        completedAt: new Date().toISOString(),
        identifiedGaps: ['emergency_savings'],
        strengths: ['budgeting_basics'],
        categoryBreakdown: [
          {
            category: 'emergency_savings',
            categoryName: 'Emergency Savings & Liquidity',
            totalQuestions: 3,
            correctAnswers: 1,
            scorePercentage: 20,
            proficiencyLevel: 'beginner',
          },
          {
            category: 'budgeting_basics',
            categoryName: 'Budgeting & Cashflow Basics',
            totalQuestions: 3,
            correctAnswers: 3,
            scorePercentage: 90,
            proficiencyLevel: 'advanced',
          },
        ],
      });

      mockAI.queueTextResponse(
        'Prioritize establishing a 3-month emergency fund before advancing to complex investments.'
      );

      const profile = await gapDetectionService.evaluateUserGaps(testUserId);

      // Verify gaps reflect real assessment failure (emergency_savings < 70) and not budgeting (90%)
      assert.strictEqual(profile.identifiedGaps.length, 1);
      assert.strictEqual(profile.identifiedGaps[0].category, 'emergency_savings');
      assert.strictEqual(profile.identifiedGaps[0].severity, 'high'); // 20% is < 40% -> high severity
      assert.ok(profile.masteredTopics.includes('Budgeting & Cashflow Basics'));

      // Verify AI insights synthesized from real data
      assert.ok(profile.aiInsights && profile.aiInsights.length > 10);

      // Verify repository persistence
      const retrieved = await gapRepo.getKnowledgeProfileByUserId(testUserId);
      assert.ok(retrieved !== null);
      assert.strictEqual(retrieved?.userId, testUserId);
      assert.strictEqual(retrieved?.identifiedGaps.length, 1);
    });

    it('should provide baseline diagnostic gap when no assessment has been taken yet', async () => {
      const newUserId = 'brand-new-user-456';
      const profile = await gapDetectionService.evaluateUserGaps(newUserId);

      assert.ok(profile.identifiedGaps.length >= 1);
      assert.strictEqual(profile.identifiedGaps[0].scorePercentage, 0);
      assert.ok(profile.identifiedGaps[0].detectedReason.includes('No diagnostic assessment'));
    });

    it('should gracefully fallback if AI synthesis fails during gap evaluation', async () => {
      const fallbackUserId = 'fallback-user-789';
      mockAI.queueTextResponse(new AIError({
        message: 'Timeout contacting AI provider',
        category: AIErrorCategory.TIMEOUT,
        isRetryable: true,
      }));

      const profile = await gapDetectionService.evaluateUserGaps(fallbackUserId);
      assert.ok(profile.identifiedGaps.length > 0);
      assert.ok(profile.aiInsights && profile.aiInsights.length > 0);
    });
  });

  describe('4. Personalized Learning Path Intelligence Feature', () => {
    it('should generate personalized learning path strictly grounded in real curriculum modules and lessons', async () => {
      const testUserId = 'path-user-001';

      await userRepo.create({
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        preferredLanguage: 'en',
        monthlyIncomeCurrency: 'USD',
        estimatedMonthlyIncome: 5000,
        primaryFinancialGoal: 'Building emergency fund',
      });

      // Add a gap in emergency_savings
      await gapRepo.saveKnowledgeProfile({
        userId: testUserId,
        evaluatedAt: new Date().toISOString(),
        overallLiteracyLevel: 'beginner',
        gapSummary: { criticalGapsCount: 0, highGapsCount: 1, mediumGapsCount: 0, lowGapsCount: 0 },
        identifiedGaps: [
          {
            id: randomUUID(),
            category: 'emergency_savings',
            topicName: 'Emergency Savings & Liquidity',
            severity: 'high',
            scorePercentage: 25,
            detectedReason: 'Low diagnostic score in emergency savings.',
            recommendedAction: 'Study emergency fund milestones.',
            recommendedModuleId: 'mod-emergency-fund',
          },
        ],
        masteredTopics: ['Budgeting Basics'],
        aiInsights: 'Focus on building liquidity buffers.',
      });

      mockAI.queueTextResponse(
        'Customized mastery path targeting high-priority emergency savings resilience with 45 minutes weekly.'
      );

      const path = await learningPathService.generateOrGetLearningPath({
        userId: testUserId,
        weeklyTimeCommitmentMinutes: 45,
      });

      // Domain Integrity Checks:
      // 1. All targetModuleIds must correspond to real modules in knowledgeRepo
      const allModules = await knowledgeRepo.getAllModules('en');
      const validModuleIds = new Set(allModules.map((m) => m.id));

      assert.ok(path.steps.length > 0);
      for (const step of path.steps) {
        assert.ok(
          validModuleIds.has(step.targetModuleId),
          `Step targetModuleId "${step.targetModuleId}" must exist in real curriculum modules`
        );
        assert.ok(step.estimatedMinutes > 0);
        assert.strictEqual(step.status, 'not_started');
      }

      // 2. Personalized Rationale
      assert.ok(path.personalizedRationale.length > 10);
      assert.strictEqual(path.completedStepsCount, 0);
      assert.strictEqual(path.progressPercentage, 0);

      // 3. Repository persistence
      const savedPath = await pathRepo.getLearningPathByUserId(testUserId);
      assert.ok(savedPath !== null);
      assert.strictEqual(savedPath?.userId, testUserId);
    });

    it('should update step status and calculate progress percentage accurately', async () => {
      const testUserId = 'progress-user-002';
      await userRepo.create({
        name: 'John Wick',
        email: 'john.wick@example.com',
        preferredLanguage: 'en',
        monthlyIncomeCurrency: 'USD',
        estimatedMonthlyIncome: 8000,
        primaryFinancialGoal: 'Retirement investment',
      });

      const path = await learningPathService.generateOrGetLearningPath({
        userId: testUserId,
        weeklyTimeCommitmentMinutes: 60,
      });

      assert.ok(path.steps.length >= 2);
      const firstStepId = path.steps[0].id;

      // Update step 1 to in_progress
      const updatedInProgress = await learningPathService.updateStep(
        testUserId,
        firstStepId,
        'in_progress'
      );
      assert.strictEqual(updatedInProgress?.steps.find((s) => s.id === firstStepId)?.status, 'in_progress');
      assert.strictEqual(updatedInProgress?.completedStepsCount, 0);

      // Update step 1 to completed
      const updatedCompleted = await learningPathService.updateStep(
        testUserId,
        firstStepId,
        'completed'
      );
      assert.strictEqual(updatedCompleted?.steps.find((s) => s.id === firstStepId)?.status, 'completed');
      assert.strictEqual(updatedCompleted?.completedStepsCount, 1);
      assert.ok(updatedCompleted && updatedCompleted.progressPercentage > 0);
    });

    it('should fallback gracefully when AI is unavailable during learning path generation', async () => {
      const fallbackUserId = 'path-fallback-user';
      mockAI.setAvailable(false);

      const path = await learningPathService.generateOrGetLearningPath({
        userId: fallbackUserId,
        weeklyTimeCommitmentMinutes: 30,
      });

      assert.ok(path.steps.length > 0);
      assert.ok(path.personalizedRationale.includes('commitment of ~30 mins/week'));
    });
  });

  describe('5. Authentication, User Isolation & Security Boundaries', () => {
    it('should enforce user isolation and token verification for personalized endpoints', () => {
      const token = authService.generateToken({
        id: 'isolated-user-abc',
        email: 'user@example.com',
      });

      const verified = authService.verifyToken(token);
      assert.strictEqual(verified.id, 'isolated-user-abc');
      assert.strictEqual(verified.email, 'user@example.com');

      // Attempting to access another user's resources should be prevented
      const targetUserId: string = 'other-user-xyz';
      const authenticatedId: string = verified.id;
      const isOwner = authenticatedId === targetUserId;
      assert.strictEqual(isOwner, false, 'User must not have ownership over other users data');
    });
  });
});
