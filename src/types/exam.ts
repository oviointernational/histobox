export type QuestionType = 'Multiple Choice' | 'Fill-in-the-gap' | 'Theory';
export type CandidateType = 'Student' | 'Intern';

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // for MCQ
  correctAnswer: string;
  points: number;
}

export interface RegistrationField {
  id: string;
  label: string;
  required: boolean;
}

export interface Exam {
  id: string;
  title: string;
  accessCode: string;
  candidateType: CandidateType;
  school?: string;
  level?: string;
  internSet?: string;
  registrationFields: RegistrationField[];
  questions: ExamQuestion[];
  duration: number;
  maxCandidates: number;
  resultsReleased: boolean;
  isPublished: boolean;
  isCompleted: boolean;
  resultsCode: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  logs: ExamLog[];
}

export interface ExamLog {
  id: string;
  event: string;
  timestamp: Date;
  user: string;
  details?: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  candidateInfo: Record<string, string>;
  answers: Record<string, string>;
  score?: number;
  totalPoints?: number;
  startedAt: Date;
  submittedAt?: Date;
  autoSubmitted?: boolean;
  violationsCount?: number;
}

export interface ExamBankQuestion {
  id: string;
  difficulty: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  points: number;
  createdAt: Date;
}
