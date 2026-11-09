import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ExternalLink,
  Users,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { TestModel } from '../../types';

interface LaunchModalProps {
  test: TestModel;
  onClose: () => void;
  onViewResults: () => void;
}

export const LaunchModal: React.FC<LaunchModalProps> = ({
  test,
  onClose,
  onViewResults,
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Build direct student URL
  const studentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?testId=${test.id}`
    : `https://app.quizlec.local/?testId=${test.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(studentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative text-center">
        {/* Close & Fullscreen controls */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран для проектора'}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            title="Закрыть"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-2 bg-emerald-950/80 border border-emerald-700/70 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Тест запущен • Режим для проектора
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
          {test.title}
        </h2>
        <p className="text-sm text-slate-300 mb-6">
          Отсканируйте QR-код камерой смартфона или перейдите по ссылке
        </p>

        {/* Big Projector QR Code Container */}
        <div className="bg-white p-6 rounded-3xl shadow-2xl inline-block mb-3 border-4 border-sky-400/30">
          <QRCodeSVG
            value={studentUrl}
            size={280}
            level="H"
            includeMargin={true}
          />
        </div>

        <p className="text-xs text-amber-300/90 bg-amber-950/40 border border-amber-800/50 rounded-xl py-1.5 px-3 max-w-md mx-auto mb-5">
          📱 Если на телефоне появилось окно <span className="font-semibold text-white">«Action required...»</span>, просто нажмите кнопку <strong className="text-white">«Close and continue»</strong>.
        </p>

        {/* Code & Direct Link */}
        <div className="space-y-4 max-w-lg mx-auto">
          {/* Quick Access Code */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Код теста для студентов:
              </span>
              <span className="font-mono text-2xl font-black text-sky-400 tracking-wider">
                {test.code || test.id.slice(0, 6).toUpperCase()}
              </span>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>Вопросов: <strong className="text-white">{test.questions.length}</strong></div>
              <div>Время: <strong className="text-white">{test.timerMinutes} мин</strong></div>
            </div>
          </div>

          {/* Direct Link Input */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 pl-3">
            <input
              type="text"
              readOnly
              value={studentUrl}
              className="bg-transparent text-xs text-slate-300 w-full focus:outline-none font-mono truncate"
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Скопировать</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Switch to Live Results */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              onClose();
              onViewResults();
            }}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Перейти к таблице результатов (Online)</span>
          </button>

          <a
            href={studentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Открыть как студент</span>
          </a>
        </div>
      </div>
    </div>
  );
};
