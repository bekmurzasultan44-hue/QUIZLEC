import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} from 'docx';
import { jsPDF } from 'jspdf';
import { TestModel, Question, SubmissionModel } from '../types';

const OPTION_LETTERS = ['А', 'Б', 'В', 'Г', 'Д'];

/**
 * Downloads a Blob as a file in the browser.
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports test questions and answer keys into a Word (.docx) document.
 * UTF-8 is native to DOCX, ensuring zero character corruption in Russian.
 */
export async function exportTestToDocx(test: TestModel) {
  const docParagraphs: (Paragraph | Table)[] = [];

  // Title & Metadata
  docParagraphs.push(
    new Paragraph({
      text: test.title || 'Тест по лекции',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Количество вопросов: ${test.questions.length}  |  `, italics: true }),
        new TextRun({ text: `Время на выполнение: ${test.timerMinutes} мин.  |  `, italics: true }),
        new TextRun({ text: `Дата: ${new Date(test.createdAt).toLocaleDateString('ru-RU')}`, italics: true }),
      ],
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: 'Инструкция: В каждом вопросе выберите один правильный ответ из пяти предложенных вариантов (А, Б, В, Г, Д).',
      spacing: { after: 300 },
    })
  );

  // Questions
  test.questions.forEach((q, idx) => {
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. `, bold: true }),
          new TextRun({ text: q.text, bold: true }),
        ],
        spacing: { before: 200, after: 120 },
      })
    );

    q.options.forEach((opt, optIdx) => {
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `   ${OPTION_LETTERS[optIdx]}) `, bold: false }),
            new TextRun({ text: opt }),
          ],
          indent: { left: 360 },
          spacing: { after: 60 },
        })
      );
    });
  });

  // Page Break for Answer Keys
  docParagraphs.push(new Paragraph({ children: [new PageBreak()] }));

  // Answer Keys Title
  docParagraphs.push(
    new Paragraph({
      text: 'КЛЮЧИ ПРАВИЛЬНЫХ ОТВЕТОВ',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
    }),
    new Paragraph({
      text: `Тест: ${test.title} (Всего вопросов: ${test.questions.length})`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Answer Key Table
  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 1500, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: '№', bold: true })] })],
        }),
        new TableCell({
          width: { size: 2500, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: 'Правильный ответ', bold: true })] })],
        }),
        new TableCell({
          width: { size: 5000, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: 'Текст ответа', bold: true })] })],
        }),
      ],
    }),
  ];

  test.questions.forEach((q, idx) => {
    const correctIdx = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0;
    const correctLetter = OPTION_LETTERS[correctIdx] || 'А';
    const correctText = q.options[correctIdx] || '';

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: String(idx + 1) })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `Вариант ${correctLetter}`, bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph({ text: correctText })],
          }),
        ],
      })
    );
  });

  docParagraphs.push(
    new Table({
      rows: tableRows,
      width: { size: 9000, type: WidthType.DXA },
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docParagraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = (test.title || 'test').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_').slice(0, 40);
  downloadBlob(blob, `Тест_${cleanTitle}.docx`);
}

/**
 * Direct PDF generation for the Test + Answer Keys using high-res Canvas.
 * No popups or window.open, 100% crisp Cyrillic text without krakozyabry.
 */
export async function exportTestToPdf(test: TestModel) {
  const canvas = document.createElement('canvas');
  const width = 1240;
  // Dynamic height based on questions count
  const estimatedHeight = Math.max(1754, 400 + test.questions.length * 220 + 600);
  canvas.width = width;
  canvas.height = estimatedHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, estimatedHeight);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 36px "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(test.title || 'Тест по лекции', width / 2, 70);

  // Meta
  ctx.fillStyle = '#64748b';
  ctx.font = '18px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `Вопросов: ${test.questions.length}  |  Время: ${test.timerMinutes} мин.  |  Дата: ${new Date(test.createdAt).toLocaleDateString('ru-RU')}`,
    width / 2,
    110
  );

  // Instruction Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(80, 140, width - 160, 50);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.strokeRect(80, 140, width - 160, 50);

  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 16px "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    'Инструкция: В каждом вопросе выберите 1 верный ответ из 5 вариантов (А, Б, В, Г, Д).',
    100,
    172
  );

  // Render Questions
  let currentY = 240;
  ctx.textAlign = 'left';

  test.questions.forEach((q, idx) => {
    // Question text
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${idx + 1}. ${q.text}`, 80, currentY);
    currentY += 30;

    // Options
    ctx.font = '17px "Segoe UI", Roboto, sans-serif';
    q.options.forEach((opt, optIdx) => {
      ctx.fillStyle = '#334155';
      ctx.fillText(`${OPTION_LETTERS[optIdx]})  ${opt}`, 110, currentY);
      currentY += 26;
    });

    currentY += 20;
  });

  // Section divider for answer keys
  currentY += 30;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, currentY);
  ctx.lineTo(width - 80, currentY);
  ctx.stroke();

  currentY += 50;

  // Keys Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('КЛЮЧИ ПРАВИЛЬНЫХ ОТВЕТОВ', width / 2, currentY);
  currentY += 40;

  // Render Answer Table
  const tableX = 140;
  const tableW = width - 280;
  const col1W = 100;
  const col2W = 200;
  const col3W = tableW - col1W - col2W;

  // Table Header
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(tableX, currentY, tableW, 40);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(tableX, currentY, tableW, 40);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 16px "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('№', tableX + 20, currentY + 26);
  ctx.fillText('Ответ', tableX + col1W + 20, currentY + 26);
  ctx.fillText('Текст правильного ответа', tableX + col1W + col2W + 20, currentY + 26);

  currentY += 40;

  // Table Rows
  test.questions.forEach((q, idx) => {
    const correctIdx = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0;
    const correctLetter = OPTION_LETTERS[correctIdx] || 'А';
    const correctText = q.options[correctIdx] || '';

    ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(tableX, currentY, tableW, 36);
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(tableX, currentY, tableW, 36);

    ctx.fillStyle = '#0f172a';
    ctx.font = '16px "Segoe UI", Roboto, sans-serif';
    ctx.fillText(String(idx + 1), tableX + 20, currentY + 24);

    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 16px "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Вариант ${correctLetter}`, tableX + col1W + 20, currentY + 24);

    ctx.fillStyle = '#334155';
    ctx.font = '15px "Segoe UI", Roboto, sans-serif';
    const truncatedText = correctText.length > 55 ? correctText.slice(0, 52) + '...' : correctText;
    ctx.fillText(truncatedText, tableX + col1W + col2W + 20, currentY + 24);

    currentY += 36;
  });

  // Convert canvas to PDF
  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [width, estimatedHeight],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, width, estimatedHeight);
  const cleanTitle = (test.title || 'test').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_').slice(0, 40);
  pdf.save(`Тест_${cleanTitle}.pdf`);
}

