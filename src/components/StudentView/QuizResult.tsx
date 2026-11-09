import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  Calendar,
  Users,
  User,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { SubmissionModel } from '../../types';
import { downloadStudentCertificatePdf } from '../../lib/exportUtils';

interface QuizResultProps {
  submission: SubmissionModel;
  testTitle: string;
  onReset?: () => void;
}

export const QuizResult: React.FC<QuizResultProps> = ({
  submission,
  testTitle,
  onReset,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await downloadStudentCertificatePdf(submission, testTitle);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Ошибка при генерации PDF. Попробуйте снова.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  let gradeWord = 'Отлично';
  let gradeColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-700';
  if (submission.percentage < 50) {
    gradeWord = 'Неудовлетворительно';
    gradeColor = 'text-red-400 bg-red-950/80 border-red-700';
  } else if (submission.percentage < 70) {
    gradeWord = 'Удовлетворительно';
    gradeColor = 'text-amber-400 bg-amber-950/80 border-amber-700';
  } else if (submission.percentage < 85) {
    gradeWord = 'Хорошо';
    gradeColor = 'text-blue-400 bg-blue-950/80 border-blue-700';
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
          <Award className="w-8 h-8" />
        </div>

        {/* Status Badge */}
        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Тест сдан • Результат отправлен преподавателю
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 mb-1">
          Ваш результат
        </h1>
        <p className="text-xs text-slate-400 mb-6">
          Тема: <strong className="text-slate-200">«{testTitle}»</strong>
        </p>

        {/* Big Score Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="text-4xl sm:text-5xl font-black text-white mb-2">
            {submission.score}{' '}
            <span className="text-2xl sm:text-3xl font-semibold text-slate-500">
              / {submission.totalQuestions}
            </span>
          </div>

          <div className="text-lg font-bold text-sky-400 mb-3">
            {submission.percentage}% правильных ответов
          </div>

          <span className={`inline-block px-3.5 py-1 rounded-xl text-xs font-bold border ${gradeColor}`}>
            Оценка: {gradeWord}
          </span>
        </div>

        {/* Student Data Summary Card */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 text-left space-y-2.5 text-xs text-slate-300 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" /> Студент:
            </span>
            <strong className="text-white text-sm">{submission.studentName}</strong>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" /> Группа:
            </span>
            <strong className="text-white font-mono">{submission.groupName}</strong>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" /> Время сдачи:
            </span>
            <span className="font-mono text-slate-300">
              {new Date(submission.submittedAt).toLocaleString('ru-RU')}
            </span>
          </div>
        </div>

        {/* Download PDF Button */}
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-2xl text-sm sm:text-base transition shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2.5 active:scale-[0.98]"
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Формирование PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Скачать PDF с результатом</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-400 mt-3">
          В файле сохранены: ФИО, группа, баллы, процент и дата прохождения.
        </p>

        {onReset && (
          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={onReset}
              className="text-xs text-slate-400 hover:text-sky-300 transition"
            >
              Сдать другой тест
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
