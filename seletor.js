/* global seletor */
const $ = (id) => document.getElementById(id);
let todas = [];
let aba = 'tela';
let escolhida = null;

function desenhar() {
  const lista = todas.filter((f) => f.tipo === aba);
  if (!lista.some((f) => f.id === escolhida)) escolhida = lista.length === 1 ? lista[0].id : null;
  $('vazio').hidden = lista.length > 0;
  $('grade').replaceChildren(...lista.map((f, i) => {
    const b = document.createElement('button');
    b.className = 'cartao';
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', String(f.id === escolhida));
    const img = document.createElement('img');
    img.src = f.miniatura;
    img.alt = '';
    const nome = document.createElement('span');
    nome.className = 'nome';
    if (f.icone) {
      const ic = document.createElement('img');
      ic.src = f.icone;
      ic.alt = '';
      ic.className = 'icone';
      nome.appendChild(ic);
    }
    nome.append(f.tipo === 'tela' && lista.length > 1 ? `Tela ${i + 1}` : (f.tipo === 'tela' ? 'Tela inteira' : f.nome));
    b.append(img, nome);
    b.addEventListener('click', () => { escolhida = f.id; desenhar(); });
    b.addEventListener('dblclick', () => { escolhida = f.id; transmitir(); });
    return b;
  }));
  $('transmitir').disabled = !escolhida;
}

async function carregar() {
  const dados = await seletor.fontes();
  if (!dados) return;
  todas = dados.fontes;
  $('campo-som').hidden = !dados.somDisponivel;
  desenhar();
}

function trocarAba(nova) {
  aba = nova;
  $('aba-tela').setAttribute('aria-selected', String(nova === 'tela'));
  $('aba-janela').setAttribute('aria-selected', String(nova === 'janela'));
  desenhar();
}

function transmitir() {
  if (!escolhida) return;
  seletor.escolher({ id: escolhida, som: !$('campo-som').hidden && $('som').checked });
}

$('aba-tela').addEventListener('click', () => trocarAba('tela'));
$('aba-janela').addEventListener('click', () => trocarAba('janela'));
$('atualizar').addEventListener('click', carregar);
$('cancelar').addEventListener('click', () => seletor.escolher(null));
$('transmitir').addEventListener('click', transmitir);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') seletor.escolher(null);
  if (e.key === 'Enter' && escolhida) transmitir();
});

carregar();
