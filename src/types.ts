export interface Question {
  id: string;
  text: string;
  options: [string, string, string, string, string]; // Exactly 5 options
  correctOptionIndex: number; // 0, 1, 2, 3, or 4
}

export interface TestModel {
  id: string;
  title: string;
  timerMinutes: number;
  questionCount: number;
  questions: Question[];
  createdAt: string;
  status: 'draft' | 'active' | 'completed';
  code: string;
}

export interface SubmissionModel {
  id: string;
  testId: string;
  studentName: string;
  groupName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  submittedAt: string;
  answers: number[]; // Index chosen for each question
}
