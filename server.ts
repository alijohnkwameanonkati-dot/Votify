import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PYTHON_BRIDGE_PATH = path.resolve(__dirname, 'python_app', 'votexa_bridge.py');
const UPLOADS_DIR = path.resolve(__dirname, 'data', 'uploads');
const PHOTOS_DIR = path.resolve(UPLOADS_DIR, 'photos');
const MANIFESTOS_DIR = path.resolve(UPLOADS_DIR, 'manifestos');
const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

fs.mkdirSync(PHOTOS_DIR, { recursive: true });
fs.mkdirSync(MANIFESTOS_DIR, { recursive: true });

// Session signing secret held in server memory (process.env override supported)
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const MAX_MANIFESTO_BYTES = 4 * 1024 * 1024;
const revokedTokens = new Set<string>();

interface SessionPayload {
  role: 'admin';
  jti: string;
  iat: number;
  exp: number;
}

function signAdminToken(): string {
  const now = Date.now();
  const payload: SessionPayload = {
    role: 'admin',
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyAdminToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
    if (parsed.role !== 'admin' || typeof parsed.exp !== 'number' || typeof parsed.jti !== 'string') {
      return null;
    }
    if (Date.now() > parsed.exp || revokedTokens.has(parsed.jti)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

interface BridgeResponse {
  ok: boolean;
  httpStatus?: number;
  removedFiles?: string[];
  [key: string]: unknown;
}

function runPythonBridge(action: string, payload: Record<string, unknown> = {}): Promise<BridgeResponse> {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', [PYTHON_BRIDGE_PATH, action], {
      cwd: __dirname,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Python bridge timed out'));
    }, 8000);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Python bridge exited with code ${code}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim()) as BridgeResponse;
        resolve(parsed);
      } catch {
        reject(new Error('Invalid JSON response from Python bridge'));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ ok: false, code: 'UNAUTHORIZED', message: 'Administrator authentication required.' });
    return;
  }
  const session = verifyAdminToken(token);
  if (!session) {
    res.status(401).json({ ok: false, code: 'UNAUTHORIZED', message: 'Invalid or expired administrator session.' });
    return;
  }
  res.locals.adminSession = session;
  next();
}

function decodeBase64Payload(raw: string): Buffer {
  const stripped = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw;
  return Buffer.from(stripped, 'base64');
}

function detectImageExtension(buf: Buffer): 'png' | 'jpg' | 'webp' | null {
  if (buf.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpg';
  }
  // WEBP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

function savePhotoUpload(input: unknown): { ok: true; filename: string } | { ok: false; message: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, message: 'Invalid photo payload.' };
  }
  const dataBase64 = (input as { dataBase64?: unknown }).dataBase64;
  if (typeof dataBase64 !== 'string' || !dataBase64) {
    return { ok: false, message: 'Missing photo data.' };
  }

  const buf = decodeBase64Payload(dataBase64);
  if (buf.length === 0 || buf.length > MAX_PHOTO_BYTES) {
    return { ok: false, message: 'Photo file must be under 3 MB.' };
  }

  const ext = detectImageExtension(buf);
  if (!ext) {
    return { ok: false, message: 'Only PNG, JPG, or WEBP image files are supported.' };
  }

  const filename = `${crypto.randomUUID()}.${ext}`;
  const targetPath = path.resolve(PHOTOS_DIR, filename);
  if (!targetPath.startsWith(PHOTOS_DIR + path.sep)) {
    return { ok: false, message: 'Invalid upload destination.' };
  }
  fs.writeFileSync(targetPath, buf);
  return { ok: true, filename };
}

function sanitizeDisplayFilename(name: string, fallbackExt: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return base || `manifesto.${fallbackExt}`;
}

