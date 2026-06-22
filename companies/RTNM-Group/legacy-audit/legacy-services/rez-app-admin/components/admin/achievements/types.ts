export interface AchievementFormData {
  type?: string;
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  target?: number;
  coinReward?: number;
  badge?: string;
  isActive?: boolean;
  sortOrder?: number;
  conditionType?: string;
  conditionCombinator?: string;
  conditionRules?: any[];
  visibility?: string;
  repeatability?: string;
  tier?: string;
  cashbackReward?: number;
  multiplierReward?: number;
}

export const DEFAULT_FORM: AchievementFormData = {
  type: 'simple',
  title: '',
  description: '',
  icon: '',
  color: '',
  category: '',
  target: 1,
  coinReward: 0,
  badge: '',
  isActive: true,
  sortOrder: 0,
  conditionType: 'simple',
  conditionCombinator: 'AND',
  conditionRules: [],
  visibility: 'visible',
  repeatability: 'one_time',
  tier: 'bronze',
  cashbackReward: 0,
  multiplierReward: 0,
};
