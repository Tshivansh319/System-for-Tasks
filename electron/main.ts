// Use ES module imports to resolve 'require' name error in TypeScript and follow modern standards
import { app, BrowserWindow } from 'electron';
// Import Node.js path module using ES module syntax
import * as path from 'path';
import { fileURLToPath } from 'url';

// Fix: __dirname is not available in ES modules. We define it manually using import.meta.url.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Check if the app is running in development mode (unpackaged)
  const isDev = !app.isPackaged;

  if (isDev) {
    // In development: Load from local dev server
    win.loadURL('http://localhost:5173');
  } else {
    // In production: Load the built index.html from the dist folder
    // Note: __dirname is the directory where this script is located (root/electron/)
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
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