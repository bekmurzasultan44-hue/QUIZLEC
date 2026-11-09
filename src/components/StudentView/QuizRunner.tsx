import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { TestModel, SubmissionModel } from '../../types';

const OPTION_LETTERS = ['А', 'Б', 'В', 'Г', 'Д'];

interface QuizRunnerProps {
  test: TestModel;
  studentName: string;
  groupName: string;
  onFinished: (submission: SubmissionModel) => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  test,
  studentName,
  groupName,
  onFinished,
}) => {
  const sessionKey = `quizlec_session_${test.id}`;

  // 1. Restore or initialize session from localStorage to survive page refresh
  const [session] = useState(() => {
    try {
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.testId === test.id) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read session from localStorage', e);
    }
    // Brand new session
    const initialEndTime = Date.now() + test.timerMinutes * 60 * 1000;
    const initialAnswers = new Array(test.questions.length).fill(-1);
    const newSession = {
      testId: test.id,
      studentName,
      groupName,
      answers: initialAnswers,
      endTime: initialEndTime,
      submitted: false,
    };
    try {
      localStorage.setItem(sessionKey, JSON.stringify(newSession));
    } catch {}
    return newSession;
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<number[]>(session.answers || new Array(test.questions.length).fill(-1));
  
  // Calculate remaining seconds based on absolute endTime
  const calculateRemainingSeconds = () => {
    const remaining = Math.max(0, Math.floor((session.endTime - Date.now()) / 1000));
    return remaining;
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(calculateRemainingSeconds);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Synchronous double-submission lock (Scenario 5)
  const submittedRef = useRef(Boolean(session.submitted));

  // Sync answers with localStorage whenever they change
  const handleSelectOption = (optIndex: number) => {
    if (isSubmitting || submittedRef.current) return;
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optIndex;
    setAnswers(newAnswers);

    try {
      const currentStored = JSON.parse(localStorage.getItem(sessionKey) || '{}');
      currentStored.answers = newAnswers;
      localStorage.setItem(sessionKey, JSON.stringify(currentStored));
    } catch (e) {
      console.warn('Failed to update answers in localStorage', e);
    }
  };

  // 2. Countdown timer with auto-submit when expired (Scenario 4)
  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!submittedRef.current) {
        handleSubmitTest(true);
      }
      return;
    }

    const timer = setInterval(() => {
      const remaining = calculateRemainingSeconds();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        if (!submittedRef.current) {
          handleSubmitTest(true);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 3. Submit test with server-side answer verification (Scenarios 5 & 6)
  const handleSubmitTest = async (isTimeout = false) => {
    // Prevent double submissions immediately
    if (submittedRef.current || isSubmitting) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      // Mark as submitted in localStorage
      const currentStored = JSON.parse(localStorage.getItem(sessionKey) || '{}');
      currentStored.submitted = true;
      localStorage.setItem(sessionKey, JSON.stringify(currentStored));
    } catch {}

    // Send answers to server: server computes score and creates submission in Firestore
    try {
      const verifyRes = await fetch('/api/verify-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: test.id,
          studentName,
          groupName,
          answers,
        }),
      });

      if (!verifyRes.ok) {
        const errJson = await verifyRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Ошибка проверки и сохранения результатов на сервере.');
      }

      const verifyData = await verifyRes.json();
      const serverSubmission: SubmissionModel = verifyData.submission;

      // Save completed result to localStorage for reload safety
      try {
        localStorage.setItem(`quizlec_result_${test.id}`, JSON.stringify(serverSubmission));
      } catch {}

      onFinished(serverSubmission);
    } catch (err: any) {
      console.error('Submission error:', err);
      alert(err.message || 'Произошла ошибка при отправке результатов на сервер. Попробуйте еще раз.');
      submittedRef.current = false;
      setIsSubmitting(false);
    }
  };

  const totalSeconds = Math.max(1, test.timerMinutes * 60);
  const timePercent = Math.min(100, Math.max(0, (secondsLeft / totalSeconds) * 100));
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  // Timer color states
  const isCritical = secondsLeft < 60; // under 1 minute
  const isUrgent = secondsLeft < 120;   // under 2 minutes
  const isWarning = timePercent <= 30;  // under 30% time

  // Gauge colors
  const timerColor = isUrgent
    ? 'text-red-400 stroke-red-500'
    : isWarning
    ? 'text-amber-400 stroke-amber-500'
    : 'text-emerald-400 stroke-emerald-500';

  const timerBgColor = isUrgent
    ? 'bg-red-950/80 border-red-500/70 shadow-red-500/20'
    : isWarning
    ? 'bg-amber-950/70 border-amber-500/60 shadow-amber-500/15'
    : 'bg-slate-800/90 border-slate-700/80 shadow-emerald-500/10';

  const timerBarColor = isUrgent
    ? 'bg-gradient-to-r from-red-600 to-rose-500'
    : isWarning
    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
    : 'bg-gradient-to-r from-emerald-500 to-teal-400';

  const currentQ = test.questions[currentQuestionIndex];
  const answeredCount = answers.filter((a) => a !== -1).length;
  const answeredPercent = Math.round((answeredCount / test.questions.length) * 100);

  // Circular gauge circumference for r=16: 2 * Math.PI * 16 ≈ 100.53
  const circumference = 100.53;
  const strokeDashoffset = circumference - (timePercent / 100) * circumference;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Sticky Header with Visual Countdown Timer and Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl mb-6 sticky top-20 z-30 backdrop-blur-md bg-slate-900/95">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="text-xs text-slate-400">
              Студент: <strong className="text-white">{studentName}</strong> ({groupName})
            </div>
            <div className="text-xs text-sky-400 font-semibold mt-0.5">
              Вопрос {currentQuestionIndex + 1} из {test.questions.length} • Отвечено: {answeredCount} ({answeredPercent}%)
            </div>
          </div>

          {/* Visual Radial Countdown Timer Badge */}
          <div
            className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all shadow-lg ${timerBgColor} ${
              isCritical ? 'animate-pulse ring-2 ring-red-500/50' : ''
            }`}
          >
            {/* SVG Circular Countdown Ring */}
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <svg className="w-9 h-9 -rotate-90 transform" viewBox="0 0 40 40">
                {/* Background track */}
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  className="stroke-slate-700/60"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                {/* Countdown progress stroke */}
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  className={`${timerColor} transition-all duration-1000 ease-linear`}
                  strokeWidth="3.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <Clock className={`w-4 h-4 absolute ${isUrgent ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`} />
            </div>

            {/* Time Remaining Digital Readout */}
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block leading-tight">
                {isCritical ? 'Осталось мало времени!' : 'Осталось времени'}
              </span>
              <span
                className={`font-mono text-base sm:text-lg font-black tracking-wider leading-none ${
                  isUrgent ? 'text-red-300' : isWarning ? 'text-amber-300' : 'text-emerald-400'
                }`}
              >
                {timeFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Countdown Progress Bar (Linear time indicator) */}
        <div className="mt-3.5 pt-2.5 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-red-500 animate-ping' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              Таймер теста: {Math.round(timePercent)}% времени осталось
            </span>
            <span className="font-mono text-slate-400">
              Всего {test.timerMinutes} мин
            </span>
          </div>

          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerBarColor}`}
              style={{ width: `${timePercent}%` }}
            />
          </div>
        </div>

        {/* Question Grid */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800/80">
          {test.questions.map((_, idx) => {
            const isAnswered = answers[idx] !== -1;
            const isCurrent = idx === currentQuestionIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                  isCurrent
                    ? 'ring-2 ring-sky-400 bg-sky-500 text-white'
                    : isAnswered
                    ? 'bg-slate-800 text-slate-200 border border-slate-700'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Critical Countdown Alert Banner (under 60s) */}
        {isCritical && (
          <div className="mt-3 py-1.5 px-3 bg-red-950/80 border border-red-700/80 rounded-xl text-xs text-red-200 flex items-center gap-2 animate-bounce">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Внимание: осталось менее 1 минуты! По окончанию времени ответы отправятся автоматически.</span>
          </div>
        )}
      </div>

      {/* Question Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-sm flex items-center justify-center">
            {currentQuestionIndex + 1}
          </span>
          <span className="text-xs text-slate-400">Выберите один правильный вариант</span>
        </div>

        {/* Question Text */}
        <h2 className="text-lg sm:text-xl font-bold text-white mb-6 leading-relaxed">
          {currentQ.text}
        </h2>

        {/* 5 Options - No correct answers revealed to student */}
        <div className="space-y-3">
          {currentQ.options.map((optText, optIdx) => {
            const isSelected = answers[currentQuestionIndex] === optIdx;
            return (
              <button
                key={optIdx}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSelectOption(optIdx)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3.5 group cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-500 text-white shadow-md shadow-sky-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-200'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    isSelected
                      ? 'bg-sky-500 text-white font-black'
                      : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
                  }`}
                >
                  {OPTION_LETTERS[optIdx]}
                </div>
                <span className="text-sm sm:text-base leading-snug pt-0.5">{optText}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={currentQuestionIndex === 0 || isSubmitting}
          onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
          className={`flex items-center gap-1.5 px-4 sm:px-5 py-3 rounded-xl font-semibold text-xs sm:text-sm border transition ${
            currentQuestionIndex === 0
              ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        {currentQuestionIndex < test.questions.length - 1 ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
            className="flex items-center gap-1.5 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-sky-600/25 active:scale-95"
          >
            <span>Далее</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setShowConfirmModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-600/25 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Отправка...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Завершить тест</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Manual Finish Link */}
      <div className="mt-6 text-center">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setShowConfirmModal(true)}
          className="text-xs text-slate-400 hover:text-slate-300 underline disabled:opacity-50"
        >
          Завершить досрочно ({answeredCount} из {test.questions.length} отвечено)
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Завершить тестирование?</h3>
            <p className="text-xs text-slate-300 mb-6">
              Вы ответили на <strong className="text-sky-400">{answeredCount}</strong> из{' '}
              <strong className="text-white">{test.questions.length}</strong> вопросов.
              {answeredCount < test.questions.length && (
                <span className="block mt-1 text-amber-300">
                  Неотвеченные вопросы будут засчитаны как неверные.
                </span>
              )}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition border border-slate-700"
              >
                Вернуться
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmitTest(false)}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Отправка...</span>
                  </>
                ) : (
                  <span>Да, завершить</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
