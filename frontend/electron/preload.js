const { contextBridge, ipcRenderer } = require('electron');

// Expone funciones seguras al renderer (React)
contextBridge.exposeInMainWorld('electronAPI', {
  // Control de ventana (para la titlebar custom)
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow:    () => ipcRenderer.send('window-close'),

  // Plataforma (para estilos condicionales macOS/Windows)
  platform: process.platform,
});