/**
 * Generates Student Result Sheet PDF.
 * SCENARIO 9: Strictly contains ONLY Student Name, Group, Score, Percentage, and Date.
 * Removed all mentions of "официальное свидетельство" and "электронная верификация".
 */
export async function downloadStudentCertificatePdf(
  submission: SubmissionModel,
  testTitle: string
) {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  // Top Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 34px "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Результаты тестирования', canvas.width / 2, 120);

  // Divider line
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 120, 145);
  ctx.lineTo(canvas.width / 2 + 120, 145);
  ctx.stroke();

  // Test Title
  ctx.fillStyle = '#475569';
  ctx.font = '20px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Тема:', canvas.width / 2, 190);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px "Segoe UI", Roboto, sans-serif';
  const cleanTestTitle = testTitle.length > 55 ? testTitle.slice(0, 52) + '...' : testTitle;
  ctx.fillText(`«${cleanTestTitle}»`, canvas.width / 2, 225);

  // Student Info Box
  const infoX = 140;
  const infoY = 270;
  const infoW = canvas.width - 280;
  const infoH = 130;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(infoX, infoY, infoW, infoH);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(infoX, infoY, infoW, infoH);

  // Student Name
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '18px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Студент (ФИО):', infoX + 30, infoY + 50);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(submission.studentName, infoX + 220, infoY + 50);

  // Group
  ctx.fillStyle = '#64748b';
  ctx.font = '18px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Учебная группа:', infoX + 30, infoY + 95);

  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 24px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(submission.groupName, infoX + 220, infoY + 95);

  // Score Box
  const scoreBoxX = 140;
  const scoreBoxY = 430;
  const scoreBoxW = canvas.width - 280;
  const scoreBoxH = 120;

  ctx.fillStyle = '#f0fdf4';
  ctx.fillRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH);
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 2;
  ctx.strokeRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 44px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `${submission.score} из ${submission.totalQuestions}`,
    canvas.width / 2,
    scoreBoxY + 58
  );

  ctx.fillStyle = '#15803d';
  ctx.font = 'bold 22px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `Правильных ответов: ${submission.percentage}%`,
    canvas.width / 2,
    scoreBoxY + 95
  );

  // Footer: Date and Time
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '16px "Segoe UI", Roboto, sans-serif';
  const formattedDate = new Date(submission.submittedAt).toLocaleString('ru-RU');
  ctx.fillText(`Дата и время сдачи: ${formattedDate}`, canvas.width / 2, 620);

  // Convert canvas to PDF
  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  const cleanName = submission.studentName.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_').slice(0, 30);
  pdf.save(`Результат_${cleanName}_${submission.groupName}.pdf`);
}

/**
 * Exports submissions table to CSV format with explicit UTF-8 BOM byte order mark.
 * Guaranteed to open correctly in Microsoft Excel and Google Таблицы with full Cyrillic support.
 */
export function exportSubmissionsToCsv(submissions: SubmissionModel[], testTitle: string) {
  // Explicit UTF-8 BOM (0xEF, 0xBB, 0xBF) so Excel recognizes Cyrillic without garbled text
  const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);

  const headers = [
    '№',
    'ФИО Студента',
    'Учебная группа',
    'Баллы',
    'Всего вопросов',
    'Процент правильных',
    'Итоговая оценка',
    'Дата и время сдачи',
  ];

  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = submissions.map((s, idx) => {
    let grade = '5 (Отлично)';
    if (s.percentage < 50) grade = '2 (Неудовлетворительно)';
    else if (s.percentage < 70) grade = '3 (Удовлетворительно)';
    else if (s.percentage < 85) grade = '4 (Хорошо)';

    const formattedDate = s.submittedAt
      ? new Date(s.submittedAt).toLocaleString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '';

    return [
      idx + 1,
      escapeCell(s.studentName),
      escapeCell(s.groupName),
      s.score,
      s.totalQuestions,
      `${s.percentage}%`,
      escapeCell(grade),
      escapeCell(formattedDate),
    ].join(';');
  });

  const csvBody = [headers.map(escapeCell).join(';'), ...rows].join('\r\n');
  const blob = new Blob([BOM, csvBody], { type: 'text/csv;charset=utf-8' });
  const cleanTitle = (testTitle || 'results').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_').slice(0, 35);
  downloadBlob(blob, `Результаты_${cleanTitle}.csv`);
}
