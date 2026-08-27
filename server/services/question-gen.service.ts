import { getGeminiClient } from '../ai/gemini.client';
import {
  AI_MODELS,
  QUESTION_GENERATION_SYSTEM_INSTRUCTION,
  QUESTION_GENERATION_SCHEMA,
} from '../ai/prompts';
import {
  GenerateQuestionsRequest,
  GeneratedQuestion,
  ValidateGeneratedAnswerRequest,
} from '../models/question-gen.model';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.util';

export class QuestionGenService {
  async generateQuestions(request: GenerateQuestionsRequest): Promise<GeneratedQuestion[]> {
    const ai = getGeminiClient();

    if (!ai) {
      return this.getFallbackQuestions(request);
    }

    try {
      const prompt = `Generate exactly ${request.count} high-quality financial quiz questions in language "${request.language}".
Category: ${request.category}
Difficulty: ${request.difficulty}
Scenario Type: ${request.scenarioType}
${request.customTopicFocus ? `Topic Focus: ${request.customTopicFocus}` : ''}`;

      const response = await ai.models.generateContent({
        model: AI_MODELS.DEFAULT,
        contents: prompt,
        config: {
          systemInstruction: QUESTION_GENERATION_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: QUESTION_GENERATION_SCHEMA,
        },
      });

      const text = response.text;
      if (!text) {
        return this.getFallbackQuestions(request);
      }

      const parsed: GeneratedQuestion[] = JSON.parse(text);
      return parsed.map((q) => ({
        ...q,
        id: q.id || `gen-q-${randomUUID().substring(0, 8)}`,
        category: request.category,
        difficulty: request.difficulty,
      }));
    } catch (err: any) {
      logger.error('Gemini Question Generation error:', err.message);
      return this.getFallbackQuestions(request);
    }
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
