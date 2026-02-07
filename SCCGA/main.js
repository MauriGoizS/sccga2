const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow() {
  // --- LÓGICA DE RUTA DINÁMICA ---
  // Si la app está empaquetada, busca en 'resources', si no, en la raíz actual
  const backendPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'main.exe') 
    : path.join(__dirname, 'main.exe');

  console.log("Iniciando backend en:", backendPath);

  backendProcess = spawn(backendPath, [], { shell: false });

  backendProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`));
  backendProcess.stderr.on('data', (data) => console.error(`Error Backend: ${data}`));

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "SCCGA - Gestión Textil",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Ruta al index generado por Angular
  const indexPath = path.join(__dirname, 'dist/SCCGA/browser/index.html');
  mainWindow.loadFile(indexPath);

  // Cerrar backend al cerrar ventana
  mainWindow.on('closed', () => {
    if (backendProcess && process.platform === 'win32') {
      exec(`taskkill /pid ${backendProcess.pid} /f /t`);
    }
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});