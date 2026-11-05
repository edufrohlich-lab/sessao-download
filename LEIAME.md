# Sessão para Windows

Programa que abre a Sessão numa janela própria. É o mesmo site, então login, salas, chat, voz e reações funcionam igual, e as novidades do site aparecem sozinhas, sem reinstalar.

O que o programa faz a mais que o navegador:

- **Transmite o som do computador inteiro**: filme no VLC, jogo, YouTube, qualquer programa. Não depende do Chrome nem da caixinha "Compartilhar áudio".
- **Seletor próprio** para escolher a tela inteira ou uma janela, com miniaturas.
- **Continua transmitindo** com a janela minimizada.
- Funciona para quem usa Firefox no dia a dia, porque tem o próprio navegador embutido.

Celular e quem preferir continuam usando o site normalmente.

## Instalar

1. Baixe em [Sessao-Instalador.exe](https://github.com/edufrohlich-lab/sessao-download/releases/latest/download/Sessao-Instalador.exe) e abra o arquivo.
2. Como o programa não tem assinatura digital paga, o Windows mostra **"O Windows protegeu o computador"**. Clique em **Mais informações** e depois em **Executar assim mesmo**.
3. A instalação é rápida e não pede senha de administrador. O atalho **Sessão** aparece na área de trabalho e no menu Iniciar.

Para desinstalar: **Configurações → Aplicativos → Sessão → Desinstalar**.

## Usar

- Entre com o mesmo usuário e senha do site. O login fica salvo.
- Para transmitir, clique em **Transmitir minha tela**, escolha a tela ou a janela e deixe marcado **Transmitir o som do computador**.
- O som de **tudo** que toca no computador vai junto (avisos do Windows e músicas de outros programas também). Feche o que não quiser que os outros ouçam.
- Atalhos: **F11** tela cheia, **F5** recarregar, **Ctrl + / Ctrl −** zoom, **M** liga/desliga o microfone, **1 a 7** reações.

### Eco ao transmitir com som do computador

O programa pede ao Windows para não capturar o som do próprio programa (as vozes da conversa), mas isso depende da versão do Windows. **No primeiro teste, confiram se quem está assistindo ouve a própria voz de volta na transmissão.** Se ouvir:

- quem transmite pode deixar o microfone e as vozes num fone e usar **Saída de som** (botão de ajustes na conversa por voz) para mandar as vozes para um aparelho diferente do padrão do Windows; ou
- transmitir pelo Chrome/Edge escolhendo **uma aba**, que nunca leva as vozes junto.

## Para quem mantém o programa

- O endereço do site está em `package.json` (`siteUrl`).
- Rodar em modo de teste: `npm install` e `npm start` (dá para apontar para outro endereço com a variável `SESSAO_URL`).
- **Publicar uma versão nova:** aumente `version` no `package.json` e envie para o GitHub. A aba **Actions → Publicar instalador** gera o instalador num Windows e publica em **Releases**. O link de download sempre aponta para a versão mais recente. Também dá para rodar na mão com **Run workflow**.
- Gerar no próprio Windows: `npm install` e `npm run instalador` (sai em `dist/`).
- Quem já tem o programa instala a versão nova por cima.

Arquivos:

- `main.js`: janela, permissões (só o site da Sessão pode usar microfone e captura de tela), seletor de tela e som do sistema.
- `seletor.*` e `preload-seletor.js`: janela de escolher o que transmitir.
- `offline.*`: tela de "sem conexão", que tenta de novo sozinha.
