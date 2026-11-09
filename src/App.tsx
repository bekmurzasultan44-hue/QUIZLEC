import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { Question, TestModel, SubmissionModel } from './types';
import { Navbar } from './components/Navbar';
import { LectureUploader } from './components/TeacherDashboard/LectureUploader';
import { QuestionEditor } from './components/TeacherDashboard/QuestionEditor';
import { SavedTestsList } from './components/TeacherDashboard/SavedTestsList';
import { LaunchModal } from './components/TeacherDashboard/LaunchModal';
import { LiveResultsTable } from './components/TeacherDashboard/LiveResultsTable';
import { StudentEntry } from './components/StudentView/StudentEntry';
import { QuizRunner } from './components/StudentView/QuizRunner';
import { QuizResult } from './components/StudentView/QuizResult';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'teacher-create' | 'teacher-saved' | 'teacher-results' | 'student'
  >('teacher-create');

  // Teacher State
  const [activeTest, setActiveTest] = useState<TestModel | null>(null);
  const [savedTests, setSavedTests] = useState<TestModel[]>([]);
  const [isLoadingSavedTests, setIsLoadingSavedTests] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState<boolean>(false);

  // Student State
  const [studentTest, setStudentTest] = useState<TestModel | null>(null);
  const [isLoadingStudentTest, setIsLoadingStudentTest] = useState<boolean>(false);
  const [studentName, setStudentName] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [studentStage, setStudentStage] = useState<'entry' | 'taking' | 'result'>('entry');
  const [completedSubmission, setCompletedSubmission] = useState<SubmissionModel | null>(null);

  // 1. Initial Load: Check URL parameters for ?testId=XYZ and restore state
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const testIdFromUrl = urlParams.get('testId');

    if (testIdFromUrl) {
      setCurrentTab('student');
      loadTestForStudent(testIdFromUrl);

      // Check if student already has a session or result for this test in localStorage
      try {
        const savedResult = localStorage.getItem(`quizlec_result_${testIdFromUrl}`);
        if (savedResult) {
          setCompletedSubmission(JSON.parse(savedResult));
          setStudentStage('result');
        } else {
          const savedSession = localStorage.getItem(`quizlec_session_${testIdFromUrl}`);
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (parsed.testId === testIdFromUrl) {
              setStudentName(parsed.studentName || '');
              setGroupName(parsed.groupName || '');
              if (parsed.submitted) {
                setStudentStage('result');
              } else {
                setStudentStage('taking');
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error reading student session from localStorage', e);
      }
    } else {
      // Check if teacher had an active test in localStorage
      const lastActiveId = localStorage.getItem('quizlec_teacher_active_test_id');
      loadSavedTests(lastActiveId);
    }
  }, []);

  // Fetch all saved tests for teacher
  const loadSavedTests = async (preferredActiveId?: string | null) => {
    setIsLoadingSavedTests(true);
    try {
      const snap = await getDocs(collection(db, 'tests'));
      const list: TestModel[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<TestModel, 'id'>) });
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSavedTests(list);

      // Restore active test
      if (preferredActiveId) {
        const found = list.find((t) => t.id === preferredActiveId);
        if (found) {
          setActiveTest(found);
          return;
        }
      }

      if (!activeTest && list.length > 0) {
        setActiveTest(list[0]);
      }
    } catch (err) {
      console.warn('Could not load saved tests from Firestore:', err);
    } finally {
      setIsLoadingSavedTests(false);
    }
  };

  // Load specific test for student (sanitized without correctOptionIndex)
  const loadTestForStudent = async (testId: string) => {
    setIsLoadingStudentTest(true);
    try {
      const docRef = doc(db, 'tests', testId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const loaded = { id: docSnap.id, ...(docSnap.data() as Omit<TestModel, 'id'>) };
        // SCENARIO 6: Sanitize questions so correctOptionIndex is never in student state
        const sanitizedQuestions = loaded.questions.map((q) => ({
          id: q.id,
          text: q.text,
          options: q.options,
        }));
        setStudentTest({
          ...loaded,
          questions: sanitizedQuestions as Question[],
        });
      } else {
        alert('Тест с таким идентификатором не найден.');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tests/${testId}`);
    } finally {
      setIsLoadingStudentTest(false);
    }
  };

  // Teacher: Save test to Firestore and isolate answer keys
  const handleSaveToDatabase = async () => {
    if (!activeTest) return;
    setIsSaving(true);
    setSaveSuccessMessage(null);

    try {
      const testToSave = {
        ...activeTest,
        updatedAt: new Date().toISOString(),
      };

      // 1. Save keys to server vault & admin Firestore
      const keys = activeTest.questions.map((q) => q.correctOptionIndex ?? 0);
      try {
        await fetch('/api/save-test-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId: activeTest.id, keys }),
        });
      } catch (e) {
        console.warn('Failed to sync keys with server vault:', e);
      }

      // 2. Save main test document
      await setDoc(doc(db, 'tests', activeTest.id), testToSave);
      localStorage.setItem('quizlec_teacher_active_test_id', activeTest.id);

      setSaveSuccessMessage('Тест успешно сохранен в базе данных Firestore!');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
      loadSavedTests(activeTest.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tests/${activeTest.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Teacher: Launch test
  const handleLaunchTest = async (testToLaunch?: TestModel) => {
    const target = testToLaunch || activeTest;
    if (!target) return;

    try {
      const updated = { ...target, status: 'active' as const };
      await setDoc(doc(db, 'tests', target.id), updated);

      // Sync keys to server
      const keys = updated.questions.map((q) => q.correctOptionIndex ?? 0);
      try {
        await fetch('/api/save-test-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId: target.id, keys }),
        });
      } catch (e) {
        console.warn('Failed to sync keys with server vault:', e);
      }

      setActiveTest(updated);
      localStorage.setItem('quizlec_teacher_active_test_id', target.id);
      setShowLaunchModal(true);
      loadSavedTests(target.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tests/${target.id}`);
      setShowLaunchModal(true);
    }
  };

  // Teacher: Delete test
  const handleDeleteTest = async (testId: string) => {
    try {
      await deleteDoc(doc(db, 'tests', testId));
      if (activeTest?.id === testId) {
        setActiveTest(null);
      }
      loadSavedTests();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tests/${testId}`);
    }
  };

  // Teacher: When generated from lecture
  const handleGeneratedTest = (data: {
    title: string;
    questions: Question[];
    timerMinutes: number;
    questionCount: number;
  }) => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newTest: TestModel = {
      id: `test-${Date.now()}`,
      title: data.title,
      timerMinutes: data.timerMinutes,
      questionCount: data.questions.length,
      questions: data.questions,
      createdAt: new Date().toISOString(),
      status: 'draft',
      code: randomCode,
    };

    setActiveTest(newTest);
    // Sync keys with server
    const keys = newTest.questions.map((q) => q.correctOptionIndex ?? 0);
    fetch('/api/save-test-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId: newTest.id, keys }),
    }).catch((e) => console.warn('Failed to sync generated keys with server:', e));

    // Auto-save to database
    setDoc(doc(db, 'tests', newTest.id), newTest)
      .then(() => loadSavedTests())
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `tests/${newTest.id}`));
  };

  // Student flow handlers
  const handleStartQuiz = (sName: string, gName: string) => {
    setStudentName(sName);
    setGroupName(gName);
    setStudentStage('taking');
  };

  const handleStudentFinished = (submission: SubmissionModel) => {
    setCompletedSubmission(submission);
    setStudentStage('result');
  };

  const handleLookupTestByCode = (code: string) => {
    const found = savedTests.find(
      (t) => (t.code && t.code.toUpperCase() === code) || t.id.toUpperCase().includes(code)
    );
    if (found) {
      setStudentTest(found);
    } else {
      alert(`Тест с кодом ${code} не найден.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'student' && !studentTest && activeTest) {
            setStudentTest(activeTest);
          }
        }}
        activeTestTitle={activeTest?.title}
        hasActiveTest={Boolean(activeTest)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 1. TEACHER: CREATE & EDIT */}
        {currentTab === 'teacher-create' && (
          <div>
            <LectureUploader
              onGenerated={handleGeneratedTest}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
            />

            {activeTest && (
              <QuestionEditor
                test={activeTest}
                onUpdateTest={setActiveTest}
                onSaveToDatabase={handleSaveToDatabase}
                onLaunchTest={() => handleLaunchTest()}
                isSaving={isSaving}
                saveSuccessMessage={saveSuccessMessage}
              />
            )}
          </div>
        )}

        {/* 2. TEACHER: SAVED TESTS LIST */}
        {currentTab === 'teacher-saved' && (
          <SavedTestsList
            tests={savedTests}
            isLoading={isLoadingSavedTests}
            onSelectTest={(test) => {
              setActiveTest(test);
              setCurrentTab('teacher-create');
            }}
            onLaunchTest={(test) => {
              setActiveTest(test);
              handleLaunchTest(test);
            }}
            onViewResults={(test) => {
              setActiveTest(test);
              setCurrentTab('teacher-results');
            }}
            onDeleteTest={handleDeleteTest}
            onCreateNew={() => setCurrentTab('teacher-create')}
          />
        )}

        {/* 3. TEACHER: REAL-TIME LIVE RESULTS */}
        {currentTab === 'teacher-results' && (
          activeTest ? (
            <LiveResultsTable
              test={activeTest}
              onShowQr={() => setShowLaunchModal(true)}
            />
          ) : (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-sm text-slate-400 mb-4">Выберите тест для просмотра результатов в реальном времени</p>
              <button
                onClick={() => setCurrentTab('teacher-saved')}
                className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold"
              >
                К списку тестов
              </button>
            </div>
          )
        )}

        {/* 4. STUDENT VIEW */}
        {currentTab === 'student' && (
          <div>
            {isLoadingStudentTest ? (
              <div className="py-24 text-center">
                <Loader2 className="w-10 h-10 text-sky-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Загрузка данных теста...</p>
              </div>
            ) : studentStage === 'entry' ? (
              <StudentEntry
                test={studentTest || activeTest}
                onStartQuiz={handleStartQuiz}
                onLookupTestByCode={handleLookupTestByCode}
              />
            ) : studentStage === 'taking' && (studentTest || activeTest) ? (
              <QuizRunner
                test={studentTest || activeTest!}
                studentName={studentName}
                groupName={groupName}
                onFinished={handleStudentFinished}
              />
            ) : studentStage === 'result' && completedSubmission ? (
              <QuizResult
                submission={completedSubmission}
                testTitle={(studentTest || activeTest)?.title || 'Тест по лекции'}
                onReset={() => {
                  setStudentStage('entry');
                  setCompletedSubmission(null);
                }}
              />
            ) : null}
          </div>
        )}
      </main>

      {/* Launch Modal with Big Projector QR */}
      {showLaunchModal && activeTest && (
        <LaunchModal
          test={activeTest}
          onClose={() => setShowLaunchModal(false)}
          onViewResults={() => {
            setShowLaunchModal(false);
            setCurrentTab('teacher-results');
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-400">
        <p>QuizLec • Платформа онлайн-тестирования студентов по лекциям • Gemini Flash & Firebase Firestore</p>
      </footer>
    </div>
  );
}
