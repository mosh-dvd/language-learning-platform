const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let backendProcess = null;

function createWindow() {
  // Check if icon exists
  const iconPath = path.join(__dirname, '../frontend/public/icon.png');
  const hasIcon = fs.existsSync(iconPath);

  const windowOptions = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Language Learning Platform',
    backgroundColor: '#f9fafb',
    show: false // Don't show until backend is ready
  };

  // Only add icon if it exists
  if (hasIcon) {
    windowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    // Development mode - load from Vite dev server
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode - load from built files
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('Starting backend server...');
    
    const backendPath = isDev 
      ? path.join(__dirname, '../backend')
      : path.join(process.resourcesPath, 'app.asar.unpacked/backend');
    
    const scriptPath = path.join(backendPath, 'src/index.ts');
    const tsxPath = isDev
      ? path.join(__dirname, '../backend/node_modules/tsx/dist/cli.mjs')
      : path.join(backendPath, 'node_modules/tsx/dist/cli.mjs');
    
    const nodePath = process.execPath;
    const args = [tsxPath, scriptPath];

    console.log('Backend path:', backendPath);
    console.log('Script path:', scriptPath);
    console.log('TSX path:', tsxPath);
    console.log('Node path:', nodePath);
    
    backendProcess = spawn(nodePath, args, {
      cwd: backendPath,
      env: {
        ...process.env,
        NODE_ENV: isDev ? 'development' : 'production',
        PORT: '3000'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
      if (data.toString().includes('Server running on port')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      reject(error);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      backendProcess = null;
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (backendProcess) {
        resolve(); // Continue anyway
      }
    }, 10000);
  });
}

function stopBackend() {
  if (backendProcess) {
    console.log('Stopping backend server...');
    backendProcess.kill();
    backendProcess = null;
  }
}

app.whenReady().then(async () => {
  // In production, don't auto-start backend - user needs to configure it first
  // Just create the window
  createWindow();

  // Only handle activate on macOS - prevents infinite window creation on Linux
  if (process.platform === 'darwin') {
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  }
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

// Handle app errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
