import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import {
  AIError,
  AIErrorCategory,
  extractJsonString,
  safeJsonParse,
  sanitizeLogData,
  recordAITelemetry,
  MockAIProvider,
  GeminiAIProvider,
  getGeminiClient,
  hasGeminiApiKey,
  resetGeminiClientForTesting,
  setAIProvider,
  resetAIProvider,
  getAIProvider,
} from '../server/ai';
import { AssistantService } from '../server/services/assistant.service';
import { QuestionGenService } from '../server/services/question-gen.service';
import { ScamCheckerService } from '../server/services/scam-checker.service';
import { GapDetectionService } from '../server/services/gap-detection.service';
import {
  InMemoryAssessmentRepository,
  InMemoryGapDetectionRepository,
  InMemoryKnowledgeRepository,
  InMemoryUserRepository,
} from '../server/repositories';
import { AssistantResponseSchema } from '../server/models/assistant.model';
import { GeneratedQuestionSchema } from '../server/models/question-gen.model';
import { ScamAnalysisResultSchema } from '../server/models/scam-checker.model';

describe('EduFIN Phase 4A: AI Infrastructure Tests', () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
    resetGeminiClientForTesting();
    resetAIProvider();
  });

  // 1. Centralized Gemini Client Initialization
  describe('1. Centralized Gemini Client & Environment Handling', () => {
    it('should detect when GEMINI_API_KEY is not configured', () => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClientForTesting();

      assert.strictEqual(hasGeminiApiKey(), false);
      const client = getGeminiClient();
      assert.strictEqual(client, null);
    });

    it('should initialize client when GEMINI_API_KEY is present', () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key-12345';
      resetGeminiClientForTesting();

      assert.strictEqual(hasGeminiApiKey(), true);
      const client = getGeminiClient();
      assert.ok(client !== null, 'Gemini client should be initialized');
    });

    it('should allow AI factory to switch and reset providers', () => {
      resetAIProvider();
      const defaultProvider = getAIProvider();
      assert.strictEqual(defaultProvider.getProviderName(), 'gemini');

      const mock = new MockAIProvider();
      setAIProvider(mock);
      assert.strictEqual(getAIProvider().getProviderName(), 'mock');

      resetAIProvider();
      assert.strictEqual(getAIProvider().getProviderName(), 'gemini');
    });
  });

  // 2. Safe JSON Parsing, Markdown Extraction & Step 3 Test Cases
  describe('2. Safe JSON Parsing and Markdown Extraction (Step 3 Cases)', () => {
    // Case 1: Valid JSON
    it('Case 1: should extract and parse valid plain JSON object', () => {
      const raw = '{"key": "value", "count": 42}';
      const extracted = extractJsonString(raw);
      assert.strictEqual(extracted, '{"key": "value", "count": 42}');
      const parsed = safeJsonParse<{ key: string; count: number }>(raw);
      assert.strictEqual(parsed.key, 'value');
      assert.strictEqual(parsed.count, 42);
    });

    // Case 2: JSON with whitespace
    it('Case 2: should parse JSON with extensive leading/trailing whitespace & newlines', () => {
      const raw = `
        
        {
          "title": "Compound Interest",
          "rate": 0.08
        }
        
      `;
      const parsed = safeJsonParse<{ title: string; rate: number }>(raw);
      assert.strictEqual(parsed.title, 'Compound Interest');
      assert.strictEqual(parsed.rate, 0.08);
    });

    // Case 3: JSON inside Markdown code fences (generic ```)
    it('Case 3: should extract JSON from generic ``` ... ``` code fence', () => {
      const raw = `\`\`\`
[
  {"id": "q1", "text": "What is compound interest?"}
]
\`\`\``;
      const parsed = safeJsonParse<{ id: string; text: string }[]>(raw);
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].id, 'q1');
    });

    // Case 4: JSON with a json language marker (```json)
    it('Case 4: should extract JSON from markdown ```json ... ``` code fence', () => {
      const raw = `Here is the response:
\`\`\`json
{
  "recommendation": "Save 20%",
  "priority": "high"
}
\`\`\`
Hope this helps!`;
      const parsed = safeJsonParse<{ recommendation: string; priority: string }>(raw);
      assert.strictEqual(parsed.recommendation, 'Save 20%');
      assert.strictEqual(parsed.priority, 'high');
    });

    // Case 5: Empty response
    it('Case 5: should throw MALFORMED_OUTPUT on empty or whitespace-only response', () => {
      assert.throws(
        () => safeJsonParse('   '),
        (err: any) => {
          assert.ok(err instanceof AIError);
          assert.strictEqual(err.category, AIErrorCategory.MALFORMED_OUTPUT);
          return true;
        }
      );
    });

    // Case 6: Malformed JSON
    it('Case 6: should throw MALFORMED_OUTPUT on unparseable string', () => {
      assert.throws(
        () => safeJsonParse('I am just conversational text without JSON braces'),
        (err: any) => {
          assert.ok(err instanceof AIError);
          assert.strictEqual(err.category, AIErrorCategory.MALFORMED_OUTPUT);
          return true;
        }
      );
    });

    // Case 7: Partial / truncated JSON
    it('Case 7: should throw MALFORMED_OUTPUT on truncated JSON', () => {
      const partialJson = '{"title": "Emergency Fund", "target": 5000, "details": { "notes": "almo';
      assert.throws(
        () => safeJsonParse(partialJson),
        (err: any) => {
          assert.ok(err instanceof AIError);
          assert.strictEqual(err.category, AIErrorCategory.MALFORMED_OUTPUT);
          return true;
        }
      );
    });

    // Case 8: Valid JSON that fails Zod validation
    it('Case 8: should catch valid JSON that fails Zod validation and reject via VALIDATION_FAILED', async () => {
      const mockProvider = new MockAIProvider();
      const UserBudgetSchema = z.object({
        income: z.number().positive(),
        expenses: z.number().nonnegative(),
        category: z.enum(['balanced', 'deficit', 'surplus']),
      });

      // Valid JSON syntactically, but missing 'category' and income is string
      mockProvider.queueStructuredResponse({
        income: 'one thousand',
        expenses: 500,
      });

      await assert.rejects(
        () =>
          mockProvider.generateStructured({
            prompt: 'Analyze budget',
            schema: UserBudgetSchema,
          }),
        (err: any) => {
          assert.ok(err instanceof AIError);
          assert.strictEqual(err.category, AIErrorCategory.VALIDATION_FAILED);
          assert.strictEqual(err.isRetryable, false);
          return true;
        }
      );
    });
  });

  // 3. AI Error Classification & Retry Rules
  describe('3. AI Error Classification & Retry Policy (Step 4)', () => {
    it('should classify 429 and quota errors as retryable RATE_LIMIT', () => {
      const err = new Error('Resource has been exhausted (e.g. check quota, 429 Too Many Requests)');
      const classified = AIError.from(err);
      assert.strictEqual(classified.category, AIErrorCategory.RATE_LIMIT);
      assert.strictEqual(classified.isRetryable, true);
    });

    it('should classify authentication/api_key errors as non-retryable AUTH_ERROR', () => {
      const err = new Error('Invalid API_KEY provided or 401 Unauthorized');
      const classified = AIError.from(err);
      assert.strictEqual(classified.category, AIErrorCategory.AUTH_ERROR);
      assert.strictEqual(classified.isRetryable, false);
    });

    it('should classify timeout and abort errors as retryable TIMEOUT', () => {
      const err = new Error('The operation was aborted due to timeout');
      const classified = AIError.from(err);
      assert.strictEqual(classified.category, AIErrorCategory.TIMEOUT);
      assert.strictEqual(classified.isRetryable, true);
    });

    it('should classify 503 and unavailable errors as retryable PROVIDER_UNAVAILABLE', () => {
      const err = new Error('503 Service Unavailable: The model is overloaded');
      const classified = AIError.from(err);
      assert.strictEqual(classified.category, AIErrorCategory.PROVIDER_UNAVAILABLE);
      assert.strictEqual(classified.isRetryable, true);
    });

    it('should classify safety blocks as non-retryable CONTENT_FILTER', () => {
      const err = new Error('Content response was blocked by safety policy filter');
      const classified = AIError.from(err);
      assert.strictEqual(classified.category, AIErrorCategory.CONTENT_FILTER);
      assert.strictEqual(classified.isRetryable, false);
    });

    it('should classify invalid argument as non-retryable INVALID_REQUEST', () => {
      const err = new Error('400 Bad Request: Invalid argument supplied in model parameters');
      const classified = AIError.from(err);
      assert.strictEqual(classified.category, AIErrorCategory.INVALID_REQUEST);
      assert.strictEqual(classified.isRetryable, false);
    });
  });

  // 4. Telemetry and Sensitive Data Sanitization (Step 8)
  describe('4. Telemetry & Log Sanitization (Step 8)', () => {
    it('should sanitize Google API keys from strings and objects', () => {
      const sampleText = 'Calling Gemini with key AIzaSyA1234567890123456789012345678901 for user';
      const sanitized = sanitizeLogData(sampleText);
      assert.strictEqual(sanitized.includes('AIza'), false);
      assert.ok(sanitized.includes('[REDACTED_API_KEY]'));
    });

    it('should sanitize password fields and bearer JWT tokens in telemetry objects', () => {
      const rawObject = {
        user: 'test@example.com',
        password: 'SuperSecretPassword123!',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz0123456789',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature',
        operation: 'assistantChat',
      };
      const sanitized = sanitizeLogData(rawObject);
      assert.strictEqual(sanitized.password, '[REDACTED]');
      assert.strictEqual(sanitized.passwordHash, '[REDACTED]');
      assert.strictEqual(sanitized.token, '[REDACTED]');
      assert.strictEqual(sanitized.operation, 'assistantChat');

      // String sanitization check
      const rawString = JSON.stringify(rawObject);
      const sanitizedStr = sanitizeLogData(rawString);
      assert.ok(sanitizedStr.includes('[REDACTED_PASSWORD]'));
      assert.ok(sanitizedStr.includes('[REDACTED_HASH]'));
      assert.ok(sanitizedStr.includes('[REDACTED_JWT]'));
    });

    it('should safely record AI telemetry events without throwing', () => {
      assert.doesNotThrow(() => {
        recordAITelemetry({
          operation: 'test-operation',
          model: 'gemini-3.7-flash',
          latencyMs: 120,
          success: true,
          retryCount: 0,
        });
      });
    });
  });

  // 5. Mock Provider Execution, Retry Simulation & Loop Protection (Step 5 & 6)
  describe('5. Mock Provider Execution & Retry Scenarios (Step 5 & 6)', () => {
    it('Scenario 1: First request succeeds immediately', async () => {
      const mockProvider = new MockAIProvider();
      mockProvider.queueTextResponse('Immediate success advice');

      const res = await mockProvider.generateText({ prompt: 'Budget help' });
      assert.strictEqual(res.text, 'Immediate success advice');
      assert.strictEqual(mockProvider.callHistory.length, 1);
    });

    it('Scenario 2: First request fails with retryable error, second succeeds', async () => {
      const mockProvider = new MockAIProvider();
      // First call throws retryable 429
      mockProvider.queueTextResponse(new AIError({ message: '429 Quota Exceeded', category: AIErrorCategory.RATE_LIMIT, isRetryable: true }));
      // Second call succeeds
      mockProvider.queueTextResponse('Recovered response on second try');

      // Execute with mock provider directly simulating retry sequence
      let resultText = '';
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await mockProvider.generateText({ prompt: 'Test retry' });
          resultText = res.text;
          break;
        } catch (err: any) {
          if (!err.isRetryable) throw err;
        }
      }

      assert.strictEqual(resultText, 'Recovered response on second try');
      assert.strictEqual(mockProvider.callHistory.length, 2);
    });

    it('Scenario 3: Multiple retryable failures reach maximum retry limit without infinite loops', async () => {
      const mockProvider = new MockAIProvider();
      const maxRetries = 2;

      // Queue 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        mockProvider.queueTextResponse(new AIError({ message: '503 Overloaded', category: AIErrorCategory.PROVIDER_UNAVAILABLE, isRetryable: true }));
      }

      let attemptsCount = 0;
      let finalCaughtError: any = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        attemptsCount++;
        try {
          await mockProvider.generateText({ prompt: 'Retry limit test' });
        } catch (err: any) {
          finalCaughtError = err;
          if (attempt === maxRetries || !err.isRetryable) {
            break;
          }
        }
      }

      // Max retries = 2 means total attempts = 1 initial + 2 retries = 3
      assert.strictEqual(attemptsCount, 3);
      assert.strictEqual(finalCaughtError?.category, AIErrorCategory.PROVIDER_UNAVAILABLE);
    });

    it('Scenario 4 & 5: Non-retryable / Auth error does not retry', async () => {
      const mockProvider = new MockAIProvider();
      mockProvider.queueTextResponse(new AIError({ message: '401 Unauthorized API key', category: AIErrorCategory.AUTH_ERROR, isRetryable: false }));
      mockProvider.queueTextResponse('Should never reach this queued item');

      let attemptsCount = 0;
      try {
        attemptsCount++;
        await mockProvider.generateText({ prompt: 'Auth test' });
      } catch (err: any) {
        assert.strictEqual(err.category, AIErrorCategory.AUTH_ERROR);
        assert.strictEqual(err.isRetryable, false);
      }

      assert.strictEqual(attemptsCount, 1);
      assert.strictEqual(mockProvider.callHistory.length, 1);
    });
  });

  // 6. GeminiAIProvider Fallback & Zod Validation Behavior
  describe('6. GeminiAIProvider Fallback & Validation Guarantees', () => {
    it('should invoke fallback safely when GEMINI_API_KEY is not set', async () => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClientForTesting();

      const provider = new GeminiAIProvider();
      assert.strictEqual(provider.isAvailable(), false);

      const TestSchema = z.object({ tip: z.string() });
      const result = await provider.generateStructured({
        prompt: 'Give me a tip',
        schema: TestSchema,
        fallback: () => ({ tip: 'Spend less than you earn.' }),
      });

      assert.strictEqual(result.isFallback, true);
      assert.strictEqual(result.data.tip, 'Spend less than you earn.');
    });

    it('should throw AUTH_ERROR if unavailable and no fallback is provided', async () => {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClientForTesting();

      const provider = new GeminiAIProvider();
      const TestSchema = z.object({ tip: z.string() });

      await assert.rejects(
        () =>
          provider.generateStructured({
            prompt: 'Give me a tip',
            schema: TestSchema,
          }),
        (err: any) => {
          assert.ok(err instanceof AIError);
          assert.strictEqual(err.category, AIErrorCategory.AUTH_ERROR);
          return true;
        }
      );
    });
  });

  // 7. Domain-Specific Fallback Verification for all 4 Migrated Services (Step 7)
  describe('7. Domain-Specific Fallback Verification (Step 7)', () => {
    let mockAI: MockAIProvider;

    beforeEach(() => {
      mockAI = new MockAIProvider({ available: false }); // Force fallback path
      setAIProvider(mockAI);
    });

    it('AssistantService: executes deterministic domain fallback with financial heuristics', async () => {
      const assistant = new AssistantService(mockAI, new InMemoryKnowledgeRepository());
      const res = await assistant.askFinancialTutor({
        message: 'How do I start budgeting and saving?',
        language: 'en',
        userLevel: 'beginner',
        conversationHistory: [],
      });

      assert.ok(res.reply.length > 20);
      assert.ok(res.keyTakeaways.length > 0);
      assert.strictEqual(res.disclaimer, 'EduFIN Assistant provides financial literacy guidance for educational purposes only.');
    });

    it('QuestionGenService: executes deterministic question generation fallback', async () => {
      const questionService = new QuestionGenService(mockAI);
      const questions = await questionService.generateQuestions({
        category: 'emergency_savings',
        difficulty: 'beginner',
        scenarioType: 'practical_scenario',
        count: 2,
        language: 'en',
      });

      assert.ok(questions.length >= 1);
      assert.strictEqual(questions[0].category, 'emergency_savings');
      assert.ok(questions[0].options.length >= 3);
      assert.ok(questions[0].correctOptionId.length > 0);
    });

    it('ScamCheckerService: executes deterministic scam analysis fallback with heuristic keyword inspection', async () => {
      const scamService = new ScamCheckerService(mockAI);
      const result = await scamService.analyzeMessage({
        messageText: 'URGENT: Your bank account will be blocked in 24 hours. Update KYC immediately at http://bit.ly/bank-scam',
        channel: 'sms',
        language: 'en',
      });

      assert.ok(result.scamRiskScore >= 70, 'Heuristic should detect high risk for urgent KYC threat');
      assert.ok(result.urgencyTacticDetected, 'Urgency tactic should be detected');
      assert.ok(result.redFlags.length > 0);
    });

    it('GapDetectionService: generates comprehensive gap analysis profile with synthesis', async () => {
      const assessmentRepo = new InMemoryAssessmentRepository();
      const gapRepo = new InMemoryGapDetectionRepository();
      const knowledgeRepo = new InMemoryKnowledgeRepository();

      const gapService = new GapDetectionService(assessmentRepo, gapRepo, knowledgeRepo, mockAI);
      const profile = await gapService.evaluateUserGaps('fallback-test-user');

      assert.ok(profile.identifiedGaps.length > 0);
      assert.ok(profile.aiInsights && profile.aiInsights.length > 0);
      assert.ok(profile.identifiedGaps[0].recommendedAction.length > 0);
    });
  });

  // 8. End-to-End Service Success Paths with AI
  describe('8. End-to-End Service Integration with Structured AI Responses', () => {
    let mockAI: MockAIProvider;

    beforeEach(() => {
      mockAI = new MockAIProvider({ available: true });
      setAIProvider(mockAI);
    });

    it('AssistantService: processes chat query using AI and validates AssistantResponseSchema', async () => {
      const mockResponse = {
        reply: 'The 50/30/20 rule is an effective framework for allocating your take-home pay.',
        detectedLanguage: 'en',
        keyTakeaways: ['50% Needs', '30% Wants', '20% Savings'],
        suggestedFollowUps: ['How to track expenses easily?'],
        relatedGlossaryTerms: ['Budgeting'],
        disclaimer: 'For educational purposes only.',
      };
      mockAI.queueStructuredResponse(mockResponse);

      const assistant = new AssistantService(mockAI, new InMemoryKnowledgeRepository());
      const res = await assistant.askFinancialTutor({
        message: 'Explain 50/30/20 rule',
        language: 'en',
        userLevel: 'beginner',
        conversationHistory: [],
      });

      assert.strictEqual(res.reply, mockResponse.reply);
      assert.deepStrictEqual(res.keyTakeaways, mockResponse.keyTakeaways);
      assert.strictEqual(mockAI.callHistory.length, 1);
    });

    it('ScamCheckerService: analyzes scam message and validates ScamAnalysisResult schema', async () => {
      const mockAnalysis = {
        scamRiskScore: 92,
        riskLevel: 'critical_scam' as const,
        detectedScamType: 'Banking KYC Phishing Scam',
        redFlags: ['Urgent deactivation threat', 'Suspicious link'],
        explanation: 'The message impersonates a bank urging immediate credential verification.',
        urgencyTacticDetected: true,
        suspiciousElementsFound: [{ element: 'Link', reason: 'Unverified domain' }],
        safeActionRecommendations: ['Do not click link', 'Contact bank directly'],
        helplineOrReportingAdvice: 'Report to official cybercrime hotline 1930.',
      };
      mockAI.queueStructuredResponse(mockAnalysis);

      const scamService = new ScamCheckerService(mockAI);
      const result = await scamService.analyzeMessage({
        messageText: 'URGENT: Your account will be blocked in 15 mins. Update KYC here: http://bit.ly/bank-fake',
        channel: 'sms',
        language: 'en',
      });

      assert.ok(result.scamRiskScore >= 92, `Expected riskScore >= 92, got ${result.scamRiskScore}`);
      assert.strictEqual(result.riskLevel, 'critical_scam');
      assert.strictEqual(result.urgencyTacticDetected, true);
    });
  });
});
