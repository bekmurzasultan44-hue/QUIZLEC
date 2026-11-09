import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

/**
 * Extracts pure text from a DOCX file using mammoth, strictly ignoring images.
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = result.value || '';
  return rawText.trim();
}

/**
 * Extracts pure text from a PDF file page-by-page.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });
  
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageString = content.items
      .map((item: any) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ');
    if (pageString.trim()) {
      pageTexts.push(`[Страница ${pageNum}]\n${pageString.trim()}`);
    }
  }

  return pageTexts.join('\n\n').trim();
}

/**
 * Generic file text extractor for PDF, DOCX, and TXT with robust validations.
 */
export async function extractLectureText(file: File): Promise<string> {
  if (!file) {
    throw new Error('Файл не выбран.');
  }

  if (file.size === 0) {
    throw new Error('Выбранный файл пуст (0 байт). Пожалуйста, выберите файл с текстом лекции.');
  }

  // 30MB limit
  const maxBytes = 30 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      `Файл слишком большой (${(file.size / (1024 * 1024)).toFixed(1)} МБ, максимум 30 МБ). Пожалуйста, загрузите меньший файл.`
    );
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  let text = '';

  try {
    if (ext === 'docx') {
      text = await extractTextFromDocx(file);
    } else if (ext === 'pdf') {
      text = await extractTextFromPdf(file);
    } else if (ext === 'txt' || ext === 'md') {
      text = await file.text();
    } else {
      throw new Error(`Неподдерживаемый формат: .${ext}. Поддерживаются только PDF, DOCX и TXT.`);
    }
  } catch (err: any) {
    console.error('Extraction error:', err);
    throw new Error(err.message || 'Ошибка чтения файла. Проверьте, что файл не поврежден.');
  }

  if (!text || text.trim().length < 50) {
    throw new Error(
      'В файле обнаружено слишком мало текста (менее 50 символов). Если это PDF, возможно, это отсканированные изображения без текстового слоя.'
    );
  }

  return text.trim();
}
