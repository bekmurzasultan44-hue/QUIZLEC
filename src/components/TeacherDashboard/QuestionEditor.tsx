import React, { useState } from 'react';
import {
  Trash2,
  Plus,
  Save,
  Play,
  FileDown,
  FileType,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Edit3,
  StopCircle,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { Question, TestModel, isTestExpired, getTestRemainingMinutes } from '../../types';
import { exportTestToDocx, exportTestToPdf } from '../../lib/exportUtils';

const OPTION_LETTERS = ['А', 'Б', 'В', 'Г', 'Д'];

interface QuestionEditorProps {
  test: TestModel;
  onUpdateTest: (updated: TestModel) => void;
  onSaveToDatabase: () => Promise<void>;
  onLaunchTest: () => void;
  onDeleteTest?: (testId: string) => Promise<void>;
  onStopTest?: (testId: string) => Promise<void>;
  onResumeTest?: (testId: string) => Promise<void>;
  isSaving: boolean;
  saveSuccessMessage: string | null;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  test,
  onUpdateTest,
  onSaveToDatabase,
  onLaunchTest,
  onDeleteTest,
  onStopTest,
  onResumeTest,
  isSaving,
  saveSuccessMessage,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const expired = isTestExpired(test);
  const remainingMinutes = getTestRemainingMinutes(test);
  const isLive = test.status === 'active' && !expired;

  const handleTitleChange = (newTitle: string) => {
    onUpdateTest({ ...test, title: newTitle });
  };

  const handleTimerChange = (minutes: number) => {
    onUpdateTest({ ...test, timerMinutes: minutes });
  };

  const handleQuestionTextChange = (qIndex: number, text: string) => {
    const updatedQuestions = [...test.questions];
    updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], text };
    onUpdateTest({ ...test, questions: updatedQuestions });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, optText: string) => {
    const updatedQuestions = [...test.questions];
    const newOptions = [...updatedQuestions[qIndex].options] as [string, string, string, string, string];
    newOptions[optIndex] = optText;
    updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], options: newOptions };
    onUpdateTest({ ...test, questions: updatedQuestions });
  };

  const handleCorrectOptionChange = (qIndex: number, correctOptionIndex: number) => {
    const updatedQuestions = [...test.questions];
    updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], correctOptionIndex };
    onUpdateTest({ ...test, questions: updatedQuestions });
  };

  const handleDeleteQuestion = (qIndex: number) => {
    if (test.questions.length <= 1) {
      alert('В тесте должен оставаться хотя бы один вопрос.');
      return;
    }
    const updatedQuestions = test.questions.filter((_, idx) => idx !== qIndex);
    onUpdateTest({
      ...test,
      questions: updatedQuestions,
      questionCount: updatedQuestions.length,
    });
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q-custom-${Date.now()}`,
      text: 'Новый вопрос',
      options: ['Вариант 1', 'Вариант 2', 'Вариант 3', 'Вариант 4', 'Вариант 5'],
      correctOptionIndex: 0,
    };
    const updatedQuestions = [...test.questions, newQ];
    onUpdateTest({
      ...test,
      questions: updatedQuestions,
      questionCount: updatedQuestions.length,
    });
  };

  const confirmDeleteTest = async () => {
    if (!onDeleteTest) return;
    setIsDeleting(true);
    try {
      await onDeleteTest(test.id);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Header & Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-20 z-20 backdrop-blur-md bg-slate-900/95">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded">
                Редактор вопросов
              </span>
              <span className="text-xs text-slate-400">
                Всего вопросов: <strong className="text-white">{test.questions.length}</strong>
              </span>

              {isLive ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Приём активен (осталось {remainingMinutes} мин)
                </span>
              ) : expired || test.status === 'completed' ? (
                <span className="text-xs font-bold text-rose-300 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded">
                  Приём закрыт
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded">
                  Черновик
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={test.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Название теста"
                className="w-full text-xl sm:text-2xl font-bold text-white bg-slate-800/70 border border-slate-700/80 rounded-xl px-3.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Quick Settings & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-300">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Таймер студента:</span>
              <select
                value={test.timerMinutes}
                onChange={(e) => handleTimerChange(Number(e.target.value))}
                className="bg-slate-900 text-white font-bold rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none"
              >
                {[5, 10, 15, 20, 25, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} мин
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onSaveToDatabase}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs sm:text-sm rounded-xl border border-slate-700 transition shadow"
            >
              <Save className="w-4 h-4 text-sky-400" />
              <span>{isSaving ? 'Сохранение...' : 'Сохранить в базу'}</span>
            </button>

            <button
              onClick={onLaunchTest}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-600/25 active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isLive ? 'QR-код теста' : 'Запустить (QR-код)'}</span>
            </button>

            {isLive && onStopTest && (
              <button
                onClick={() => onStopTest(test.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-semibold transition"
                title="Закрыть приём ответов досрочно"
              >
                <StopCircle className="w-4 h-4" />
                <span>Завершить приём</span>
              </button>
            )}

            {!isLive && (expired || test.status === 'completed') && onResumeTest && (
              <button
                onClick={() => onResumeTest(test.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-semibold transition"
                title="Открыть приём ответов на 1 час"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Открыть на 1 час</span>
              </button>
            )}

            {onDeleteTest && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-950 text-rose-400 border border-rose-800/60 rounded-xl text-xs font-semibold transition"
                title="Удалить этот тест"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить тест</span>
              </button>
            )}

            {/* Export Dropdown / Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportTestToDocx(test)}
                title="Экспортировать тест и ключи ответов в Word (.docx)"
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-950/70 hover:bg-blue-900 text-blue-200 border border-blue-800 rounded-xl text-xs font-medium transition"
              >
                <FileType className="w-4 h-4 text-blue-400" />
                <span>Word</span>
              </button>

              <button
                onClick={() => exportTestToPdf(test)}
                title="Экспортировать тест и ключи ответов в PDF"
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-xl text-xs font-medium transition"
              >
                <FileDown className="w-4 h-4 text-rose-400" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>

        {saveSuccessMessage && (
          <div className="mt-3 py-2 px-3 bg-emerald-950/70 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {test.questions.map((question, qIdx) => (
          <div
            key={question.id || qIdx}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md transition-all hover:border-slate-700"
          >
            {/* Question Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold text-sm flex items-center justify-center">
                  {qIdx + 1}
                </span>
                <span className="text-xs text-slate-400 font-medium">Вопрос</span>
              </div>

              <button
                onClick={() => handleDeleteQuestion(qIdx)}
                className="text-slate-500 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-slate-800"
                title="Удалить этот вопрос"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Question Text */}
            <div className="mb-5">
              <textarea
                rows={2}
                value={question.text}
                onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                placeholder="Текст вопроса..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none font-medium"
              />
            </div>

            {/* Options (Strictly 5 Options) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Варианты ответов (отметьте правильный переключателем):</span>
                <span className="text-[11px] text-sky-400 font-mono">
                  Правильный: {OPTION_LETTERS[question.correctOptionIndex ?? 0]}
                </span>
              </div>

              {question.options.map((optText, optIdx) => {
                const isCorrect = question.correctOptionIndex === optIdx;

                return (
                  <div
                    key={optIdx}
                    onClick={() => handleCorrectOptionChange(qIdx, optIdx)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                      isCorrect
                        ? 'bg-emerald-950/50 border-emerald-500/60 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Radio Button */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                        isCorrect
                          ? 'border-emerald-400 bg-emerald-500'
                          : 'border-slate-600 bg-transparent'
                      }`}
                    >
                      {isCorrect && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                    </div>

                    {/* Option Letter Badge */}
                    <span
                      className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {OPTION_LETTERS[optIdx]}
                    </span>

                    {/* Option Text Input */}
                    <input
                      type="text"
                      value={optText}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                      placeholder={`Вариант ${OPTION_LETTERS[optIdx]}...`}
                      className={`w-full bg-transparent border-0 text-sm focus:outline-none ${
                        isCorrect ? 'text-emerald-100 font-semibold' : 'text-slate-200'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Add Question Button */}
      <div className="text-center pt-2 pb-8">
        <button
          onClick={handleAddQuestion}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-sm rounded-2xl border border-slate-700 transition shadow hover:shadow-lg active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Добавить ещё один вопрос (+1)</span>
        </button>
      </div>

      {/* In-App Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="w-12 h-12 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800/80 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              Удалить этот тест?
            </h3>
            <p className="text-sm text-slate-300 mb-1">
              Вы действительно хотите удалить <strong className="text-white">«{test.title}»</strong>?
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Тест будет удалён из базы данных Firestore, а также будут стёрты ключи ответов.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs sm:text-sm rounded-xl transition border border-slate-700"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteTest}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Удаление...' : 'Да, удалить'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
