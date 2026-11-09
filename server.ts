import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp as initAdminApp, cert, getApps, type App as FirebaseAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, type Firestore as AdminFirestore } from 'firebase-admin/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // Body parsers with generous limit for large lectures
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // In-memory answer keys vault
  const testKeysVault = new Map<string, number[]>();

  // Firebase Admin SDK singleton initializer supporting multiple deployment environments
  let adminDb: AdminFirestore | null = null;
  function getAdminDb(cfg: any): AdminFirestore | null {
    if (adminDb) return adminDb;
    try {
      const existingApps = getApps();
      let adminApp: FirebaseAdminApp;

      if (existingApps.length > 0) {
        adminApp = existingApps[0];
      } else {
        let serviceAccount: any = null;

        // 1. Base64-encoded service account (recommended for Render, Railway, Fly.io to avoid newline/escaping bugs)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
          try {
            const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.trim(), 'base64').toString('utf8');
            serviceAccount = JSON.parse(decoded);
          } catch (e: any) {
            console.warn('[Firebase Admin SDK] Error parsing FIREBASE_SERVICE_ACCOUNT_BASE64:', e.message);
          }
        }
        // 2. Direct JSON string or base64 in FIREBASE_SERVICE_ACCOUNT
        else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
          try {
            const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
            if (raw.startsWith('{')) {
              serviceAccount = JSON.parse(raw);
            } else {
              const decoded = Buffer.from(raw, 'base64').toString('utf8');
              serviceAccount = JSON.parse(decoded);
            }
          } catch (e: any) {
            console.warn('[Firebase Admin SDK] Error parsing FIREBASE_SERVICE_ACCOUNT:', e.message);
          }
        }
        // 3. Separate environment variables (common in PaaS)
        else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
          serviceAccount = {
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            project_id: process.env.FIREBASE_PROJECT_ID || cfg.projectId,
          };
        }
        // 4. File path via GOOGLE_APPLICATION_CREDENTIALS
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
          try {
            serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
          } catch (e: any) {
            console.warn('[Firebase Admin SDK] Error reading GOOGLE_APPLICATION_CREDENTIALS:', e.message);
          }
        }
        // 5. Local file serviceAccountKey.json
        else if (fs.existsSync(path.join(__dirname, 'serviceAccountKey.json'))) {
          try {
            serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));
          } catch (e: any) {
            console.warn('[Firebase Admin SDK] Error reading serviceAccountKey.json:', e.message);
          }
        }

        if (serviceAccount) {
          adminApp = initAdminApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id || cfg.projectId,
          });
          console.log('[Firebase Admin SDK] Successfully authenticated with Service Account credentials.');
        } else {
          // 6. Application Default Credentials (works natively on Google Cloud Run, Compute Engine, GKE)
          adminApp = initAdminApp({
            projectId: cfg.projectId,
          });
          console.log('[Firebase Admin SDK] Initialized with Application Default Credentials (ADC).');
        }
      }

      adminDb = getAdminFirestore(adminApp, cfg.firestoreDatabaseId);
      console.log('[Firebase Admin SDK] Connected to Firestore database:', cfg.firestoreDatabaseId);
      return adminDb;
    } catch (e: any) {
      console.warn('[Firebase Admin SDK] Initialization notice:', e.message);
      return null;
    }
  }

  // Endpoint 1: Save test keys (teacher)
  app.post('/api/save-test-keys', async (req, res) => {
    try {
      const { testId, keys } = req.body || {};
      if (testId && Array.isArray(keys)) {
        testKeysVault.set(testId, keys);
        try {
          const cfg = (await import('./firebase-applet-config.json', { with: { type: 'json' } })).default;
          const dbAdmin = getAdminDb(cfg);
          if (dbAdmin) {
            await dbAdmin.collection('test_keys').doc(testId).set({
              testId,
              keys,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (e: any) {
          console.warn('[Firebase Admin SDK] Notice saving test_keys:', e.message);
        }
      }
      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Endpoint 2: Verify answers & create submission securely on the server
  app.post('/api/verify-answers', async (req, res) => {
    try {
      const { testId, studentName, groupName, answers } = req.body || {};
      if (!testId || !studentName || !groupName || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Неверные параметры запроса сдачи теста.' });
      }

      let correctKeys = testKeysVault.get(testId);
      const cfg = (await import('./firebase-applet-config.json', { with: { type: 'json' } })).default;

      // 1. Try Firebase Admin SDK to fetch test_keys if not in memory (Admin SDK bypasses read: if false)
      if (!correctKeys) {
        const dbAdmin = getAdminDb(cfg);
        if (dbAdmin) {
          try {
            const keyDoc = await dbAdmin.collection('test_keys').doc(testId).get();
            if (keyDoc.exists) {
              const loadedKeys = keyDoc.data()?.keys;
              if (Array.isArray(loadedKeys) && loadedKeys.length > 0) {
                correctKeys = loadedKeys;
                testKeysVault.set(testId, loadedKeys);
              }
            }
          } catch (adminReadErr: any) {
            console.warn('[Firebase Admin SDK] Could not read test_keys:', adminReadErr.message);
          }
        }
      }

      // 2. Fallback check
      if (!correctKeys) {
        try {
          const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents/test_keys/${testId}?key=${cfg.apiKey}`;
          const r = await fetch(url);
          if (r.ok) {
            const data = await r.json();
            const values = data.fields?.keys?.arrayValue?.values || [];
            const loadedKeys: number[] = values.map((v: any) => Number(v.integerValue ?? 0));
            if (loadedKeys.length > 0) {
              correctKeys = loadedKeys;
              testKeysVault.set(testId, loadedKeys);
            }
          }
        } catch (fsErr) {
          console.warn('Firestore fallback error:', fsErr);
        }
      }

      if (!correctKeys || correctKeys.length === 0) {
        return res.status(404).json({ error: 'Ключи для этого теста не найдены на сервере.' });
      }

      // Calculate score on server
      let score = 0;
      const totalQuestions = correctKeys.length;
      answers.forEach((ans: number, idx: number) => {
        if (idx < totalQuestions && ans === correctKeys[idx]) {
          score++;
        }
      });

      const percentage = Math.round((score / totalQuestions) * 100);
      const submissionId = `sub-${testId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const submittedAt = new Date().toISOString();

      const submissionData = {
        id: submissionId,
        testId,
        studentName: String(studentName).trim(),
        groupName: String(groupName).trim(),
        score,
        totalQuestions,
        percentage,
        submittedAt,
        answers,
      };

      // Server creates the document directly in Firestore via Firebase Admin SDK
      const dbAdmin = getAdminDb(cfg);
      let writtenToDb = false;

      if (dbAdmin) {
        try {
          await dbAdmin.collection('submissions').doc(submissionId).set({
            id: submissionId,
            testId,
            studentName: submissionData.studentName,
            groupName: submissionData.groupName,
            score,
            totalQuestions,
            percentage,
            submittedAt,
            answers,
          });
          writtenToDb = true;
          console.log(`[Firebase Admin SDK] Submission ${submissionId} successfully saved to Firestore.`);
        } catch (adminWriteErr: any) {
          console.warn('[Firebase Admin SDK] Admin write notice:', adminWriteErr.message);
        }
      }

      if (!writtenToDb) {
        // Fallback for preview environments without service account key:
        try {
          const createDocUrl = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents/submissions?documentId=${submissionId}&key=${cfg.apiKey}`;
          const firestorePayload = {
            fields: {
              id: { stringValue: submissionId },
              testId: { stringValue: testId },
              studentName: { stringValue: submissionData.studentName },
              groupName: { stringValue: submissionData.groupName },
              score: { integerValue: score },
              totalQuestions: { integerValue: totalQuestions },
              percentage: { integerValue: percentage },
              submittedAt: { stringValue: submittedAt },
              answers: {
                arrayValue: {
                  values: answers.map((a: number) => ({ integerValue: a })),
                },
              },
            },
          };
          const fsRes = await fetch(createDocUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(firestorePayload),
          });
          if (fsRes.ok) {
            writtenToDb = true;
          }
        } catch (restErr: any) {
          console.warn('REST fallback error:', restErr.message);
        }
      }

      return res.status(200).json({ success: true, submission: submissionData });
    } catch (error: any) {
      console.error('Verify answers error:', error);
      return res.status(500).json({ error: error.message || 'Ошибка проверки ответов' });
    }
  });

  // Endpoint 3: Generate test from lecture using Gemini Flash
  app.post('/api/generate-test', async (req, res) => {
    try {
      const { lectureText, questionCount = 15 } = req.body || {};

      if (!lectureText || typeof lectureText !== 'string' || lectureText.trim().length < 30) {
        return res.status(400).json({ error: 'Текст лекции слишком короткий (минимум 30 символов).' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY не настроен на сервере.' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Ты строгий университетский преподаватель и эксперт по составлению экзаменационных тестов.
Твоя задача — составить тест из ровно ${questionCount} вопросов на русском языке строго по содержанию текста следующей лекции.

КРИТИЧЕСКИЕ ПРАВИЛА:
1. Вопросы должны быть СТРОГО по содержанию текста лекции.
2. В каждом вопросе должно быть РОВНО 5 вариантов ответа (options), ни больше, ни меньше.
3. В каждом вопросе должен быть РОВНО 1 правильный ответ.
4. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ вопросы типа "Верно/Неверно" (True/False). Только вопросы с выбором 1 из 5 вариантов.
5. Индекс correctOptionIndex — это число от 0 до 4, указывающее на правильный ответ в массиве options.
6. Варианты ответов должны быть реалистичными и содержательными.
7. Ответ должен быть строго в формате JSON, без пояснений и без markdown.

Текст лекции:
${lectureText.slice(0, 40000)}
`;

      // Robust generation with fallback chain: gemini-2.5-flash -> gemini-flash-latest -> gemini-3.8-flash
      const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
      let response: any = null;
      let lastErr: any = null;

      const generationConfig = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Краткое название темы лекции/теста',
            },
            questions: {
              type: Type.ARRAY,
              description: `Список из ровно ${questionCount} тестовых вопросов`,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: {
                    type: Type.STRING,
                    description: 'Текст вопроса',
                  },
                  options: {
                    type: Type.ARRAY,
                    description: 'Ровно 5 вариантов ответа',
                    items: { type: Type.STRING },
                  },
                  correctOptionIndex: {
                    type: Type.INTEGER,
                    description: 'Индекс правильного ответа от 0 до 4',
                  },
                },
                required: ['text', 'options', 'correctOptionIndex'],
              },
            },
          },
          required: ['title', 'questions'],
        },
      };

      for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
        const modelName = modelsToTry[attempt];
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: generationConfig,
          });
          if (response && response.text) {
            break;
          }
        } catch (err: any) {
          lastErr = err;
          console.warn(`Model ${modelName} attempt ${attempt + 1} failed:`, err?.message || err);
          if (attempt < modelsToTry.length - 1) {
            // Brief pause before trying next model to allow transient demand spikes to clear
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
      }

      if (!response || !response.text) {
        throw new Error(
          lastErr?.message || 'Сервис генерации временно перегружен. Пожалуйста, повторите попытку через несколько секунд.'
        );
      }

      const rawText = response.text || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const cleanJson = rawText.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleanJson);
      }

      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error('Модель не вернула список вопросов. Пожалуйста, попробуйте еще раз.');
      }

      return res.status(200).json(parsed);
    } catch (error: any) {
      console.error('Server generate error:', error);
      let errMsg = error.message || 'Ошибка генерации вопросов через Gemini Flash.';
      if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
        errMsg = 'Сервер Gemini временно перегружен (высокий спрос). Пожалуйста, нажмите «Сгенерировать тест» ещё раз.';
      }
      return res.status(500).json({ error: errMsg });
    }
  });

  // Mount Vite middleware in development or static files in production
  const distPath = path.join(__dirname, 'dist');
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

  if (isProduction && fs.existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Express + Vite server is running on port ${port}`);
  });
}

startServer();
