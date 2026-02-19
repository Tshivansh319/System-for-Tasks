// Use ES module imports to resolve 'require' name error in TypeScript and follow modern standards
import { app, BrowserWindow } from 'electron';
// Import Node.js path module using ES module syntax
import * as path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#09090b',
  });

  // In production, load the built index.html
  // win.loadFile(path.join(__dirname, '../dist/index.html'));
  
  // In development:
  win.loadURL('http://localhost:5173');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Fix: Property 'platform' does not exist on type 'Process'. 
  // We cast process to any to access Node.js specific global properties in this context.
  if ((process as any).platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});