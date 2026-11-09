import React from 'react';
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
  Edit3
} from 'lucide-react';
import { Question, TestModel } from '../../types';
import { exportTestToDocx, exportTestToPdf } from '../../lib/exportUtils';

const OPTION_LETTERS = ['А', 'Б', 'В', 'Г', 'Д'];

interface QuestionEditorProps {
  test: TestModel;
  onUpdateTest: (updated: TestModel) => void;
  onSaveToDatabase: () => Promise<void>;
  onLaunchTest: () => void;
  isSaving: boolean;
  saveSuccessMessage: string | null;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  test,
  onUpdateTest,
  onSaveToDatabase,
  onLaunchTest,
  isSaving,
  saveSuccessMessage,
}) => {
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

  return (
    <div className="space-y-6">
      {/* Test Header & Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-20 z-20 backdrop-blur-md bg-slate-900/95">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded">
                Редактор вопросов
              </span>
              <span className="text-xs text-slate-400">
                Всего вопросов: <strong className="text-white">{test.questions.length}</strong>
              </span>
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
              <span>Таймер:</span>
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
              <span>Запустить (QR-код)</span>
            </button>

            {/* Export Dropdown / Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportTestToDocx(test)}
                title="Экспортировать тест и ключи ответов в Word (.docx)"
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-950/70 hover:bg-blue-900 text-blue-200 border border-blue-800 rounded-xl text-xs font-medium transition"
              >
                <FileType className="w-4 h-4 text-blue-400" />
                <span>Word (.docx)</span>
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
            {/* Question Top Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold text-sm flex items-center justify-center shrink-0">
                  {qIdx + 1}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  Вопрос #{qIdx + 1} (5 вариантов, 1 верный)
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteQuestion(qIdx)}
                title="Удалить вопрос"
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Question Textarea */}
            <div className="mb-4">
              <textarea
                rows={2}
                value={question.text}
                onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                placeholder="Введите текст вопроса..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed"
              />
            </div>

            {/* 5 Options */}
            <div className="space-y-2.5">
              <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                <span>Варианты ответа (выберите радио-кнопку для правильного):</span>
                <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Зеленым отмечен правильный ответ
                </span>
              </div>

              {question.options.map((opt, optIdx) => {
                const isCorrect = question.correctOptionIndex === optIdx;
                return (
                  <div
                    key={optIdx}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      isCorrect
                        ? 'bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Radio Button */}
                    <label className="flex items-center gap-2 cursor-pointer shrink-0 pl-1">
                      <input
                        type="radio"
                        name={`correct-opt-${qIdx}`}
                        checked={isCorrect}
                        onChange={() => handleCorrectOptionChange(qIdx, optIdx)}
                        className="w-4 h-4 text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span
                        className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${
                          isCorrect
                            ? 'bg-emerald-500 text-white font-extrabold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {OPTION_LETTERS[optIdx]}
                      </span>
                    </label>

                    {/* Option Text Input */}
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                      placeholder={`Вариант ${OPTION_LETTERS[optIdx]}`}
                      className={`w-full bg-transparent text-sm focus:outline-none px-2 py-1 rounded ${
                        isCorrect ? 'text-emerald-200 font-medium' : 'text-slate-300'
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
      <div className="flex justify-center pt-2 pb-8">
        <button
          type="button"
          onClick={handleAddQuestion}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-dashed border-slate-600 hover:border-sky-500 transition shadow"
        >
          <Plus className="w-5 h-5 text-sky-400" />
          <span>Добавить вопрос (5 вариантов)</span>
        </button>
      </div>
    </div>
  );
};
