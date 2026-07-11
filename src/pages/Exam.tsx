import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, Copy, Clock, Users, FileText, Trophy, ExternalLink, Eye, Check, Link2, StopCircle, ArrowLeft, BookOpen, Pencil, Files, Download } from 'lucide-react';
import { Exam, ExamQuestion, ExamSubmission, RegistrationField, QuestionType, CandidateType, ExamLog, ExamBankQuestion } from '@/types/exam';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import PageTip from '@/components/PageTip';
import { useStore } from '@/store/useStore';

function similarity(a: string, b: string): number {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
  const longer = la.length > lb.length ? la : lb;
  const shorter = la.length > lb.length ? lb : la;
  if (longer.length === 0) return 1;
  const matrix: number[][] = [];
  for (let i = 0; i <= shorter.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= longer.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= shorter.length; i++) {
    for (let j = 1; j <= longer.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (shorter[i - 1] === longer[j - 1] ? 0 : 1));
    }
  }
  return 1 - matrix[shorter.length][longer.length] / longer.length;
}

// Defined OUTSIDE the component so its identity is stable across renders.
// Defining it inline would unmount/remount its children on every keystroke,
// causing inputs (e.g. registration fields) to lose focus.
const SimpleWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto">{children}</div>
);

const ExamPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const examCode = searchParams.get('code');
  const resultsCode = searchParams.get('results');
  const { currentUser, settings, exams, examSubmissions, examBank, setExams, setExamSubmissions, setExamBank, isAuthenticated, hasPermission, _hasHydrated } = useStore();

  const examSchools = (settings.variables as any).examSchools || [];
  const examLevels = (settings.variables as any).examLevels || [];
  const examInternSets = (settings.variables as any).examInternSets || [];
  const examDifficulties = (settings.variables as any).examDifficulties || [];

  // Public access: via /exam/link route or via ?code= / ?results= params
  const isPublicRoute = location.pathname === '/exam/link';
  const isPublicAccess = !!examCode || !!resultsCode || isPublicRoute;

  const [createOpen, setCreateOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingExamId, setViewingExamId] = useState<string | null>(null);
  const [viewingResults, setViewingResults] = useState<string | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<string | null>(null);
  const [examBankOpen, setExamBankOpen] = useState(false);

  // Create exam form
  const [eTitle, setETitle] = useState('');
  const [eDuration, setEDuration] = useState('30');
  const [eMaxCandidates, setEMaxCandidates] = useState('50');
  const [eCandidateType, setECandidateType] = useState<CandidateType>('Student');
  const [eSchool, setESchool] = useState('');
  const [eLevel, setELevel] = useState('');
  const [eInternSet, setEInternSet] = useState('');
  const [eFields, setEFields] = useState<RegistrationField[]>([
    { id: crypto.randomUUID(), label: 'Name', required: true },
    { id: crypto.randomUUID(), label: 'ID', required: true },
    { id: crypto.randomUUID(), label: 'Email', required: true },
  ]);
  const [eQuestions, setEQuestions] = useState<ExamQuestion[]>([]);

  const [qType, setQType] = useState<QuestionType>('Multiple Choice');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qAnswer, setQAnswer] = useState('');
  const [qPoints, setQPoints] = useState('1');

  // Generate from bank state
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genDifficulty, setGenDifficulty] = useState('');
  const [genCount, setGenCount] = useState('10');
  const [genType, setGenType] = useState<QuestionType | 'All'>('All');

  // Exam bank form
  const [bankDifficulty, setBankDifficulty] = useState('');
  const [bankQType, setBankQType] = useState<QuestionType>('Multiple Choice');
  const [bankQText, setBankQText] = useState('');
  const [bankQOptions, setBankQOptions] = useState(['', '', '', '']);
  const [bankQAnswer, setBankQAnswer] = useState('');
  const [bankQPoints, setBankQPoints] = useState('1');
  const [bankAddOpen, setBankAddOpen] = useState(false);

  // Candidate mode
  const [candidateExam, setCandidateExam] = useState<Exam | null>(null);
  const [regData, setRegData] = useState<Record<string, string>>({});
  const [examStarted, setExamStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [examSearched, setExamSearched] = useState(false);

  // Wait for hydration before finding exams
  useEffect(() => {
    if (!_hasHydrated) return;
    setExamSearched(true);
    if (examCode) {
      const exam = exams.find(e => e.accessCode === examCode && e.isPublished && !e.isCompleted);
      if (exam) {
        const subs = examSubmissions.filter(s => s.examId === exam.id);
        if (subs.length < exam.maxCandidates) setCandidateExam(exam);
      }
    }
    if (resultsCode) {
      const exam = exams.find(e => e.resultsCode === resultsCode && e.resultsReleased);
      if (exam) setViewingResults(exam.id);
    }
  }, [examCode, resultsCode, exams.length, _hasHydrated]);

  const addField = () => setEFields([...eFields, { id: crypto.randomUUID(), label: '', required: false }]);
  const removeField = (id: string) => setEFields(eFields.filter(f => f.id !== id));

  const addQuestion = () => {
    if (!qText.trim() || !qAnswer.trim()) {
      toast({ title: 'Error', description: 'Both question and answer are required.', variant: 'destructive' });
      return;
    }
    const q: ExamQuestion = {
      id: crypto.randomUUID(), type: qType, question: qText,
      options: qType === 'Multiple Choice' ? qOptions.filter(o => o.trim()) : undefined,
      correctAnswer: qAnswer, points: parseInt(qPoints) || 1,
    };
    setEQuestions([...eQuestions, q]);
    setQText(''); setQOptions(['', '', '', '']); setQAnswer(''); setQPoints('1');
  };

  const generateFromBank = () => {
    const count = parseInt(genCount) || 10;
    let pool = examBank.filter(q => q.difficulty === genDifficulty);
    if (genType !== 'All') pool = pool.filter(q => q.type === genType);
    if (pool.length === 0) {
      toast({ title: 'No questions found', description: `No ${genType !== 'All' ? genType + ' ' : ''}questions in "${genDifficulty}" difficulty.`, variant: 'destructive' });
      return;
    }
    // Shuffle and pick
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);
    const newQs: ExamQuestion[] = picked.map(q => ({
      id: crypto.randomUUID(), type: q.type, question: q.question,
      options: q.options, correctAnswer: q.correctAnswer, points: q.points,
    }));
    setEQuestions([...eQuestions, ...newQs]);
    setGenerateOpen(false);
    toast({ title: 'Questions generated', description: `${newQs.length} question(s) added from bank.` });
  };

  const addExamLog = (examId: string, event: string, details?: string) => {
    setExams(exams.map(e => e.id === examId ? {
      ...e,
      logs: [...e.logs, { id: crypto.randomUUID(), event, timestamp: new Date(), user: currentUser?.name || 'System', details }],
      updatedAt: new Date(),
    } : e));
  };

  const createExam = () => {
    if (!eTitle.trim() || eQuestions.length === 0) return;
    const missingAnswers = eQuestions.filter(q => !q.correctAnswer.trim());
    if (missingAnswers.length > 0) {
      toast({ title: 'Error', description: `${missingAnswers.length} question(s) missing correct answer.`, variant: 'destructive' });
      return;
    }
    if (editingExamId) {
      setExams(exams.map(ex => ex.id === editingExamId ? {
        ...ex,
        title: eTitle,
        candidateType: eCandidateType,
        school: eCandidateType === 'Student' ? eSchool : undefined,
        level: eCandidateType === 'Student' ? eLevel : undefined,
        internSet: eCandidateType === 'Intern' ? eInternSet : undefined,
        registrationFields: eFields.filter(f => f.label.trim()),
        questions: eQuestions,
        duration: parseInt(eDuration) || 30,
        maxCandidates: parseInt(eMaxCandidates) || 50,
        logs: [...ex.logs, { id: crypto.randomUUID(), event: 'Exam edited', timestamp: new Date(), user: currentUser?.name || 'Admin' }],
        updatedAt: new Date(),
      } : ex));
      setEditingExamId(null);
      setCreateOpen(false);
      setETitle(''); setEDuration('30'); setEMaxCandidates('50'); setEQuestions([]);
      setECandidateType('Student'); setESchool(''); setELevel(''); setEInternSet('');
      setEFields([
        { id: crypto.randomUUID(), label: 'Name', required: true },
        { id: crypto.randomUUID(), label: 'ID', required: true },
        { id: crypto.randomUUID(), label: 'Email', required: true },
      ]);
      toast({ title: 'Exam updated' });
      return;
    }
    const exam: Exam = {
      id: crypto.randomUUID(), title: eTitle, accessCode: crypto.randomUUID(),
      candidateType: eCandidateType,
      school: eCandidateType === 'Student' ? eSchool : undefined,
      level: eCandidateType === 'Student' ? eLevel : undefined,
      internSet: eCandidateType === 'Intern' ? eInternSet : undefined,
      registrationFields: eFields.filter(f => f.label.trim()),
      questions: eQuestions, duration: parseInt(eDuration) || 30,
      maxCandidates: parseInt(eMaxCandidates) || 50,
      resultsReleased: false, isPublished: false, isCompleted: false,
      resultsCode: crypto.randomUUID(),
      createdBy: currentUser?.name || 'Admin', createdAt: new Date(), updatedAt: new Date(),
      logs: [{ id: crypto.randomUUID(), event: 'Exam created', timestamp: new Date(), user: currentUser?.name || 'Admin' }],
    };
    setExams([...exams, exam]);
    setETitle(''); setEDuration('30'); setEMaxCandidates('50'); setEQuestions([]);
    setECandidateType('Student'); setESchool(''); setELevel(''); setEInternSet('');
    setEFields([
      { id: crypto.randomUUID(), label: 'Name', required: true },
      { id: crypto.randomUUID(), label: 'ID', required: true },
      { id: crypto.randomUUID(), label: 'Email', required: true },
    ]);
    setCreateOpen(false);
  };

  const startEditExam = (exam: Exam) => {
    setEditingExamId(exam.id);
    setETitle(exam.title);
    setEDuration(String(exam.duration));
    setEMaxCandidates(String(exam.maxCandidates));
    setECandidateType(exam.candidateType);
    setESchool(exam.school || '');
    setELevel(exam.level || '');
    setEInternSet(exam.internSet || '');
    setEFields(exam.registrationFields.map(f => ({ ...f })));
    setEQuestions(exam.questions.map(q => ({ ...q, options: q.options ? [...q.options] : undefined })));
    setCreateOpen(true);
  };

  const duplicateExam = (exam: Exam) => {
    const copy: Exam = {
      ...exam,
      id: crypto.randomUUID(),
      title: `${exam.title} (Copy)`,
      accessCode: crypto.randomUUID(),
      resultsCode: crypto.randomUUID(),
      isPublished: false,
      isCompleted: false,
      resultsReleased: false,
      questions: exam.questions.map(q => ({ ...q, id: crypto.randomUUID(), options: q.options ? [...q.options] : undefined })),
      registrationFields: exam.registrationFields.map(f => ({ ...f, id: crypto.randomUUID() })),
      logs: [{ id: crypto.randomUUID(), event: `Duplicated from "${exam.title}"`, timestamp: new Date(), user: currentUser?.name || 'Admin' }],
      createdBy: currentUser?.name || 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setExams([...exams, copy]);
    toast({ title: 'Exam duplicated', description: copy.title });
  };

  const startExam = () => {
    if (!candidateExam) return;
    for (const f of candidateExam.registrationFields) {
      if (f.required && !regData[f.label]?.trim()) return;
    }
    setExamStarted(true);
    setTimeLeft(candidateExam.duration * 60);
  };

  const submitExam = useCallback(() => {
    if (!candidateExam || submitted) return;
    if (timerRef.current) clearInterval(timerRef.current);
    let score = 0;
    let totalPoints = 0;
    candidateExam.questions.forEach(q => {
      totalPoints += q.points;
      const ans = answers[q.id] || '';
      if (q.type === 'Multiple Choice') {
        if (ans === q.correctAnswer) score += q.points;
      } else {
        // Theory and Fill-in-the-gap: 80% similarity threshold
        if (similarity(ans, q.correctAnswer) >= 0.80) score += q.points;
      }
    });
    const sub: ExamSubmission = {
      id: crypto.randomUUID(), examId: candidateExam.id, candidateInfo: { ...regData },
      answers: { ...answers }, score, totalPoints, startedAt: new Date(),
      submittedAt: new Date(), autoSubmitted: timeLeft <= 0,
    };
    setExamSubmissions([...examSubmissions, sub]);
    setSubmitted(true);
  }, [candidateExam, answers, regData, timeLeft, submitted]);

  useEffect(() => {
    if (!examStarted || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { submitExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examStarted, submitted, submitExam]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFullExamLink = (exam: Exam) => `${window.location.origin}/exam/link?code=${exam.accessCode}`;
  const getFullResultsLink = (exam: Exam) => `${window.location.origin}/exam/link?results=${exam.resultsCode}`;

  const togglePublish = (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    const newState = !exam.isPublished;
    const logEntry = { id: crypto.randomUUID(), event: newState ? 'Exam published' : 'Exam unpublished (ended)', timestamp: new Date(), user: currentUser?.name || 'System' };
    setExams(exams.map(e => e.id === examId ? { ...e, isPublished: newState, isCompleted: !newState ? true : e.isCompleted, logs: [...e.logs, logEntry], updatedAt: new Date() } : e));
  };

  const releaseResults = (examId: string) => {
    const updatedExams = exams.map(e => {
      if (e.id !== examId) return e;
      return {
        ...e,
        resultsReleased: true,
        logs: [...e.logs, { id: crypto.randomUUID(), event: 'Results released', timestamp: new Date(), user: currentUser?.name || 'System' }],
        updatedAt: new Date(),
      };
    });
    setExams(updatedExams);
    toast({ title: 'Results released', description: 'Students can now view their results via the results link.' });
  };

  const exportSubmissionsToDoc = (exam: Exam, subs: ExamSubmission[]) => {
    const sorted = [...subs].sort((a, b) => (b.score || 0) - (a.score || 0));
    const fieldHeaders = exam.registrationFields.map(f => `<th>${f.label}</th>`).join('');
    const rows = sorted.map((s, i) => {
      const fieldCells = exam.registrationFields.map(f => `<td>${s.candidateInfo[f.label] || '-'}</td>`).join('');
      const pct = s.totalPoints ? Math.round((s.score! / s.totalPoints) * 100) : 0;
      return `<tr><td>${i + 1}</td>${fieldCells}<td>${s.score}/${s.totalPoints}</td><td>${pct}%</td></tr>`;
    }).join('');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <title>${exam.title} - Results</title>
          <style>
            body { font-family: Calibri, Arial, sans-serif; }
            h2 { margin-bottom: 4px; }
            p.meta { color: #555; margin-top: 0; }
            table { border-collapse: collapse; width: 100%; margin-top: 12px; }
            th, td { border: 1px solid #999; padding: 6px 10px; font-size: 13px; text-align: left; }
            th { background: #eee; }
          </style>
        </head>
        <body>
          <h2>${exam.title} — Results</h2>
          <p class="meta">Type: ${exam.candidateType}${exam.school ? ` · School: ${exam.school}` : ''}${exam.level ? ` · Level: ${exam.level}` : ''}${exam.internSet ? ` · Set: ${exam.internSet}` : ''}</p>
          <table>
            <thead>
              <tr><th>#</th>${fieldHeaders}<th>Score</th><th>%</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exam.title.replace(/[^a-z0-9]+/gi, '_')}_Results.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addBankQuestion = () => {
    if (!bankQText.trim() || !bankQAnswer.trim() || !bankDifficulty) {
      toast({ title: 'Error', description: 'Difficulty, question and answer are required.', variant: 'destructive' });
      return;
    }
    const q: ExamBankQuestion = {
      id: crypto.randomUUID(), difficulty: bankDifficulty, type: bankQType, question: bankQText,
      options: bankQType === 'Multiple Choice' ? bankQOptions.filter(o => o.trim()) : undefined,
      correctAnswer: bankQAnswer, points: parseInt(bankQPoints) || 1, createdAt: new Date(),
    };
    setExamBank([...examBank, q]);
    setBankQText(''); setBankQOptions(['', '', '', '']); setBankQAnswer(''); setBankQPoints('1');
    setBankAddOpen(false);
  };

  // Show loading while hydrating for public access
  if (!_hasHydrated) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  // For public access (exam/results links), don't require login
  const Wrapper = (isPublicAccess && !isAuthenticated) ? SimpleWrapper : Layout;

  // If not authenticated, not public access → redirect
  if (!isAuthenticated && !isPublicAccess) {
    return <Navigate to="/login" replace />;
  }

  // ===== CANDIDATE MODE =====
  if (candidateExam && !viewingResults) {
    if (!examStarted) {
      return (
        <SimpleWrapper>
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>{candidateExam.title}</CardTitle>
              <CardDescription>Fill in your details to begin. Duration: {candidateExam.duration} minutes</CardDescription>
              {candidateExam.school && <p className="text-xs text-muted-foreground">School: {candidateExam.school}</p>}
              {candidateExam.level && <p className="text-xs text-muted-foreground">Level: {candidateExam.level}</p>}
              {candidateExam.internSet && <p className="text-xs text-muted-foreground">Set: {candidateExam.internSet}</p>}
            </CardHeader>
            <CardContent className="space-y-3">
              {candidateExam.registrationFields.map(f => (
                <div key={f.id}>
                  <Label>{f.label} {f.required && <span className="text-destructive">*</span>}</Label>
                  <Input
                    value={regData[f.label] || ''}
                    onChange={e => {
                      const val = e.target.value;
                      const fieldLabel = f.label;
                      setRegData(prev => ({ ...prev, [fieldLabel]: val }));
                    }}
                  />
                </div>
              ))}
              <Button onClick={startExam} className="w-full">Start Exam</Button>
            </CardContent>
          </Card>
        </SimpleWrapper>
      );
    }

    if (submitted) {
      return (
        <SimpleWrapper>
          <Card className="max-w-md mx-auto text-center p-8">
            <Trophy className="h-16 w-16 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2">Exam Submitted!</h2>
            <p className="text-muted-foreground">Your answers have been recorded.</p>
          </Card>
        </SimpleWrapper>
      );
    }

    return (
      <SimpleWrapper>
        <div className="space-y-4">
          <div className={cn('sticky top-0 z-10 p-3 rounded-lg flex justify-between items-center',
            timeLeft < 60 ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground')}>
            <span className="font-semibold">{candidateExam.title}</span>
            <span className="font-mono text-lg"><Clock className="h-4 w-4 inline mr-1" />{formatTime(timeLeft)}</span>
          </div>
          {candidateExam.questions.map((q, i) => (
            <Card key={q.id} className="p-4">
              <p className="font-semibold mb-3">Q{i + 1}. {q.question} <Badge variant="outline" className="ml-2">{q.points}pt</Badge></p>
              {q.type === 'Multiple Choice' && q.options ? (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className={cn('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      answers[q.id] === opt ? 'bg-primary/10 border-primary' : 'hover:bg-muted')}>
                      <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt}
                        onChange={() => setAnswers({ ...answers, [q.id]: opt })} className="accent-[hsl(var(--primary))]" />
                      <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                    </label>
                  ))}
                </div>
              ) : q.type === 'Theory' ? (
                <Textarea placeholder="Write your answer..." value={answers[q.id] || ''} rows={5}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />
              ) : (
                <Input placeholder="Your answer..." value={answers[q.id] || ''}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />
              )}
            </Card>
          ))}
          <Button onClick={submitExam} className="w-full" size="lg">Submit Exam</Button>
        </div>
      </SimpleWrapper>
    );
  }

  // No exam found for public access
  if (isPublicAccess && !candidateExam && !viewingResults && !isAuthenticated) {
    if (!examSearched) {
      return <SimpleWrapper><div className="flex items-center justify-center py-12"><div className="animate-pulse text-muted-foreground">Loading exam...</div></div></SimpleWrapper>;
    }
    // Check if it's a results link with valid code but results not released yet
    if (resultsCode) {
      const exam = exams.find(e => e.resultsCode === resultsCode);
      if (exam && !exam.resultsReleased) {
        return (
          <SimpleWrapper>
            <Card className="max-w-md mx-auto text-center p-8">
              <p className="text-muted-foreground">Results for this exam have not been released yet. Please check back later.</p>
            </Card>
          </SimpleWrapper>
        );
      }
    }
    // Check if exam code exists but exam ended
    if (examCode) {
      const exam = exams.find(e => e.accessCode === examCode);
      if (exam) {
        if (exam.isCompleted || !exam.isPublished) {
          return (
            <SimpleWrapper>
              <Card className="max-w-md mx-auto text-center p-8">
                <p className="text-muted-foreground">This exam has ended. Contact your examiner for results.</p>
              </Card>
            </SimpleWrapper>
          );
        }
        // exam is full
        const subs = examSubmissions.filter(s => s.examId === exam.id);
        if (subs.length >= exam.maxCandidates) {
          return (
            <SimpleWrapper>
              <Card className="max-w-md mx-auto text-center p-8">
                <p className="text-muted-foreground">This exam has reached the maximum number of candidates.</p>
              </Card>
            </SimpleWrapper>
          );
        }
      }
    }
    return (
      <SimpleWrapper>
        <Card className="max-w-md mx-auto text-center p-8">
          <p className="text-muted-foreground">
            {examCode ? 'This exam link is invalid or the exam is no longer available.' : 'Results not available.'}
          </p>
        </Card>
      </SimpleWrapper>
    );
  }

  // ===== RESULTS VIEW =====
  if (viewingResults) {
    const exam = exams.find(e => e.id === viewingResults);
    const subs = examSubmissions.filter(s => s.examId === viewingResults).sort((a, b) => (b.score || 0) - (a.score || 0));
    if (!exam) return <Wrapper><p className="text-muted-foreground text-center py-8">Results not found.</p></Wrapper>;

    // Viewing individual submission
    if (viewingSubmission) {
      const sub = subs.find(s => s.id === viewingSubmission);
      if (!sub) { setViewingSubmission(null); return null; }
      return (
        <Wrapper>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setViewingSubmission(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Results
              </Button>
              <h2 className="text-xl font-display font-bold">
                {sub.candidateInfo['Name'] || 'Candidate'} — {sub.score}/{sub.totalPoints} ({sub.totalPoints ? Math.round((sub.score! / sub.totalPoints) * 100) : 0}%)
              </h2>
            </div>
            <div className="space-y-3">
                {exam.questions.map((q, i) => {
                const studentAns = sub.answers[q.id] || '';
                const isCorrect = q.type === 'Multiple Choice'
                  ? studentAns === q.correctAnswer
                  : similarity(studentAns, q.correctAnswer) >= 0.80;
                return (
                  <Card key={q.id} className={cn('p-4', isCorrect ? 'border-[hsl(120,60%,45%)]/30' : 'border-destructive/30')}>
                    <p className="font-semibold mb-2">Q{i + 1}. {q.question} <Badge variant="outline" className="ml-1">{q.points}pt</Badge></p>
                    {q.options && (
                      <div className="ml-4 space-y-1 text-sm">
                        {q.options.map((o, oi) => (
                          <p key={oi} className={cn(
                            o === q.correctAnswer && 'text-[hsl(120,60%,35%)] font-bold',
                            o === studentAns && o !== q.correctAnswer && 'text-destructive line-through',
                          )}>
                            {String.fromCharCode(65 + oi)}. {o}
                            {o === q.correctAnswer && ' ✓'}
                            {o === studentAns && o !== q.correctAnswer && ' ✗'}
                          </p>
                        ))}
                      </div>
                    )}
                    {(q.type === 'Fill-in-the-gap' || q.type === 'Theory') && (
                      <div className="ml-4 text-sm space-y-1">
                        <p className={cn(isCorrect ? 'text-[hsl(120,60%,35%)]' : 'text-destructive')}>
                          Your answer: {studentAns || '(blank)'} {isCorrect ? '✓' : '✗'}
                          {q.type === 'Theory' && !isCorrect && studentAns && (
                            <span className="text-muted-foreground ml-2">({Math.round(similarity(studentAns, q.correctAnswer) * 100)}% match)</span>
                          )}
                        </p>
                        {!isCorrect && <p className="text-[hsl(120,60%,35%)] font-bold">Correct: {q.correctAnswer}</p>}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </Wrapper>
      );
    }

    return (
      <Wrapper>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setViewingResults(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="text-2xl font-display font-bold">{exam.title} — Results</h2>
            {isAuthenticated && (
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => copyToClipboard(getFullResultsLink(exam), `reslink`)}>
                {copiedId === 'reslink' ? <Check className="h-3 w-3 mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
                Copy Results Link
              </Button>
            )}
          </div>
          {exam.school && <p className="text-sm text-muted-foreground">School: {exam.school} | Level: {exam.level}</p>}
          {exam.internSet && <p className="text-sm text-muted-foreground">Set: {exam.internSet}</p>}
          <Card>
            <CardContent className="pt-6">
              {subs.length === 0 ? (
                <p className="text-muted-foreground">No submissions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      {exam.registrationFields.map(f => <TableHead key={f.id}>{f.label}</TableHead>)}
                      <TableHead>Score</TableHead>
                      <TableHead>%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subs.map((s, i) => (
                      <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewingSubmission(s.id)}>
                        <TableCell>{i + 1}</TableCell>
                        {exam.registrationFields.map(f => <TableCell key={f.id}>{s.candidateInfo[f.label] || '-'}</TableCell>)}
                        <TableCell className="font-semibold">{s.score}/{s.totalPoints}</TableCell>
                        <TableCell>{s.totalPoints ? Math.round((s.score! / s.totalPoints) * 100) : 0}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </Wrapper>
    );
  }

  // ===== EXAM BANK =====
  if (examBankOpen) {
    const activeDifficulty = examDifficulties.length > 0 ? examDifficulties : ['General'];
    return (
      <Wrapper>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setExamBankOpen(false)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="text-2xl font-display font-bold">Exam Bank</h2>
          </div>

          <Button onClick={() => setBankAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Question</Button>

          <Tabs defaultValue={activeDifficulty[0]}>
            <TabsList className="flex-wrap h-auto">
              {activeDifficulty.map((d: string) => (
                <TabsTrigger key={d} value={d}>{d}</TabsTrigger>
              ))}
            </TabsList>
            {activeDifficulty.map((d: string) => {
              const qs = examBank.filter(q => q.difficulty === d);
              return (
                <TabsContent key={d} value={d}>
                  {qs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No questions in "{d}" difficulty.</p>
                  ) : (
                    <div className="space-y-2">
                      {qs.map((q, i) => (
                        <Card key={q.id} className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{q.question}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px]">{q.type}</Badge>
                                <Badge variant="secondary" className="text-[10px]">{q.points}pt</Badge>
                              </div>
                              <p className="text-xs text-[hsl(120,60%,35%)] mt-1">Answer: {q.correctAnswer}</p>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => setExamBank(examBank.filter(x => x.id !== q.id))}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>

          <Dialog open={bankAddOpen} onOpenChange={setBankAddOpen}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Question to Bank</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Difficulty *</Label>
                  <Select value={bankDifficulty} onValueChange={setBankDifficulty}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                    <SelectContent>
                      {activeDifficulty.map((d: string) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={bankQType} onValueChange={(v: QuestionType) => setBankQType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Multiple Choice">Multiple Choice</SelectItem>
                      <SelectItem value="Fill-in-the-gap">Fill-in-the-gap</SelectItem>
                      <SelectItem value="Theory">Theory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Question *</Label><Textarea value={bankQText} onChange={e => setBankQText(e.target.value)} rows={bankQType === 'Theory' ? 4 : 2} /></div>
                {bankQType === 'Multiple Choice' && (
                  <div className="space-y-2">
                    {bankQOptions.map((o, i) => (
                      <Input key={i} placeholder={`Option ${String.fromCharCode(65 + i)}`} value={o}
                        onChange={e => setBankQOptions(bankQOptions.map((oo, ii) => ii === i ? e.target.value : oo))} />
                    ))}
                  </div>
                )}
                <div>
                  <Label>Correct Answer *</Label>
                  {bankQType === 'Multiple Choice' ? (
                    <Select value={bankQAnswer} onValueChange={setBankQAnswer}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select correct answer" /></SelectTrigger>
                      <SelectContent>
                        {bankQOptions.filter(o => o.trim()).map((o, i) => (
                          <SelectItem key={i} value={o}>{String.fromCharCode(65 + i)}. {o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : bankQType === 'Theory' ? (
                    <Textarea value={bankQAnswer} onChange={e => setBankQAnswer(e.target.value)} className="mt-1" rows={3} placeholder="Model answer (80%+ match = correct)" />
                  ) : (
                    <Input value={bankQAnswer} onChange={e => setBankQAnswer(e.target.value)} className="mt-1" />
                  )}
                </div>
                <div><Label>Points</Label><Input type="number" value={bankQPoints} onChange={e => setBankQPoints(e.target.value)} className="w-20" /></div>
                <Button onClick={addBankQuestion} className="w-full">Add to Bank</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Wrapper>
    );
  }

  // ===== EXAM DETAIL PAGE =====
  if (viewingExamId) {
    const exam = exams.find(e => e.id === viewingExamId);
    if (!exam) { setViewingExamId(null); return null; }
    const subs = examSubmissions.filter(s => s.examId === exam.id);
    const totalMarks = exam.questions.reduce((s, q) => s + q.points, 0);

    return (
      <Wrapper>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setViewingExamId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="text-2xl font-display font-bold">{exam.title}</h2>
            <div className="flex gap-2 ml-auto">
              {!exam.isPublished && !exam.isCompleted && <Badge variant="outline">Draft</Badge>}
              {exam.isPublished && !exam.isCompleted && <Badge className="bg-[hsl(200,70%,50%)]">Live</Badge>}
              {exam.isCompleted && !exam.resultsReleased && <Badge className="bg-[hsl(45,90%,50%)] text-[hsl(0,0%,15%)]">Ended</Badge>}
              {exam.resultsReleased && <Badge className="bg-[hsl(120,60%,45%)] text-[hsl(0,0%,100%)]">Results Released</Badge>}
            </div>
          </div>

          <Card className="p-4 bg-muted/30">
            <div className="flex flex-wrap gap-4 text-sm">
              <span><span className="text-muted-foreground">Type:</span> <strong>{exam.candidateType}</strong></span>
              {exam.school && <span><span className="text-muted-foreground">School:</span> <strong>{exam.school}</strong></span>}
              {exam.level && <span><span className="text-muted-foreground">Level:</span> <strong>{exam.level}</strong></span>}
              {exam.internSet && <span><span className="text-muted-foreground">Set:</span> <strong>{exam.internSet}</strong></span>}
            </div>
          </Card>

          <div className="flex flex-wrap gap-2">
            {!exam.isPublished && !exam.isCompleted && (
              <>
                <Button onClick={() => togglePublish(exam.id)}>Publish Exam</Button>
                <Button variant="outline" onClick={() => startEditExam(exam)}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => duplicateExam(exam)}>
              <Files className="h-4 w-4 mr-1" /> Duplicate
            </Button>
            {exam.isPublished && !exam.isCompleted && (
              <>
                <Button variant="destructive" onClick={() => togglePublish(exam.id)}>
                  <StopCircle className="h-4 w-4 mr-1" /> Unpublish (End Exam)
                </Button>
                <Button variant="outline" onClick={() => copyToClipboard(getFullExamLink(exam), `link-${exam.id}`)}>
                  {copiedId === `link-${exam.id}` ? <Check className="h-3 w-3 mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
                  Copy Exam Link
                </Button>
              </>
            )}
            {exam.isCompleted && !exam.resultsReleased && subs.length > 0 && (
              <Button onClick={() => releaseResults(exam.id)}>
                <Trophy className="h-4 w-4 mr-1" /> Release Result
              </Button>
            )}
            {exam.resultsReleased && (
              <>
                <Button variant="outline" onClick={() => setViewingResults(exam.id)}>
                  <Eye className="h-4 w-4 mr-1" /> View Results
                </Button>
                <Button variant="outline" onClick={() => copyToClipboard(getFullResultsLink(exam), `res-${exam.id}`)}>
                  {copiedId === `res-${exam.id}` ? <Check className="h-3 w-3 mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
                  Copy Results Link
                </Button>
              </>
            )}
          </div>

          {exam.isPublished && !exam.isCompleted && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Exam Link:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono break-all">{getFullExamLink(exam)}</code>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(getFullExamLink(exam), `fulllink-${exam.id}`)}>
                  {copiedId === `fulllink-${exam.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </Card>
          )}

          <Card className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground">Duration:</span> <span className="font-semibold">{exam.duration} min</span></div>
              <div><span className="text-muted-foreground">Max Candidates:</span> <span className="font-semibold">{exam.maxCandidates}</span></div>
              <div><span className="text-muted-foreground">Total Marks:</span> <span className="font-semibold">{totalMarks}</span></div>
              <div><span className="text-muted-foreground">Questions:</span> <span className="font-semibold">{exam.questions.length}</span></div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3">Questions & Answers ({exam.questions.length})</h3>
            <div className="space-y-3">
              {exam.questions.map((q, i) => (
                <div key={q.id} className="bg-muted rounded-lg p-4 text-sm">
                  <p className="font-medium">Q{i + 1}. {q.question} <Badge variant="outline" className="ml-1 text-xs">{q.points}pt · {q.type}</Badge></p>
                  {q.options && (
                    <div className="ml-4 mt-2 space-y-1">
                      {q.options.map((o, oi) => (
                        <p key={oi} className={cn(o === q.correctAnswer && 'font-bold text-[hsl(120,60%,35%)]')}>
                          {String.fromCharCode(65 + oi)}. {o} {o === q.correctAnswer && '✓'}
                        </p>
                      ))}
                    </div>
                  )}
                  {(q.type === 'Fill-in-the-gap' || q.type === 'Theory') && (
                    <p className="ml-4 mt-2 font-bold text-[hsl(120,60%,35%)]">Answer: {q.correctAnswer}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {subs.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold">Submissions ({subs.length})</h3>
                {exam.resultsReleased && (
                  <Button variant="outline" size="sm" onClick={() => exportSubmissionsToDoc(exam, subs)}>
                    <Download className="h-4 w-4 mr-1" /> Export
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    {exam.registrationFields.map(f => <TableHead key={f.id}>{f.label}</TableHead>)}
                    <TableHead>Score</TableHead>
                    <TableHead>%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.sort((a, b) => (b.score || 0) - (a.score || 0)).map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      {exam.registrationFields.map(f => <TableCell key={f.id}>{s.candidateInfo[f.label] || '-'}</TableCell>)}
                      <TableCell className="font-semibold">{s.score}/{s.totalPoints}</TableCell>
                      <TableCell>{s.totalPoints ? Math.round((s.score! / s.totalPoints) * 100) : 0}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3">Activity Log</h3>
            <div className="divide-y divide-border">
              {exam.logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No logs yet</p>
              ) : (
                exam.logs.map(log => (
                  <div key={log.id} className="py-2 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 bg-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{log.event}</p>
                      {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()} · {log.user}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </Wrapper>
    );
  }

  // ===== ADMIN LIST VIEW =====
  const canCreateExam = hasPermission('add_exam') || hasPermission('view_exam');
  const canEditExam = hasPermission('edit_exam') || hasPermission('add_exam') || hasPermission('view_exam');
  const canDeleteExam = hasPermission('delete_exam') || hasPermission('add_exam') || hasPermission('view_exam');

  return (
    <Wrapper>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-display font-bold">Exam Management</h2>
          <PageTip content="Create and manage exams. Publish to make live, share links. Unpublish (end exam) before releasing results. Only registered users with exam permissions can create exams." />
        </div>

        <div className="flex gap-2">
          {canCreateExam && (
            <>
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setEditingExamId(null); }}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Create Exam</Button></DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editingExamId ? 'Edit Exam' : 'Create Exam'}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Title</Label><Input value={eTitle} onChange={e => setETitle(e.target.value)} /></div>

                    <div>
                      <Label>Candidate Type</Label>
                      <Select value={eCandidateType} onValueChange={(v: CandidateType) => setECandidateType(v)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Student">Student</SelectItem>
                          <SelectItem value="Intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {eCandidateType === 'Student' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>School</Label>
                          {examSchools.length > 0 ? (
                            <Select value={eSchool} onValueChange={setESchool}>
                              <SelectTrigger className="mt-1"><SelectValue placeholder="Select school" /></SelectTrigger>
                              <SelectContent>{examSchools.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : (
                            <Input value={eSchool} onChange={e => setESchool(e.target.value)} className="mt-1" placeholder="School name" />
                          )}
                        </div>
                        <div>
                          <Label>Level</Label>
                          {examLevels.length > 0 ? (
                            <Select value={eLevel} onValueChange={setELevel}>
                              <SelectTrigger className="mt-1"><SelectValue placeholder="Select level" /></SelectTrigger>
                              <SelectContent>{examLevels.map((l: string) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : (
                            <Input value={eLevel} onChange={e => setELevel(e.target.value)} className="mt-1" placeholder="e.g. 300 Level" />
                          )}
                        </div>
                      </div>
                    )}

                    {eCandidateType === 'Intern' && (
                      <div>
                        <Label>Set (e.g. 2010/2011)</Label>
                        {examInternSets.length > 0 ? (
                          <Select value={eInternSet} onValueChange={setEInternSet}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select set" /></SelectTrigger>
                            <SelectContent>{examInternSets.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Input value={eInternSet} onChange={e => setEInternSet(e.target.value)} className="mt-1" placeholder="e.g. 2010/2011" />
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Duration (minutes)</Label><Input type="number" value={eDuration} onChange={e => setEDuration(e.target.value)} /></div>
                      <div><Label>Max Candidates</Label><Input type="number" value={eMaxCandidates} onChange={e => setEMaxCandidates(e.target.value)} /></div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-base font-semibold">Registration Fields</Label>
                        <Button size="sm" variant="outline" onClick={addField}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                      </div>
                      {eFields.map(f => (
                        <div key={f.id} className="flex gap-2 items-center mb-2">
                          <Input value={f.label} onChange={e => setEFields(eFields.map(ff => ff.id === f.id ? { ...ff, label: e.target.value } : ff))} placeholder="Field label" />
                          <div className="flex items-center gap-1">
                            <Checkbox checked={f.required} onCheckedChange={v => setEFields(eFields.map(ff => ff.id === f.id ? { ...ff, required: !!v } : ff))} />
                            <span className="text-xs">Req</span>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => removeField(f.id)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-base font-semibold">Questions ({eQuestions.length})</Label>
                        <Button size="sm" variant="secondary" onClick={() => setGenerateOpen(true)}>
                          <BookOpen className="h-3 w-3 mr-1" /> Generate from Bank
                        </Button>
                      </div>
                      <Card className="p-3 mt-2 space-y-3">
                        <Select value={qType} onValueChange={(v: QuestionType) => setQType(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Multiple Choice">Multiple Choice (OBJ)</SelectItem>
                            <SelectItem value="Fill-in-the-gap">Fill-in-the-gap</SelectItem>
                            <SelectItem value="Theory">Theory</SelectItem>
                          </SelectContent>
                        </Select>
                        <Textarea placeholder="Question text" value={qText} onChange={e => setQText(e.target.value)} rows={qType === 'Theory' ? 4 : 2} />
                        {qType === 'Multiple Choice' && (
                          <div className="space-y-2">
                            {qOptions.map((o, i) => (
                              <Input key={i} placeholder={`Option ${String.fromCharCode(65 + i)}`} value={o}
                                onChange={e => setQOptions(qOptions.map((oo, ii) => ii === i ? e.target.value : oo))} />
                            ))}
                          </div>
                        )}
                        <div>
                          <Label>Correct Answer *</Label>
                          {qType === 'Multiple Choice' ? (
                            <Select value={qAnswer} onValueChange={setQAnswer}>
                              <SelectTrigger className="mt-1"><SelectValue placeholder="Select correct answer from options" /></SelectTrigger>
                              <SelectContent>
                                {qOptions.filter(o => o.trim()).map((o, i) => (
                                  <SelectItem key={i} value={o}>{String.fromCharCode(65 + i)}. {o}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : qType === 'Theory' ? (
                            <Textarea value={qAnswer} onChange={e => setQAnswer(e.target.value)} placeholder="Model answer (80%+ match = correct)" className="mt-1" rows={3} />
                          ) : (
                            <Input value={qAnswer} onChange={e => setQAnswer(e.target.value)} placeholder="Required" className="mt-1" />
                          )}
                        </div>
                        <div><Label>Points</Label><Input type="number" value={qPoints} onChange={e => setQPoints(e.target.value)} className="w-20" /></div>
                        <Button size="sm" onClick={addQuestion} disabled={!qText.trim() || !qAnswer.trim()}><Plus className="h-3 w-3 mr-1" /> Add Question</Button>
                      </Card>
                      {eQuestions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {eQuestions.map((q, i) => (
                            <div key={q.id} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                              <span>Q{i + 1}: {q.question.slice(0, 50)}... ({q.type}) — Ans: {q.correctAnswer.slice(0, 30)}{q.correctAnswer.length > 30 ? '...' : ''}</span>
                              <Button size="icon" variant="ghost" onClick={() => setEQuestions(eQuestions.filter(qq => qq.id !== q.id))}><X className="h-3 w-3" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button onClick={createExam} className="w-full" disabled={!eTitle.trim() || eQuestions.length === 0}>{editingExamId ? 'Save Changes' : 'Create Exam'}</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Generate from Bank Dialog */}
              <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle>Generate Questions from Bank</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Difficulty *</Label>
                      <Select value={genDifficulty} onValueChange={setGenDifficulty}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                        <SelectContent>
                          {(examDifficulties.length > 0 ? examDifficulties : ['General']).map((d: string) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Question Type</Label>
                      <Select value={genType} onValueChange={(v) => setGenType(v as QuestionType | 'All')}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Types</SelectItem>
                          <SelectItem value="Multiple Choice">Multiple Choice</SelectItem>
                          <SelectItem value="Fill-in-the-gap">Fill-in-the-gap</SelectItem>
                          <SelectItem value="Theory">Theory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Number of Questions</Label>
                      <Input type="number" value={genCount} onChange={e => setGenCount(e.target.value)} min="1" className="mt-1" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Available: {examBank.filter(q => q.difficulty === genDifficulty && (genType === 'All' || q.type === genType)).length} question(s)
                    </p>
                    <Button onClick={generateFromBank} className="w-full" disabled={!genDifficulty}>Generate & Add</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={() => setExamBankOpen(true)}>
                <BookOpen className="h-4 w-4 mr-2" /> Exam Bank
              </Button>
            </>
          )}
        </div>

        <div className="space-y-3">
          {exams.map(exam => {
            const subs = examSubmissions.filter(s => s.examId === exam.id);
            const totalMarks = exam.questions.reduce((s, q) => s + q.points, 0);
            return (
              <Card key={exam.id} className={cn('p-4 cursor-pointer hover:shadow-md transition-shadow', !exam.isPublished && !exam.isCompleted && 'border-dashed opacity-80')}
                onClick={() => setViewingExamId(exam.id)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{exam.title}</h3>
                    <div className="flex gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {exam.duration}min</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {subs.length}/{exam.maxCandidates}</span>
                      <span>{exam.questions.length} Qs · {totalMarks} marks</span>
                      <span>{exam.candidateType}{exam.school ? ` · ${exam.school}` : ''}{exam.internSet ? ` · Set ${exam.internSet}` : ''}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {!exam.isPublished && !exam.isCompleted && <Badge variant="outline">Draft</Badge>}
                      {exam.isPublished && !exam.isCompleted && <Badge className="bg-[hsl(200,70%,50%)]">Live</Badge>}
                      {exam.isCompleted && !exam.resultsReleased && <Badge className="bg-[hsl(45,90%,50%)] text-[hsl(0,0%,15%)]">Ended</Badge>}
                      {exam.resultsReleased && <Badge className="bg-[hsl(120,60%,45%)] text-[hsl(0,0%,100%)]">Results Released</Badge>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {exams.length === 0 && <p className="text-center text-muted-foreground py-8">No exams created yet.</p>}
        </div>
      </div>
    </Wrapper>
  );
};

export default ExamPage;
