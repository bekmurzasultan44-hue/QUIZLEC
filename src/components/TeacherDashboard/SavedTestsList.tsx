import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Trash2,
  Edit,
  Play,
  BarChart3,
  Calendar,
  Layers,
  StopCircle,
  RotateCcw,
  AlertTriangle,
  X
} from 'lucide-react';
import { TestModel, isTestExpired, getTestRemainingMinutes } from '../../types';

interface SavedTestsListProps {
  tests: TestModel[];
  onSelectTest: (test: TestModel) => void;
  onLaunchTest: (test: TestModel) => void;
  onViewResults: (test: TestModel) => void;
  onDeleteTest: (testId: string) => Promise<void>;
  onStopTest?: (testId: string) => Promise<void>;
  onResumeTest?: (testId: string) => Promise<void>;
  isLoading: boolean;
  onCreateNew: () => void;
}

export const SavedTestsList: React.FC<SavedTestsListProps> = ({
  tests,
  onSelectTest,
  onLaunchTest,
  onViewResults,
  onDeleteTest,
  onStopTest,
  onResumeTest,
  isLoading,
  onCreateNew,
}) => {
  const [testToDelete, setTestToDelete] = useState<TestModel | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const confirmDelete = async () => {
    if (!testToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteTest(testToDelete.id);
      setTestToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" /> Сохранённые тесты
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Всего сохранено в базе: <strong className="text-slate-200">{tests.length}</strong> тестов • Активные тесты автоматически закрываются через 1 час
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow shadow-sky-600/30 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>+ Создать новый тест</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Загрузка сохранённых тестов из Firestore...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Пока нет сохранённых тестов</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            Загрузите лекцию в формате PDF или DOCX, чтобы сгенерировать первый тест.
          </p>
          <button
            onClick={onCreateNew}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-sky-600/25"
          >
            Сгенерировать первый тест
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => {
            const expired = isTestExpired(test);
            const remainingMinutes = getTestRemainingMinutes(test);
            const isLive = test.status === 'active' && !expired;

            return (
              <div
                key={test.id}
                className={`bg-slate-950/70 border rounded-xl p-5 flex flex-col justify-between transition shadow-sm group ${
                  isLive
                    ? 'border-emerald-800/80 shadow-emerald-950/20 shadow-md'
                    : expired || test.status === 'completed'
                    ? 'border-rose-900/40 bg-slate-950/40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Header tags */}
                  <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                    <span className="text-[11px] font-mono bg-slate-800 text-sky-400 px-2 py-0.5 rounded border border-slate-700">
                      Код: {test.code || test.id.slice(0, 6).toUpperCase()}
                    </span>

                    {isLive ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/80 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Активен ({remainingMinutes} мин)
                      </span>
                    ) : expired || test.status === 'completed' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80">
                        Завершён (приём закрыт)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60">
                        Черновик
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-white text-base line-clamp-2 mb-3 group-hover:text-sky-300 transition">
                    {test.title}
                  </h3>

                  {/* Meta details */}
                  <div className="space-y-1.5 text-xs text-slate-400 mb-5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Вопросов: <strong className="text-slate-200">{test.questions?.length || test.questionCount}</strong> (по 5 вариантов)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Время студента: <strong className="text-slate-200">{test.timerMinutes} минут</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Создан: {new Date(test.createdAt).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {isLive ? (
                      <button
                        onClick={() => onLaunchTest(test)}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>QR-код</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onLaunchTest(test)}
                        className="py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>{expired || test.status === 'completed' ? 'Запустить снова' : 'Запустить'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => onViewResults(test)}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                      <span>Результаты</span>
                    </button>
                  </div>

                  {/* Secondary actions: Edit, Stop/Resume, Delete */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      onClick={() => onSelectTest(test)}
                      className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 py-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Редактировать</span>
                    </button>

                    {isLive && onStopTest && (
                      <button
                        onClick={() => onStopTest(test.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 py-1"
                        title="Досрочно закрыть приём ответов"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        <span>Завершить</span>
                      </button>
                    )}

                    {!isLive && (expired || test.status === 'completed') && onResumeTest && (
                      <button
                        onClick={() => onResumeTest(test.id)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 py-1"
                        title="Открыть приём на 1 час"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>+1 час</span>
                      </button>
                    )}

                    <button
                      onClick={() => setTestToDelete(test)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-950/40 transition"
                      title="Удалить тест"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-App Delete Confirmation Modal (reliable on mobile & desktop without window.confirm) */}
      {testToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="w-12 h-12 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800/80 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              Удалить тест?
            </h3>
            <p className="text-sm text-slate-300 mb-1">
              Вы уверены, что хотите удалить тест <strong className="text-white">«{testToDelete.title}»</strong>?
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Это действие необратимо. Тест и ключи ответов будут удалены из базы.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setTestToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs sm:text-sm rounded-xl transition border border-slate-700"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Удаление...' : 'Да, удалить тест'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