function saveManifestoUpload(
  input: unknown,
): { ok: true; filename: string; originalName: string; extractedText?: string } | { ok: false; message: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, message: 'Invalid manifesto file payload.' };
  }
  const { dataBase64, fileName } = input as { dataBase64?: unknown; fileName?: unknown };
  if (typeof dataBase64 !== 'string' || !dataBase64) {
    return { ok: false, message: 'Missing manifesto file data.' };
  }

  const buf = decodeBase64Payload(dataBase64);
  if (buf.length === 0 || buf.length > MAX_MANIFESTO_BYTES) {
    return { ok: false, message: 'Manifesto file must be under 4 MB.' };
  }

  const rawName = typeof fileName === 'string' ? fileName : 'manifesto.txt';
  const lower = rawName.toLowerCase();

  if (buf.subarray(0, 5).toString('ascii') === '%PDF-') {
    const filename = `${crypto.randomUUID()}.pdf`;
    const targetPath = path.resolve(MANIFESTOS_DIR, filename);
    if (!targetPath.startsWith(MANIFESTOS_DIR + path.sep)) {
      return { ok: false, message: 'Invalid manifesto destination.' };
    }
    fs.writeFileSync(targetPath, buf);
    return {
      ok: true,
      filename,
      originalName: sanitizeDisplayFilename(rawName, 'pdf'),
    };
  }

  if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    // Reject binary files disguised as .txt/.md
    if (buf.includes(0)) {
      return { ok: false, message: 'Text manifesto files cannot contain binary bytes.' };
    }
    const ext = lower.endsWith('.md') ? 'md' : 'txt';
    const filename = `${crypto.randomUUID()}.${ext}`;
    const targetPath = path.resolve(MANIFESTOS_DIR, filename);
    if (!targetPath.startsWith(MANIFESTOS_DIR + path.sep)) {
      return { ok: false, message: 'Invalid manifesto destination.' };
    }
    fs.writeFileSync(targetPath, buf);
    return {
      ok: true,
      filename,
      originalName: sanitizeDisplayFilename(rawName, ext),
      extractedText: buf.toString('utf8').slice(0, 12000).trim(),
    };
  }

  return { ok: false, message: 'Manifesto file must be a PDF, TXT, or MD document.' };
}

function cleanupRemovedFiles(relativePaths: string[] | undefined): void {
  if (!Array.isArray(relativePaths)) return;
  for (const rel of relativePaths) {
    const target = path.resolve(UPLOADS_DIR, rel);
    if (target.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(target)) {
      try {
        fs.unlinkSync(target);
      } catch {
        // Ignore non-fatal cleanup failure
      }
    }
  }
}

