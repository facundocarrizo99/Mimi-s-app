export type QuestionCategory =
  | "deep"
  | "romantic"
  | "playful"
  | "future"
  | "memory"
  | "wildcard";

export interface User {
  id: string;
  email: string;
  display_name: string;
  couple_id: string | null;
  timezone: string;
  created_at: string;
}

export interface Couple {
  id: string;
  user_1_id: string;
  user_2_id: string;
  invite_code: string;
  timezone: string;
  created_at: string;
  streak_count: number;
  last_streak_date: string | null;
}

export interface Question {
  id: string;
  text: string;
  category: QuestionCategory;
  created_at: string;
}

export interface DailyQuestion {
  id: string;
  couple_id: string;
  question_id: string;
  question_date: string;
  position: number;
  created_at: string;
  question?: Question;
}

export interface Answer {
  id: string;
  daily_question_id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface Mood {
  id: string;
  user_id: string;
  couple_id: string;
  mood_date: string;
  emoji: string;
  reflection: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  daily_question_id: string;
  created_at: string;
}

export interface DailyQuestionWithDetails extends DailyQuestion {
  question: Question;
  answers: Answer[];
  favorites: Favorite[];
}

export interface WeeklyCheckin {
  id: string;
  couple_id: string;
  week_start_date: string;
  question_text: string;
  status: 'active' | 'completed';
  created_at: string;
}

export interface WeeklyCheckinAnswer {
  id: string;
  checkin_id: string;
  user_id: string;
  answer_text: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyCheckinWithDetails extends WeeklyCheckin {
  answers: WeeklyCheckinAnswer[];
}
