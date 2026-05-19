export const GOAL_TEMPLATES = [
  {
    id: 'gym-3x',
    category: 'fitness',
    title: 'Gym 3x/week',
    description: 'Maintain peak physical condition with 3 sessions per week.',
    frequency_type: 'weekly',
    target_count: 3,
    suggested_amount: 10000, // 10k NGN
  },
  {
    id: 'study-2h',
    category: 'learning',
    title: 'Study 2 hours/day',
    description: 'Deep focus study sessions for skill mastery.',
    frequency_type: 'daily',
    target_count: 1,
    suggested_amount: 5000,
  },
  {
    id: 'read-2b',
    category: 'learning',
    title: 'Read 2 books/month',
    description: 'Expand your intellectual horizons with consistent reading.',
    frequency_type: 'monthly',
    target_count: 2,
    suggested_amount: 15000,
  },
  {
    id: 'save-consistently',
    category: 'financial',
    title: 'Save Consistently',
    description: 'Lock away capital to build long-term wealth.',
    frequency_type: 'weekly',
    target_count: 1,
    suggested_amount: 20000,
  },
  {
    id: 'deep-work',
    category: 'professional',
    title: 'Deep Work Session',
    description: 'Eliminate distractions for a 4-hour deep work block.',
    frequency_type: 'daily',
    target_count: 1,
    suggested_amount: 5000,
  }
] as const;

export type GoalTemplate = typeof GOAL_TEMPLATES[number];