async function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      const info = await runPythonBridge('info');
      res.json({ ok: true, engine: 'python3', brand: info.brand ?? 'VOTIFY', status: info.status ?? 'Open' });
    } catch {
      res.status(500).json({ ok: false, message: 'Voting engine unavailable' });
    }
  });

  app.get('/api/election/info', async (_req, res) => {
    try {
      const info = await runPythonBridge('info');
      res.json(info);
    } catch {
      res.status(500).json({ ok: false, message: 'Unable to load election metadata' });
    }
  });

  app.get('/api/uploads/photos/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(filename)) {
      res.status(404).end();
      return;
    }
    const resolved = path.resolve(PHOTOS_DIR, filename);
    if (!resolved.startsWith(PHOTOS_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).end();
      return;
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(resolved);
  });

  app.get('/api/uploads/manifestos/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!/^[a-f0-9-]+\.(pdf|txt|md)$/.test(filename)) {
      res.status(404).end();
      return;
    }
    const resolved = path.resolve(MANIFESTOS_DIR, filename);
    if (!resolved.startsWith(MANIFESTOS_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).end();
      return;
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(resolved);
  });

  app.post('/api/vote', async (req, res) => {
    const body = req.body as { voterId?: unknown; candidateId?: unknown };
    if (typeof body?.voterId !== 'string' || typeof body?.candidateId !== 'string') {
      res.status(400).json({ ok: false, code: 'INVALID_REQUEST', message: 'Voter ID and candidate selection are required.' });
      return;
    }

    try {
      const result = await runPythonBridge('vote', {
        voterId: body.voterId,
        candidateId: body.candidateId,
      });
      const status = typeof result.httpStatus === 'number' ? result.httpStatus : result.ok ? 200 : 400;
      const { httpStatus: _ignored, ...cleanResult } = result;
      res.status(status).json(cleanResult);
    } catch {
      res.status(500).json({ ok: false, code: 'SERVER_ERROR', message: 'Unable to record vote right now.' });
    }
  });

  app.post('/api/admin/login', async (req, res) => {
    const body = req.body as { password?: unknown };
    if (typeof body?.password !== 'string') {
      res.status(400).json({ ok: false, code: 'INVALID_REQUEST', message: 'Password is required.' });
      return;
    }

    try {
      const result = await runPythonBridge('verify_admin', { password: body.password });
      if (!result.ok) {
        res.status(401).json({ ok: false, code: 'ACCESS_DENIED', message: 'ACCESS DENIED' });
        return;
      }
      const token = signAdminToken();
      res.json({
        ok: true,
        code: 'ACCESS_GRANTED',
        message: 'ACCESS GRANTED',
        token,
        expiresInMs: TOKEN_TTL_MS,
      });
    } catch {
      res.status(500).json({ ok: false, code: 'SERVER_ERROR', message: 'Authentication check failed.' });
    }
  });

  app.post('/api/admin/logout', requireAdmin, (_req, res) => {
    const session = res.locals.adminSession as SessionPayload | undefined;
    if (session?.jti) {
      revokedTokens.add(session.jti);
    }
    res.json({ ok: true, message: 'Signed out successfully.' });
  });

  app.get('/api/admin/session', requireAdmin, (_req, res) => {
    res.json({ ok: true, authenticated: true });
  });

  app.post('/api/admin/password', requireAdmin, async (req, res) => {
    const body = req.body as { currentPassword?: unknown; newPassword?: unknown };
    if (typeof body?.currentPassword !== 'string' || typeof body?.newPassword !== 'string') {
      res.status(400).json({ ok: false, message: 'Current password and new password are required.' });
      return;
    }

    try {
      const result = await runPythonBridge('change_admin_password', {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      });
      const status = typeof result.httpStatus === 'number' ? result.httpStatus : result.ok ? 200 : 400;
      const { httpStatus: _ignored, ...clean } = result;
      res.status(status).json(clean);
    } catch {
      res.status(500).json({ ok: false, message: 'Unable to update administrator password.' });
    }
  });

  app.get('/api/admin/results', requireAdmin, async (_req, res) => {
    try {
      const results = await runPythonBridge('results');
      res.json(results);
    } catch {
      res.status(500).json({ ok: false, message: 'Unable to retrieve election results.' });
    }
  });

  app.get('/api/admin/winner', requireAdmin, async (_req, res) => {
    try {
      const winner = await runPythonBridge('winner');
      res.json(winner);
    } catch {
      res.status(500).json({ ok: false, message: 'Unable to determine election winner.' });
    }
  });

  app.post('/api/admin/candidates', requireAdmin, async (req, res) => {
    const body = req.body as {
      name?: unknown;
      manifestoText?: unknown;
      photo?: unknown;
      manifestoFile?: unknown;
    };

    if (typeof body?.name !== 'string' || !body.name.trim()) {
      res.status(400).json({ ok: false, message: 'Candidate name cannot be empty.' });
      return;
    }

    let photoFilename: string | null = null;
    let manifestoFilename: string | null = null;
    let manifestoOriginalName: string | null = null;
    let manifestoText = typeof body.manifestoText === 'string' ? body.manifestoText : '';

    if (body.photo) {
      const savedPhoto = savePhotoUpload(body.photo);
      if (!savedPhoto.ok) {
        res.status(400).json({ ok: false, message: savedPhoto.message });
        return;
      }
      photoFilename = savedPhoto.filename;
    }

    if (body.manifestoFile) {
      const savedManifesto = saveManifestoUpload(body.manifestoFile);
      if (!savedManifesto.ok) {
        if (photoFilename) cleanupRemovedFiles([`photos/${photoFilename}`]);
        res.status(400).json({ ok: false, message: savedManifesto.message });
        return;
      }
      manifestoFilename = savedManifesto.filename;
      manifestoOriginalName = savedManifesto.originalName;
      if (!manifestoText.trim() && savedManifesto.extractedText) {
        manifestoText = savedManifesto.extractedText;
      }
    }

    try {
      const result = await runPythonBridge('add_candidate', {
        name: body.name,
        manifestoText,
        photoFilename,
        manifestoFilename,
        manifestoOriginalName,
      });
      if (!result.ok) {
        cleanupRemovedFiles([
          ...(photoFilename ? [`photos/${photoFilename}`] : []),
          ...(manifestoFilename ? [`manifestos/${manifestoFilename}`] : []),
        ]);
      }
      const status = typeof result.httpStatus === 'number' ? result.httpStatus : result.ok ? 201 : 400;
      const { httpStatus: _ignored, ...clean } = result;
      res.status(status).json(clean);
    } catch {
      cleanupRemovedFiles([
        ...(photoFilename ? [`photos/${photoFilename}`] : []),
        ...(manifestoFilename ? [`manifestos/${manifestoFilename}`] : []),
      ]);
      res.status(500).json({ ok: false, message: 'Unable to add candidate.' });
    }
  });

  app.patch('/api/admin/candidates/:id', requireAdmin, async (req, res) => {
    const candidateId = req.params.id;
    const body = req.body as {
      name?: unknown;
      manifestoText?: unknown;
      photo?: unknown;
      clearPhoto?: unknown;
      manifestoFile?: unknown;
      clearManifestoFile?: unknown;
    };

    let photoFilename: string | undefined;
    let manifestoFilename: string | undefined;
    let manifestoOriginalName: string | undefined;
    let manifestoText = typeof body.manifestoText === 'string' ? body.manifestoText : undefined;

    if (body.photo) {
      const savedPhoto = savePhotoUpload(body.photo);
      if (!savedPhoto.ok) {
        res.status(400).json({ ok: false, message: savedPhoto.message });
        return;
      }
      photoFilename = savedPhoto.filename;
    }

    if (body.manifestoFile) {
      const savedManifesto = saveManifestoUpload(body.manifestoFile);
      if (!savedManifesto.ok) {
        if (photoFilename) cleanupRemovedFiles([`photos/${photoFilename}`]);
        res.status(400).json({ ok: false, message: savedManifesto.message });
        return;
      }
      manifestoFilename = savedManifesto.filename;
      manifestoOriginalName = savedManifesto.originalName;
      if ((manifestoText === undefined || !manifestoText.trim()) && savedManifesto.extractedText) {
        manifestoText = savedManifesto.extractedText;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        candidateId,
        clearPhoto: body.clearPhoto === true,
        clearManifestoFile: body.clearManifestoFile === true,
      };
      if (typeof body.name === 'string') payload.name = body.name;
      if (manifestoText !== undefined) payload.manifestoText = manifestoText;
      if (photoFilename !== undefined) payload.photoFilename = photoFilename;
      if (manifestoFilename !== undefined) {
        payload.manifestoFilename = manifestoFilename;
        payload.manifestoOriginalName = manifestoOriginalName;
      }

      const result = await runPythonBridge('update_candidate', payload);
      if (result.ok) {
        cleanupRemovedFiles(result.removedFiles);
      } else {
        cleanupRemovedFiles([
          ...(photoFilename ? [`photos/${photoFilename}`] : []),
          ...(manifestoFilename ? [`manifestos/${manifestoFilename}`] : []),
        ]);
      }

      const status = typeof result.httpStatus === 'number' ? result.httpStatus : result.ok ? 200 : 400;
      const { httpStatus: _ignored, removedFiles: _removed, ...clean } = result;
      res.status(status).json(clean);
    } catch {
      cleanupRemovedFiles([
        ...(photoFilename ? [`photos/${photoFilename}`] : []),
        ...(manifestoFilename ? [`manifestos/${manifestoFilename}`] : []),
      ]);
      res.status(500).json({ ok: false, message: 'Unable to update candidate.' });
    }
  });

  app.delete('/api/admin/candidates/:id', requireAdmin, async (req, res) => {
    try {
      const result = await runPythonBridge('remove_candidate', { candidateId: req.params.id });
      if (result.ok) {
        cleanupRemovedFiles(result.removedFiles);
      }
      const status = typeof result.httpStatus === 'number' ? result.httpStatus : result.ok ? 200 : 400;
      const { httpStatus: _ignored, removedFiles: _removed, ...clean } = result;
      res.status(status).json(clean);
    } catch {
      res.status(500).json({ ok: false, message: 'Unable to remove candidate.' });
    }
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VOTIFY server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start VOTIFY server:', err);
  process.exit(1);
});
