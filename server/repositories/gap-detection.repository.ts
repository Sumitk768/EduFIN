import { UserKnowledgeProfile } from '../models/gap-detection.model';

export interface IGapDetectionRepository {
  saveKnowledgeProfile(profile: UserKnowledgeProfile): Promise<UserKnowledgeProfile>;
  getKnowledgeProfileByUserId(userId: string): Promise<UserKnowledgeProfile | null>;
}

export class InMemoryGapDetectionRepository implements IGapDetectionRepository {
  private profiles: Map<string, UserKnowledgeProfile> = new Map();

  async saveKnowledgeProfile(profile: UserKnowledgeProfile): Promise<UserKnowledgeProfile> {
    this.profiles.set(profile.userId, profile);
    return profile;
  }

  async getKnowledgeProfileByUserId(userId: string): Promise<UserKnowledgeProfile | null> {
    return this.profiles.get(userId) || null;
  }
}

export const inMemoryGapDetectionRepository = new InMemoryGapDetectionRepository();
export const gapDetectionRepository: IGapDetectionRepository = inMemoryGapDetectionRepository;
