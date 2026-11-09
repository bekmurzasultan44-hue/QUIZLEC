import React, { useState } from 'react';
import { User, Users, Clock, HelpCircle, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { TestModel } from '../../types';

interface StudentEntryProps {
  test: TestModel | null;
  onStartQuiz: (studentName: string, groupName: string) => void;
  onLookupTestByCode?: (code: string) => void;
}

export const StudentEntry: React.FC<StudentEntryProps> = ({
  test,
  onStartQuiz,
  onLookupTestByCode,
}) => {
  const [studentName, setStudentName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = studentName.trim();
    const trimmedGroup = groupName.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Пожалуйста, введите Фамилию и Имя (минимум 2 символа).');
      return;
    }
    if (!trimmedGroup || trimmedGroup.length < 1) {
      setError('Пожалуйста, укажите вашу учебную группу.');
      return;
    }
    setError(null);
    onStartQuiz(trimmedName, trimmedGroup);
  };

  const handleCodeLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onLookupTestByCode?.(code.trim().toUpperCase());
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-sky-500/25">
          <BookOpen className="w-7 h-7" />
        </div>

        {test ? (
          <>
            <div className="text-center mb-6">
              <span className="text-[11px] font-bold text-sky-400 bg-sky-950/80 border border-sky-800/80 px-3 py-1 rounded-full uppercase tracking-wider">
                Студенческое тестирование
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-3 mb-2">
                {test.title}
              </h1>
              <p className="text-xs text-slate-400">
                Для начала тестирования представьтесь и укажите вашу группу
              </p>
            </div>

            {/* Test Info Pills */}
            <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-sky-400 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Вопросов</div>
                  <div className="text-sm font-bold text-white">{test.questions.length} (по 5 вар.)</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Время на тест</div>
                  <div className="text-sm font-bold text-white">{test.timerMinutes} минут</div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Фамилия и Имя (ФИО) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Например: Иванов Иван Иванович"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Учебная группа *
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Например: ИСТ-201 или ЭК-21"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition uppercase"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-xl text-base transition shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <span>Начать тестирование</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center pt-2">
                После нажатия «Начать» включится таймер обратного отсчета ({test.timerMinutes} мин).
              </p>
            </form>
          </>
        ) : (
          /* Manual Code Entry if opened without testId */
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Введите код теста</h1>
            <p className="text-xs text-slate-400 mb-6">
              Преподаватель отобразил 6-значный код на проекторе или доске
            </p>

            <form onSubmit={handleCodeLookup} className="space-y-4">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="6-значный код (напр. AB1234)"
                maxLength={10}
                className="w-full text-center text-2xl font-mono tracking-widest uppercase py-3 bg-slate-950 border border-slate-800 rounded-xl text-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />

              <button
                type="submit"
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-sky-600/25"
              >
                Найти и открыть тест
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
