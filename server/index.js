import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const app = express();
const port = Number(process.env.PORT) || 3001;

app.disable('x-powered-by');

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'program-creator' });
});

app.get('/', (_req, res) => {
  res.redirect('/start/');
});

app.use(express.static(root));

app.listen(port, () => {
  console.log(`Program creator → http://localhost:${port}/start/`);
});
