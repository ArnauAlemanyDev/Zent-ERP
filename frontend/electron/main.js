const { app, BrowserWindow, shell, ipcMain, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { isTrustedDocument, externalUrl, isTrustedSender, allowPermission } = require('./securityPolicy');

const isDev = !app.isPackaged;
const entryFile = path.join(__dirname, '../dist/index.html');
const entry = isDev ? 'http://localhost:5180/' : pathToFileURL(entryFile).href;
const trustedContents = new Set();

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Zent ERP',
    autoHideMenuBar: true,
    backgroundColor: '#0c111b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
    icon: isDev
      ? path.join(__dirname, '../public/icon.png')
      : path.join(__dirname, '../dist/icon.png'),
  });

  const contents = win.webContents;
  trustedContents.add(contents);
  contents.once('destroyed', () => trustedContents.delete(contents));
  const restrictNavigation = (event, legacyUrl) => {
    if (!isTrustedDocument(event.url || legacyUrl, entry)) event.preventDefault();
  };
  contents.on('will-navigate', restrictNavigation);
  contents.on('will-redirect', restrictNavigation);
  contents.on('will-attach-webview', event => event.preventDefault());
  contents.setWindowOpenHandler(({ url }) => {
    const allowed = isTrustedDocument(contents.getURL(), entry) && externalUrl(url);
    if (allowed) shell.openExternal(allowed).catch(() => console.warn('[ZENT] External link could not be opened'));
    return { action: 'deny' };
  });

  if (isDev) win.loadURL(entry);
  else win.loadFile(entryFile);
}

function withTrustedWindow(event, action) {
  if (!trustedContents.has(event.sender) || !isTrustedSender(event, event.sender, entry)) return;
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) action(win);
}

ipcMain.on('window-minimize', event => withTrustedWindow(event, win => win.minimize()));
ipcMain.on('window-close', event => withTrustedWindow(event, win => win.close()));
ipcMain.on('window-maximize', event => withTrustedWindow(event, win => win.isMaximized() ? win.unmaximize() : win.maximize()));

app.whenReady().then(() => {
  const ses = session.defaultSession;
  const permitted = (contents, permission, details) => trustedContents.has(contents) && allowPermission(contents, permission, details, entry);
  ses.setPermissionCheckHandler((contents, permission, _origin, details) => permitted(contents, permission, details));
  ses.setPermissionRequestHandler((contents, permission, callback, details) => callback(permitted(contents, permission, details)));
  ses.setDevicePermissionHandler(() => false);
  ses.setDisplayMediaRequestHandler((_request, callback) => callback({}));
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
