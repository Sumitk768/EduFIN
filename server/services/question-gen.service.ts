import { z } from 'zod';
import { IAIProvider } from '../ai/ai-provider.interface';
import { getAIProvider } from '../ai/ai.factory';
import {
  AI_MODELS,
  QUESTION_GENERATION_SYSTEM_INSTRUCTION,
  QUESTION_GENERATION_SCHEMA,
} from '../ai/prompts';
import {
  GenerateQuestionsRequest,
  GeneratedQuestion,
  GeneratedQuestionSchema,
  ValidateGeneratedAnswerRequest,
} from '../models/question-gen.model';
import { randomUUID } from 'crypto';

export class QuestionGenService {
  constructor(private aiProvider: IAIProvider = getAIProvider()) {}

  async generateQuestions(request: GenerateQuestionsRequest): Promise<GeneratedQuestion[]> {
    const prompt = `Generate exactly ${request.count} high-quality financial quiz questions in language "${request.language}".
Category: ${request.category}
Difficulty: ${request.difficulty}
Scenario Type: ${request.scenarioType}
${request.customTopicFocus ? `Topic Focus: ${request.customTopicFocus}` : ''}`;

    const result = await this.aiProvider.generateStructured<GeneratedQuestion[]>({
      prompt,
      schema: z.array(GeneratedQuestionSchema),
      responseSchema: QUESTION_GENERATION_SCHEMA as any,
      systemInstruction: QUESTION_GENERATION_SYSTEM_INSTRUCTION,
      model: AI_MODELS.DEFAULT,
      operationName: 'generateQuestions',
      fallback: () => this.getFallbackQuestions(request),
    });

    const validatedQuestions: GeneratedQuestion[] = [];
    const fallbackList = this.getFallbackQuestions(request);

    for (const rawQ of result.data) {
      // Domain-level validation:
      const options = rawQ.options || [];
      const optionIds = new Set(options.map((o) => o.id));
      const hasValidOptions =
        Array.isArray(options) &&
        options.length >= 2 &&
        options.every((o) => typeof o.text === 'string' && o.text.trim().length > 0);

      const hasValidCorrectOption =
        typeof rawQ.correctOptionId === 'string' && optionIds.has(rawQ.correctOptionId);

      const hasValidText =
        Boolean(rawQ.questionText && rawQ.questionText.trim().length > 0) &&
        Boolean(rawQ.scenario && rawQ.scenario.trim().length > 0);

      if (hasValidOptions && hasValidCorrectOption && hasValidText) {
        validatedQuestions.push({
          ...rawQ,
          id: rawQ.id || `gen-q-${randomUUID().substring(0, 8)}`,
          category: request.category,
          difficulty: request.difficulty,
        });
      } else {
        // Fallback replacement if domain invariants are breached
        validatedQuestions.push(...fallbackList);
      }
    }

    return validatedQuestions.length > 0 ? validatedQuestions : fallbackList;
  }

  async validateAnswer(request: ValidateGeneratedAnswerRequest) {
    const isCorrect = request.selectedOptionId === request.correctOptionId;
    return {
      questionId: request.questionId,
      selectedOptionId: request.selectedOptionId,
      correctOptionId: request.correctOptionId,
      isCorrect,
      explanation: request.detailedExplanation,
    };
  }

  private getFallbackQuestions(request: GenerateQuestionsRequest): GeneratedQuestion[] {
    return [
      {
        id: `fallback-q-${randomUUID().substring(0, 8)}`,
        scenario: 'Alex receives a monthly salary of $3,000 after tax and wants to allocate funds for groceries, rent, and utility bills.',
        questionText: 'Under the 50/30/20 budgeting rule, what is the maximum recommended amount Alex should spend on essential Needs?',
        category: request.category,
        difficulty: request.difficulty,
        options: [
          { id: 'opt-a', text: '$900 (30%)' },
          { id: 'opt-b', text: '$1,500 (50%)' },
          { id: 'opt-c', text: '$600 (20%)' },
          { id: 'opt-d', text: '$2,500 (83%)' },
        ],
        correctOptionId: 'opt-b',
        detailedExplanation: '50% of $3,000 is $1,500. The 50/30/20 rule balances 50% Needs, 30% Wants, and 20% Savings.',
        practicalTip: 'Keep your fixed housing and essential bills below half of your take-home pay.',
      },
    ];
  }
}

export const questionGenService = new QuestionGenService();

