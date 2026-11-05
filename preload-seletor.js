// Ponte mínima entre a janela do seletor e o programa (só estas duas funções).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('seletor', {
  fontes: () => ipcRenderer.invoke('seletor:fontes'),
  escolher: (resultado) => ipcRenderer.send('seletor:resultado', resultado),
});
