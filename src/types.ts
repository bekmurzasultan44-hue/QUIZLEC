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
  updatedAt?: string;
  startedAt?: string; // Timestamp when test was made active
  status: 'draft' | 'active' | 'completed';
  code: string;
}

// 1 hour window in milliseconds (60 minutes)
export const TEST_EXPIRATION_MS = 60 * 60 * 1000;

export function isTestExpired(test: TestModel): boolean {
  if (test.status === 'completed') return true;
  if (test.status !== 'active') return false;

  const baseTime = test.startedAt ? new Date(test.startedAt).getTime() : new Date(test.createdAt).getTime();
  if (!baseTime || isNaN(baseTime)) return false;

  return Date.now() - baseTime > TEST_EXPIRATION_MS;
}

export function getTestRemainingMinutes(test: TestModel): number {
  if (test.status === 'completed') return 0;
  if (test.status !== 'active') return 60;

  const baseTime = test.startedAt ? new Date(test.startedAt).getTime() : new Date(test.createdAt).getTime();
  if (!baseTime || isNaN(baseTime)) return 60;

  const elapsed = Date.now() - baseTime;
  const remainingMs = TEST_EXPIRATION_MS - elapsed;
  return Math.max(0, Math.ceil(remainingMs / (60 * 1000)));
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
