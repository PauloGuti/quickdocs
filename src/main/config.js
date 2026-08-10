// Punto único de configuración. Todo lo que sea "ajustable" entra por aquí,
// leído desde variables de entorno (.env en dev, o variables reales del
// sistema/empaquetado en producción). Nada de valores mágicos repartidos
// por el código: si algo cambia entre entornos, vive aquí.

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// En dev cargamos el .env de la raíz del proyecto. En producción, si el
// empaquetador incluyó un .env junto al binario (ver docs/DEPLOY.md), también
// se respeta; si no existe, seguimos con los defaults de abajo.
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '..', '..', '.env');

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const config = {
  appName: process.env.APP_NAME || 'QuickDocs',
  globalShortcut: process.env.GLOBAL_SHORTCUT || 'CommandOrControl+Shift+9',
  defaultAccentColor: process.env.DEFAULT_ACCENT_COLOR || 'blue',
  defaultTheme: process.env.DEFAULT_THEME || 'system',
  defaultStartAtLogin: bool(process.env.DEFAULT_START_AT_LOGIN, true),

  storageProvider: process.env.STORAGE_PROVIDER || 'local',

  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
  },

  google: {
    oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    oauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  },

  gcpProjectId: process.env.GCP_PROJECT_ID || '',
};

module.exports = config;
