const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const fs = require('fs');

let mainWindow;
let adBlockEnabled = true;
let httpsOnlyEnabled = true;

const adBlockFilters = [
  '*://*.doubleclick.net/*',
  '*://*.googlesyndication.com/*',
  '*://*.google-analytics.com/*',
  '*://*.adnxs.com/*',
  '*://*.facebook.com/tr/*',
  '*://*.scorecardresearch.com/*',
  '*://*.taboola.com/*',
  '*://*.outbrain.com/*'
];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 840,
    title: "FlashGo 2.0",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });

  // Ad & Tracker Blocker + HTTPS-Only Shield
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    const url = details.url;

    if (adBlockEnabled) {
      const isAd = adBlockFilters.some(pattern => {
        const domain = pattern.replace('*://*.', '').replace('/*', '');
        return url.includes(domain);
      });
      if (isAd) return callback({ cancel: true });
    }

    if (httpsOnlyEnabled && url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      return callback({ redirectURL: url.replace('http://', 'https://') });
    }

    callback({});
  });

  mainWindow.loadFile('index.html');
}

// Privacy Toggles
ipcMain.on('toggle-adblock', (e, state) => { adBlockEnabled = state; });
ipcMain.on('toggle-https', (e, state) => { httpsOnlyEnabled = state; });

// Fire Button: Burn All Cookies, Cache & Storage
ipcMain.handle('burn-data', async () => {
  await session.defaultSession.clearStorageData();
  await session.defaultSession.clearCache();
  return true;
});

// Capture Screenshot
ipcMain.handle('capture-screen', async () => {
  const image = await mainWindow.webContents.capturePage();
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Screenshot',
    defaultPath: `FlashGo-Capture-${Date.now()}.png`,
    filters: [{ name: 'PNG Image', extensions: ['png'] }]
  });
  if (filePath) {
    fs.writeFileSync(filePath, image.toPNG());
    return filePath;
  }
  return null;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
