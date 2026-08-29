// Servidor con vuelta a index.html, que es lo que necesita una SPA.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.resolve('dist');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
  '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let archivo = path.join(RAIZ, url);
  try {
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { 'content-type': TIPOS[path.extname(archivo)] || 'application/octet-stream' });
    res.end(cuerpo);
  } catch {
    const cuerpo = await readFile(path.join(RAIZ, 'index.html'));
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(cuerpo);
  }
}).listen(8123, () => console.log('listo en 8123'));
