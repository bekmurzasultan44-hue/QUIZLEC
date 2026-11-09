import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  Users,
  Award,
  TrendingUp,
  FileSpreadsheet,
  QrCode,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  Download
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { SubmissionModel, TestModel } from '../../types';
import { exportSubmissionsToCsv } from '../../lib/exportUtils';

interface LiveResultsTableProps {
  test: TestModel;
  onShowQr: () => void;
}

export const LiveResultsTable: React.FC<LiveResultsTableProps> = ({
  test,
  onShowQr,
}) => {
  const [submissions, setSubmissions] = useState<SubmissionModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Real-time listener for test submissions
  useEffect(() => {
    if (!test?.id) return;

    setIsLoading(true);
    const submissionsRef = collection(db, 'submissions');
    const q = query(submissionsRef, where('testId', '==', test.id));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const subs: SubmissionModel[] = [];
        snapshot.forEach((doc) => {
          subs.push({
            id: doc.id,
            ...(doc.data() as Omit<SubmissionModel, 'id'>),
          });
        });
        // Sort descending by submittedAt
        subs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setSubmissions(subs);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'submissions');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [test?.id]);

  // Unique groups for filter
  const groups = Array.from(new Set(submissions.map((s) => s.groupName).filter(Boolean)));

  // Filtered list
  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.groupName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || s.groupName === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  // Calculate summary statistics
  const totalCount = submissions.length;
  const avgPercentage = totalCount
    ? Math.round(submissions.reduce((acc, curr) => acc + curr.percentage, 0) / totalCount)
    : 0;
  const topScore = totalCount
    ? Math.max(...submissions.map((s) => s.score))
    : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Синхронизация в реальном времени
            </span>
          </div>
          <h2 className="text-2xl font-black text-white">{test.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Результаты поступают мгновенно при сдаче студентами
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onShowQr}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition shadow"
          >
            <QrCode className="w-4 h-4 text-sky-400" />
            <span>Показать QR-код</span>
          </button>

          <button
            onClick={() => exportSubmissionsToCsv(filteredSubmissions.length > 0 ? filteredSubmissions : submissions, test.title)}
            disabled={submissions.length === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow ${
              submissions.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 active:scale-95'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Экспорт в Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Сдали тест
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {totalCount} <span className="text-xs font-normal text-slate-500">/ до 60 чел</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Средний результат
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {avgPercentage}%
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Лучший балл
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {topScore} <span className="text-xs font-normal text-slate-500">/ {test.questions.length}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по ФИО или группе..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {groups.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Все группы ({totalCount})</option>
              {groups.map((grp) => (
                <option key={grp} value={grp}>
                  Группа {grp}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Submissions Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">ФИО Студента</th>
              <th className="py-3 px-4">Группа</th>
              <th className="py-3 px-4 text-center">Баллы</th>
              <th className="py-3 px-4 text-center">Процент</th>
              <th className="py-3 px-4 text-center">Оценка</th>
              <th className="py-3 px-4 text-right">Время сдачи</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Подключение к базе данных...
                </td>
              </tr>
            ) : filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  {submissions.length === 0
                    ? 'Ожидание сдачи теста первыми студентами...'
                    : 'По вашему запросу ничего не найдено.'}
                </td>
              </tr>
            ) : (
              filteredSubmissions.map((sub, idx) => {
                let grade = '5 (Отл)';
                let gradeColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
                if (sub.percentage < 50) {
                  grade = '2 (Неуд)';
                  gradeColor = 'text-red-400 bg-red-950/60 border-red-800';
                } else if (sub.percentage < 70) {
                  grade = '3 (Удовл)';
                  gradeColor = 'text-amber-400 bg-amber-950/60 border-amber-800';
                } else if (sub.percentage < 85) {
                  grade = '4 (Хор)';
                  gradeColor = 'text-blue-400 bg-blue-950/60 border-blue-800';
                }

                return (
                  <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-center text-slate-500 font-mono font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-sky-400 flex items-center justify-center text-[10px] uppercase font-bold shrink-0">
                        {sub.studentName.charAt(0)}
                      </div>
                      <span className="truncate">{sub.studentName}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-300">
                      {sub.groupName}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-white text-sm">
                      {sub.score} <span className="text-slate-500 font-normal text-xs">/ {sub.totalQuestions}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-slate-200">{sub.percentage}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${gradeColor}`}>
                        {grade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(sub.submittedAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
