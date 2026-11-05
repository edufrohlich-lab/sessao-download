// Sessão para Windows: uma janela que abre o site, com captura do som do computador ao transmitir.
const { app, BrowserWindow, session, desktopCapturer, ipcMain, shell, Menu, dialog, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');

const SITE = (process.env.SESSAO_URL || require('./package.json').siteUrl).replace(/\/+$/, '');
const ORIGEM = new URL(SITE).origin;
const ICONE = path.join(__dirname, 'assets', 'icone.png');
const COM_SOM_DO_SISTEMA = process.platform === 'win32'; // captura do som do computador só existe no Windows

// Sem o "clique para ativar o som" e sem capturar o som do próprio programa (vozes da sala) quando possível
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-features', 'RestrictOwnAudio');
app.setAppUserModelId('com.edufrohlich.sessao');
// Pasta própria para login salvo e preferências (%APPDATA%\\Sessao no Windows)
app.setPath('userData', path.join(app.getPath('appData'), 'Sessao'));

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let janela = null;

// ---------- Tamanho e posição da janela ----------
const ARQ_JANELA = () => path.join(app.getPath('userData'), 'janela.json');
function lerEstadoJanela() {
  try {
    return JSON.parse(fs.readFileSync(ARQ_JANELA(), 'utf8'));
  } catch {
    return { width: 1280, height: 800 };
  }
}
function salvarEstadoJanela() {
  if (!janela || janela.isDestroyed()) return;
  const estado = { ...janela.getNormalBounds(), maximizada: janela.isMaximized() };
  try { fs.writeFileSync(ARQ_JANELA(), JSON.stringify(estado)); } catch { /* ignora */ }
}

function origemDe(url) {
  try { return new URL(url).origin; } catch { return ''; }
}

function abrirFora(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

// ---------- Janela principal ----------
function criarJanela() {
  const estado = lerEstadoJanela();
  janela = new BrowserWindow({
    x: estado.x,
    y: estado.y,
    width: estado.width || 1280,
    height: estado.height || 800,
    minWidth: 860,
    minHeight: 560,
    title: 'Sessão',
    icon: ICONE,
    backgroundColor: '#0e0d0c',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false, // continua transmitindo e tocando com a janela minimizada
    },
  });
  if (estado.maximizada) janela.maximize();

  const wc = janela.webContents;
  wc.setUserAgent(`${wc.getUserAgent()} SessaoApp/${app.getVersion()}`);

  janela.once('ready-to-show', () => janela.show());
  janela.on('close', salvarEstadoJanela);
  janela.on('closed', () => { janela = null; });

  // Só o site da Sessão abre dentro do programa; o resto vai para o navegador
  wc.setWindowOpenHandler(({ url }) => {
    abrirFora(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (evento, url) => {
    if (origemDe(url) === ORIGEM || url.startsWith('file://')) return;
    evento.preventDefault();
    abrirFora(url);
  });

  // Sem internet ou servidor fora do ar: página própria que tenta de novo sozinha
  wc.on('did-fail-load', (_e, codigo, _desc, url, principal) => {
    if (!principal || codigo === -3) return; // -3 = navegação cancelada (normal)
    const volta = origemDe(url) === ORIGEM ? url : `${SITE}/salas`;
    janela.loadFile(path.join(__dirname, 'offline.html'), { query: { volta } });
  });

  // Atalhos (o programa não tem menu)
  wc.on('before-input-event', (evento, tecla) => {
    if (tecla.type !== 'keyDown') return;
    const ctrl = tecla.control || tecla.meta;
    if (tecla.key === 'F11') {
      janela.setFullScreen(!janela.isFullScreen());
    } else if (tecla.key === 'F5' || (ctrl && tecla.key.toLowerCase() === 'r')) {
      if (tecla.shift) wc.reloadIgnoringCache(); else wc.reload();
    } else if (ctrl && tecla.shift && tecla.key.toLowerCase() === 'i') {
      wc.toggleDevTools();
    } else if (ctrl && (tecla.key === '=' || tecla.key === '+')) {
      wc.setZoomLevel(Math.min(wc.getZoomLevel() + 0.5, 4));
    } else if (ctrl && tecla.key === '-') {
      wc.setZoomLevel(Math.max(wc.getZoomLevel() - 0.5, -3));
    } else if (ctrl && tecla.key === '0') {
      wc.setZoomLevel(0);
    } else {
      return;
    }
    evento.preventDefault();
  });

  janela.loadURL(`${SITE}/salas`);
}

// ---------- Permissões: só o site da Sessão, só o necessário ----------
const PERMITIDAS = new Set(['media', 'display-capture', 'fullscreen', 'clipboard-sanitized-write', 'speaker-selection']);

// Se a privacidade do Windows estiver bloqueando o microfone, avisa e oferece abrir a tela certa
let ultimoAvisoMicrofone = 0;
function avisarSeWindowsBloqueiaMicrofone() {
  if (process.platform !== 'win32') return;
  let estado = 'unknown';
  try { estado = systemPreferences.getMediaAccessStatus('microphone'); } catch { return; }
  if (estado !== 'denied' || Date.now() - ultimoAvisoMicrofone < 30000) return;
  ultimoAvisoMicrofone = Date.now();
  const opcoes = {
    type: 'warning',
    title: 'Microfone bloqueado pelo Windows',
    message: 'O Windows está impedindo programas de usar o microfone.',
    detail: 'Na tela que vai abrir, ligue "Acesso ao microfone" e também '
      + '"Permitir que aplicativos da área de trabalho acessem o microfone". '
      + 'Depois volte aqui e ligue o microfone de novo.',
    buttons: ['Abrir configurações do microfone', 'Agora não'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  };
  const mostrar = janela ? dialog.showMessageBox(janela, opcoes) : dialog.showMessageBox(opcoes);
  mostrar.then(({ response }) => {
    if (response === 0) shell.openExternal('ms-settings:privacy-microphone').catch(() => {});
  }).catch(() => {});
}

function configurarPermissoes() {
  const s = session.defaultSession;
  s.setPermissionRequestHandler((_wc, permissao, responder, detalhes) => {
    const ok = origemDe(detalhes.requestingUrl) === ORIGEM && PERMITIDAS.has(permissao);
    if (ok && permissao === 'media' && (detalhes.mediaTypes || []).includes('audio')) {
      try { avisarSeWindowsBloqueiaMicrofone(); } catch { /* nunca atrapalha o pedido */ }
    }
    responder(ok);
  });
  s.setPermissionCheckHandler((_wc, permissao, origem) => origemDe(origem) === ORIGEM && PERMITIDAS.has(permissao));
  s.setDevicePermissionHandler(() => false); // USB, serial etc.: nunca

  // "Transmitir minha tela": abre o nosso seletor em vez do do Chrome
  s.setDisplayMediaRequestHandler(async (pedido, responder) => {
    try {
      if (origemDe(pedido.securityOrigin) !== ORIGEM) return responder(null);
      const escolha = await abrirSeletor(pedido.audioRequested);
      if (!escolha) return responder(null);
      // usa a mesma lista que o seletor mostrou (buscar de novo pode travar em alguns computadores)
      const fonte = ultimasFontes.get(escolha.id);
      if (!fonte) return responder(null);
      const streams = { video: fonte };
      if (escolha.som && pedido.audioRequested && COM_SOM_DO_SISTEMA) streams.audio = 'loopback';
      responder(streams);
    } catch (e) {
      console.error('Erro ao escolher a tela:', e);
      responder(null);
    }
  }, { useSystemPicker: false });
}

// ---------- Seletor de tela ----------
let seletorAberto = null;
let ultimasFontes = new Map(); // id -> fonte, da última lista mostrada no seletor
let buscaEmAndamento = null;   // nunca duas buscas de telas ao mesmo tempo

function buscarFontes() {
  if (!buscaEmAndamento) {
    const opcoes = { types: ['screen', 'window'], thumbnailSize: { width: 400, height: 225 } };
    buscaEmAndamento = desktopCapturer.getSources({ ...opcoes, fetchWindowIcons: true })
      .catch(() => [])
      // se vier vazio (acontece em alguns sistemas ao pedir os ícones), tenta sem os ícones
      .then((fontes) => (fontes.length ? fontes : desktopCapturer.getSources(opcoes).catch(() => [])))
      // se a lista de janelas falhar, pelo menos as telas inteiras aparecem
      .then((fontes) => (fontes.length ? fontes : desktopCapturer.getSources({ ...opcoes, types: ['screen'] })))
      .finally(() => { buscaEmAndamento = null; });
  }
  return buscaEmAndamento;
}

function abrirSeletor(somPedido) {
  if (seletorAberto) {
    seletorAberto.janela.focus();
    return Promise.resolve(null);
  }
  return new Promise((resolver) => {
    const sel = new BrowserWindow({
      parent: janela,
      modal: true,
      width: 900,
      height: 640,
      minWidth: 640,
      minHeight: 480,
      title: 'Escolha o que transmitir',
      icon: ICONE,
      backgroundColor: '#0e0d0c',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, 'preload-seletor.js'),
      },
    });
    let terminou = false;
    const fim = (valor) => {
      if (terminou) return;
      terminou = true;
      seletorAberto = null;
      resolver(valor);
      if (!sel.isDestroyed()) sel.close();
    };
    seletorAberto = { janela: sel, fim, somPedido: !!somPedido };
    sel.on('closed', () => fim(null));
    sel.webContents.on('will-navigate', (e) => e.preventDefault());
    sel.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    sel.once('ready-to-show', () => sel.show());
    sel.loadFile(path.join(__dirname, 'seletor.html'));
  });
}

ipcMain.handle('seletor:fontes', async (evento) => {
  if (!seletorAberto || evento.sender !== seletorAberto.janela.webContents) return null;
  const proprias = new Set(BrowserWindow.getAllWindows().map((w) => w.getMediaSourceId()));
  const fontes = (await buscarFontes()).filter((f) => !proprias.has(f.id) && !f.thumbnail.isEmpty());
  ultimasFontes = new Map(fontes.map((f) => [f.id, f]));
  return {
    somDisponivel: COM_SOM_DO_SISTEMA && seletorAberto.somPedido,
    fontes: fontes
      .map((f) => ({
        id: f.id,
        nome: f.name,
        tipo: f.id.startsWith('screen:') ? 'tela' : 'janela',
        miniatura: f.thumbnail.toDataURL(),
        icone: f.appIcon && !f.appIcon.isEmpty() ? f.appIcon.toDataURL() : null,
      })),
  };
});

ipcMain.on('seletor:resultado', (evento, resultado) => {
  if (!seletorAberto || evento.sender !== seletorAberto.janela.webContents) return;
  const ok = resultado && typeof resultado.id === 'string';
  seletorAberto.fim(ok ? { id: resultado.id, som: !!resultado.som } : null);
});

// ---------- Ciclo de vida ----------
app.on('second-instance', () => {
  if (!janela) return;
  if (janela.isMinimized()) janela.restore();
  janela.focus();
});

app.on('web-contents-created', (_e, wc) => {
  wc.on('will-attach-webview', (e) => e.preventDefault()); // nunca abrir <webview>
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  configurarPermissoes();
  criarJanela();
});

app.on('window-all-closed', () => app.quit());
