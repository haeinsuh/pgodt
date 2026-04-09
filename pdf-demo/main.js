const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "PDF Utility Hub",
    autoHideMenuBar: true, // Hide the default menu bar for a cleaner look
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
  
  // Try to use the native SaveDialog from Electron internally if File API is blocked
  // But since we use File System Access API, Electron mostly supports it.
  // Actually, File System Access API is perfectly supported in modern Chromium/Electron.
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
