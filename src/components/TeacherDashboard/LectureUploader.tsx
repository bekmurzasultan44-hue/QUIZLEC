import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, Clock, ListOrdered, FileCheck } from 'lucide-react';
import { extractLectureText } from '../../lib/documentParser';
import { Question } from '../../types';

interface LectureUploaderProps {
  onGenerated: (data: { title: string; questions: Question[]; timerMinutes: number; questionCount: number }) => void;
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
}

export const LectureUploader: React.FC<LectureUploaderProps> = ({
  onGenerated,
  isGenerating,
  setIsGenerating,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(15);
  const [timerMinutes, setTimerMinutes] = useState<number>(15);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (selectedFile: File) => {
    setExtractError(null);
    setFile(selectedFile);
    setIsExtracting(true);

    try {
      const text = await extractLectureText(selectedFile);
      if (!text || text.trim().length < 50) {
        throw new Error('Файл содержит слишком мало текста или пуст. Убедитесь, что в файле есть текстовая лекция.');
      }
      setExtractedText(text);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setExtractError(err.message || 'Не удалось прочитать текст из файла.');
      setExtractedText('');
    } finally {
      setIsExtracting(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!extractedText || extractedText.length < 50) {
      setExtractError('Пожалуйста, загрузите файл лекции с достаточным объемом текста.');
      return;
    }

    setIsGenerating(true);
    setExtractError(null);

    try {
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lectureText: extractedText,
          questionCount,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Ошибка сервера: ${response.status}`);
      }

      const data = await response.json();
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Модель не вернула список вопросов. Попробуйте еще раз.');
      }

      // Format questions safely with 5 options
      const formattedQuestions: Question[] = data.questions.map((q: any, idx: number) => {
        let opts: string[] = Array.isArray(q.options) ? q.options.map(String) : [];
        while (opts.length < 5) {
          opts.push(`Вариант ${opts.length + 1}`);
        }
        if (opts.length > 5) {
          opts = opts.slice(0, 5);
        }

        let correctIdx = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0;
        if (correctIdx < 0 || correctIdx > 4) correctIdx = 0;

        return {
          id: `q-${Date.now()}-${idx}`,
          text: q.text || `Вопрос №${idx + 1}`,
          options: opts as [string, string, string, string, string],
          correctOptionIndex: correctIdx,
        };
      });

      onGenerated({
        title: data.title || file?.name?.replace(/\.[^/.]+$/, '') || 'Тест по лекции',
        questions: formattedQuestions,
        timerMinutes,
        questionCount,
      });
    } catch (err: any) {
      console.error('Generation error:', err);
      let msg = err.message || 'Ошибка генерации вопросов через Gemini Flash.';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = 'Сервер ещё запускается или соединение прервано. Пожалуйста, подождите пару секунд и нажмите кнопку генерации ещё раз.';
      }
      setExtractError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
          1
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Загрузка лекции и настройки генерации</h2>
          <p className="text-sm text-slate-400">
            Поддерживаются файлы PDF и DOCX (только текст, картинки игнорируются)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* File Drop Area (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-sky-400 bg-sky-950/20 scale-[0.99]'
                : file
                ? 'border-emerald-500/50 bg-emerald-950/10 hover:border-emerald-400'
                : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
              accept=".pdf,.docx,.txt"
              className="hidden"
            />

            {isExtracting ? (
              <div className="py-6 flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-3" />
                <p className="text-sm font-medium text-slate-200">Извлечение текста лекции...</p>
                <p className="text-xs text-slate-400 mt-1">Игнорируем изображения, читаем параграфы</p>
              </div>
            ) : file && extractedText ? (
              <div className="py-4 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-white text-base max-w-sm truncate">{file.name}</h4>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Текст успешно извлечен ({extractedText.length.toLocaleString('ru-RU')} символов, ~{Math.round(extractedText.split(/\s+/).length)} слов)
                </p>
                <span className="text-xs text-sky-400 hover:underline mt-3">Нажмите, чтобы выбрать другой файл</span>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <p className="text-base font-semibold text-white">
                  Перетащите файл лекции сюда или <span className="text-sky-400 underline">выберите с диска</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Поддерживаются форматы: <strong className="text-slate-300">.PDF</strong>, <strong className="text-slate-300">.DOCX</strong>
                </p>
              </div>
            )}
          </div>

          {extractError && (
            <div className="mt-4 p-3 bg-red-950/50 border border-red-800/60 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{extractError}</span>
            </div>
          )}

          {extractedText && (
            <div className="mt-4 bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400" /> Фрагмент извлеченного текста:
                </span>
                <span>{extractedText.length} символов</span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-3 italic font-mono bg-slate-900/50 p-2 rounded border border-slate-800">
                "{extractedText.slice(0, 320)}..."
              </p>
            </div>
          )}
        </div>

        {/* Generation Settings (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
          <div className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-sky-400" /> Количество вопросов
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 20, 30].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuestionCount(num)}
                    className={`py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                      questionCount === num
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25 ring-2 ring-sky-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                В каждом вопросе строго 5 вариантов ответа, ровно 1 верный.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" /> Таймер теста (минуты)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTimerMinutes(mins)}
                    className={`py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                      timerMinutes === mins
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-2 ring-indigo-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {mins} мин
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[30, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTimerMinutes(mins)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      timerMinutes === mins
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {mins} минут
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-700/60">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || isExtracting || !extractedText}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                isGenerating || isExtracting || !extractedText
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-sky-500 via-indigo-600 to-indigo-700 hover:from-sky-400 hover:to-indigo-600 shadow-indigo-500/25 active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Генерация через Gemini Flash...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-sky-200" />
                  <span>Сгенерировать тест ({questionCount} вопр.)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
