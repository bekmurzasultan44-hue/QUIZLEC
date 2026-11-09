import React from 'react';
import { BookOpen, User, Sparkles, Database, FileSpreadsheet } from 'lucide-react';

interface NavbarProps {
  currentTab: 'teacher-create' | 'teacher-saved' | 'teacher-results' | 'student';
  onSelectTab: (tab: 'teacher-create' | 'teacher-saved' | 'teacher-results' | 'student') => void;
  activeTestTitle?: string;
  hasActiveTest?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeTestTitle,
  hasActiveTest,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">QuizLec</span>
              <span className="text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full">
                Flash AI
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Генерация тестов по лекциям • Сдача до 60 студентов</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onSelectTab('teacher-create')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              currentTab === 'teacher-create'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-sky-300" />
            <span className="hidden md:inline">Создать тест</span>
            <span className="md:hidden">Создать</span>
          </button>

          <button
            onClick={() => onSelectTab('teacher-saved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              currentTab === 'teacher-saved'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-slate-400" />
            <span className="hidden md:inline">Все тесты</span>
            <span className="md:hidden">Тесты</span>
          </button>

          {hasActiveTest && (
            <button
              onClick={() => onSelectTab('teacher-results')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'teacher-results'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-emerald-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Результаты</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

          <button
            onClick={() => onSelectTab('student')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              currentTab === 'student'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-4 h-4 text-indigo-300" />
            <span>Студент</span>
          </button>
        </nav>
      </div>

      {activeTestTitle && currentTab.startsWith('teacher') && (
        <div className="bg-slate-800/80 border-t border-slate-700/60 px-4 py-1 text-xs text-slate-300 flex items-center justify-between">
          <div className="truncate max-w-2xl">
            <span className="text-slate-400">Текущий тест:</span> <strong className="text-white">{activeTestTitle}</strong>
          </div>
          <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">
            База подключена
          </span>
        </div>
      )}
    </header>
  );
};
