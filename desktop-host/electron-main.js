import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 1. Start Desktop Host Server in-process (Express + WebSocket + BLE + PowerShell Controller)
import './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

/**
 * Global hook registered for server.js to trigger Electron native window operations.
 * Allows instant minimization so underlying PowerPoint, Google Slides, or PDF receives OS focus.
 */
globalThis.onElectronWindowAction = (action) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  try {
    switch (action) {
      case 'MINIMIZE':
        console.log('[Electron] Minimizing window to yield focus to presentation slide...');
        mainWindow.minimize();
        break;
      case 'RESTORE':
        console.log('[Electron] Restoring and focusing window...');
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
        break;
      case 'MINI_PILL':
        console.log('[Electron] Floating Mini Pill Always-On-Top...');
        mainWindow.setAlwaysOnTop(true, 'floating');
        break;
      default:
        console.log(`[Electron] Unhandled window action: ${action}`);
    }
  } catch (err) {
    console.warn('[Electron] Window action error:', err.message);
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#090d16',
    title: 'NextS - Auto-Slide Teleprompter & Host',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  const distIndex = path.join(__dirname, '../mobile-client/dist/index.html');
  const isProduction = fs.existsSync(distIndex);

  const startUrl = isProduction ? 'http://127.0.0.1:3000' : 'http://127.0.0.1:5173';
  console.log(`[Electron] Loading UI from ${startUrl} (${isProduction ? 'Production Dist' : 'Vite Dev Server'})`);

  mainWindow.loadURL(startUrl);

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
