// Service worker do "Descubra com o Gráfico": guarda o app no aparelho para abrir sem internet.
// - A página (index.html) vem primeiro da rede: com internet, o estudante sempre recebe a versão mais nova;
//   sem internet (ou rede lenta, mais de 4 s), abre a cópia guardada.
// - Ícones, logo e manifesto vêm da cópia guardada.
// - Os envios para a planilha do professor (Google Apps Script) nunca passam por aqui.
const CACHE = 'dcg-professor-v42';
const ARQUIVOS = ["./", "index.html", "manifest.json", "icone-192.png", "icone-512.png", "icone-180.png", "ifrj_logo_branca.png"];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  // apaga as cópias de versões anteriores
  ev.waitUntil(caches.keys()
    .then(nomes => Promise.all(nomes.filter(n => n.startsWith('dcg-') && n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

function daRede(req, ms) {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('rede lenta')), ms);
    fetch(req).then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); falha(e); });
  });
}

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;   // planilha e outros sites: direto
  if (req.mode === 'navigate') {
    ev.respondWith(daRede(req, 4000)
      .then(r => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copia)); } return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  ev.respondWith(caches.match(req, { ignoreSearch: true }).then(guardado => guardado || fetch(req)));
});
