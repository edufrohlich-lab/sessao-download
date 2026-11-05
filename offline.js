const volta = new URLSearchParams(location.search).get('volta') || '';
let segundos = 10;

function tentar() {
  if (/^https?:\/\//.test(volta)) location.href = volta;
}

document.getElementById('tentar').addEventListener('click', tentar);
setInterval(() => {
  segundos -= 1;
  if (segundos <= 0) return tentar();
  document.getElementById('contagem').textContent = `Tentando de novo em ${segundos} segundos…`;
}, 1000);
