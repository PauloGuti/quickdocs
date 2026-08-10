# Guía de despliegue

Esta guía es para quien mantiene el proyecto (tú). Cubre tres cosas
independientes:

1. [Construir el instalador](#construir-el-instalador) (`.dmg`) para repartir la app.
2. [Firma y notarización](#firma-y-notarización-opcional) opcional, para que macOS no muestre avisos.
3. [Migrar el almacenamiento a GCP](#migrar-a-gcp-firestore--google-sign-in) (Firestore + Google Sign-In), y cómo mover esa infraestructura de un proyecto de Google Cloud a otro.

---

## Construir el instalador

Requisitos: macOS, Node 18+ (probado con Node 24), Xcode Command Line Tools
(`xcode-select --install`).

```bash
npm install          # también genera assets/icon.png, build/icon.icns y el bundle de highlight.js
npm run dist:mac      # genera dist/QuickDocs-<version>-universal.dmg y .zip
```

`dist:mac` compila un binario **universal** (Apple Silicon + Intel), así
que el mismo `.dmg` sirve para cualquier Mac. Si solo necesitas tu propia
arquitectura y quieres una build más rápida en desarrollo:

```bash
npx electron-builder --mac --arm64   # o --x64
```

Para probar sin empaquetar (más rápido, iteración local):

```bash
npm start
```

### Windows (beta, no verificada)

```bash
npm run dist:win      # genera dist/QuickDocs Setup <version>.exe (instalador NSIS)
```

El proyecto está preparado a nivel de código (blur nativo vía
`backgroundMaterial` en vez de `vibrancy`, iconos `.ico` generados junto a
los `.icns`, atajo `CommandOrControl+Shift+9` que en Windows se traduce a
Ctrl, `app.setLoginItemSettings` que también funciona ahí) y de
empaquetado (target `nsis` en `package.json` → `build.win`), pero se
construyó y se probó únicamente en macOS — no hay forma de garantizar que
el blur, el tray o el instalador se vean/comporten igual en Windows sin
probarlo ahí. Si lo pruebas, los candidatos más probables a necesitar un
ajuste son el efecto de blur (Windows 11 build 22621+; en versiones
anteriores simplemente no habrá blur, solo un fondo semitransparente) y el
posicionamiento del panel con múltiples monitores con distinto DPI.

### Variables de entorno al construir

`npm install` no requiere ningún `.env` (todo tiene default). Si quieres
que la copia que repartes ya traiga tu configuración (por ejemplo, un
atajo de teclado distinto, o —cuando llegues a la Fase 2— la config
pública de Firebase), copia tu `.env` dentro del propio directorio de
recursos de la build antes de invocar `electron-builder`, o añade una
entrada `extraResources` en `package.json` → `build` apuntando a tu
archivo `.env` de producción. El código ya busca `.env` en
`process.resourcesPath` cuando la app está empaquetada
(ver `src/main/config.js`).

Dos formas de repartir la app entre varios Macs:

- **"Cada quien su .env"** (recomendado si solo la usan tú y poca gente de
  confianza): cada persona clona el repo, corre `npm install`, ajusta su
  `.env` y construye su propio `.dmg`. Cero configuración compartida.
- **"Build única con config horneada"**: tú generas un `.dmg` con tu
  `.env` de producción ya incluido (útil una vez tengas Firebase Auth
  activo, porque la config pública de Firebase no es secreta — ver más
  abajo) y lo repartes ya listo para instalar.

---

## Firma y notarización (opcional)

Sin firmar, macOS mostrará el aviso de Gatekeeper descrito en
[`INSTALL.md`](INSTALL.md#3-primer-arranque-aviso-de-gatekeeper) — molesto
pero no bloquea el uso. Para evitarlo necesitas una cuenta de
[Apple Developer Program](https://developer.apple.com/programs/) (99
USD/año):

1. Crea un **Developer ID Application** certificate en tu cuenta y
   agrégalo a tu llavero (Keychain) de macOS.
2. Añade a tu `.env` (o a variables de entorno del shell antes de
   construir):
   ```bash
   export APPLE_ID="tu-apple-id@ejemplo.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"   # generada en appleid.apple.com
   export APPLE_TEAM_ID="XXXXXXXXXX"
   ```
3. En `package.json` → `build.mac` ya está `"hardenedRuntime": true`.
   Añade `"notarize": true` (electron-builder ≥ 24 notariza
   automáticamente si detecta las variables `APPLE_*` de arriba) y vuelve
   a correr `npm run dist:mac`.

No es necesario para uso personal/entre pocos Macs de confianza — la
instrucción de `xattr -cr` en `INSTALL.md` resuelve lo mismo a mano.

---

## Migrar a GCP (Firestore + Google Sign-In)

Hoy (Fase 1) QuickDocs guarda todo en
`~/Library/Application Support/QuickDocs/library.json`: cero cuentas, cero
red. La app ya está preparada para la Fase 2 sin rediseñar nada:

- `src/main/storage/provider.js` define el contrato que cualquier backend
  debe cumplir. `src/main/storage/local.js` lo implementa hoy.
- `src/main/storage/index.js` elige el backend según `STORAGE_PROVIDER`
  en `.env` — cambiar de `local` a `firestore` es una variable de
  entorno, no una reescritura.
- Lo mismo para autenticación: `src/main/auth/provider.js` es el
  contrato, `src/main/auth/local.js` es el modo "offline" de hoy.

Pasos para activar la Fase 2:

### 1. Prepara el proyecto de GCP

```bash
gcloud projects create mi-proyecto-quickdocs --name="QuickDocs"
gcloud config set project mi-proyecto-quickdocs
gcloud services enable firestore.googleapis.com
```

(O usa un proyecto de GCP que ya tengas — el mismo donde corres tus
comandos de `gcloud`/ADK funciona perfecto.)

### 2. Activa Firebase sobre ese proyecto

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) → **Agregar proyecto** → elige el proyecto de GCP que acabas de crear (Firebase no crea uno nuevo, se "engancha" al existente).
2. **Build → Firestore Database → Crear base de datos** → modo **Nativo** → elige región (ej. `us-central1`).
3. **Build → Authentication → Sign-in method** → habilita **Google**.

### 3. Registra una app web para obtener la config pública

1. En **Configuración del proyecto → Tus apps → Agregar app → Web**.
2. Copia los valores que te da (`apiKey`, `authDomain`, `projectId`,
   `storageBucket`, `messagingSenderId`, `appId`) a tu `.env`:
   ```bash
   FIREBASE_API_KEY=...
   FIREBASE_AUTH_DOMAIN=...
   FIREBASE_PROJECT_ID=...
   FIREBASE_STORAGE_BUCKET=...
   FIREBASE_MESSAGING_SENDER_ID=...
   FIREBASE_APP_ID=...
   ```
   Estos valores **no son secretos** — identifican tu proyecto, no dan
   acceso por sí solos. La seguridad real la dan las reglas de Firestore
   del paso 5 y el login con Google.

### 4. Crea credenciales OAuth para el login desde Electron

Firebase Auth está pensado para apps web (popup/redirect en el navegador),
que no existen igual en una app de escritorio. El patrón estándar para
Electron es el **flujo loopback**:

1. En [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials), crea un **OAuth 2.0 Client ID** de tipo **App de escritorio (Desktop app)**.
2. Copia `Client ID` y `Client secret` a tu `.env`:
   ```bash
   GOOGLE_OAUTH_CLIENT_ID=...
   GOOGLE_OAUTH_CLIENT_SECRET=...
   ```
3. Implementación (pendiente, ver `src/main/auth/provider.js` para el
   contrato a cumplir en `src/main/auth/google.js`):
   - El proceso principal levanta un servidor HTTP temporal en
     `http://127.0.0.1:<puerto libre>`.
   - Abre el navegador del sistema (`shell.openExternal`) contra la URL
     de consentimiento de Google, con `redirect_uri` apuntando a ese
     servidor local.
   - El usuario inicia sesión en su navegador de siempre (más seguro y
     familiar que una webview embebida).
   - Google redirige al servidor local con un `code`; lo intercambias por
     tokens con la librería `google-auth-library`.
   - Con el `id_token` obtenido, construyes una credencial de Firebase
     (`GoogleAuthProvider.credential(idToken)`) y llamas
     `signInWithCredential` del SDK cliente de Firebase Auth para dejar al
     usuario autenticado también en Firestore.
   - Cierra el servidor local y la ventana queda con el usuario en sesión.

### 5. Reglas de seguridad de Firestore

Cada usuario solo debe poder leer/escribir su propia documentación.
Estructura sugerida: `users/{uid}/categories/{categoryId}` (subcolecciones
para topics/snippets, o documentos anidados si prefieres menos lecturas).

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Despliega las reglas con la Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### 6. Implementa el backend de Firestore

Crea `src/main/storage/firestore.js` implementando el mismo contrato que
`src/main/storage/local.js` (`init`, `getLibrary`, `addCategory`,
`addTopic`, `addSnippet`, `updateSnippet`, `deleteSnippet`, `getSettings`,
`setSettings`), usando el SDK cliente de Firebase (`firebase/firestore`)
con la sesión del usuario ya autenticado. Actívalo con:

```bash
STORAGE_PROVIDER=firestore
```

y descomenta el `require` correspondiente en `src/main/storage/index.js`.

### 7. Migrar de un proyecto de GCP a otro

Ese es justo el motivo por el que nada está hardcodeado: para mover
QuickDocs a otro proyecto de Google Cloud (por ejemplo, pasar de un
proyecto personal a uno de empresa):

1. Repite los pasos 1–5 en el proyecto nuevo.
2. Reemplaza los seis valores `FIREBASE_*` y `GCP_PROJECT_ID` en tu `.env`
   por los del proyecto nuevo (y el `GOOGLE_OAUTH_CLIENT_ID`/`SECRET` si
   generaste uno distinto).
3. Si quieres llevarte los datos existentes:
   ```bash
   gcloud firestore export gs://bucket-proyecto-viejo/backup --project=proyecto-viejo
   gcloud firestore import gs://bucket-proyecto-viejo/backup --project=proyecto-nuevo
   ```
   (requiere que el bucket sea legible desde el proyecto nuevo, o copiarlo
   primero con `gsutil cp -r` / `gcloud storage cp -r`).
4. Reconstruye la app (`npm run dist:mac`) y redistribuye — nadie tuvo que
   tocar una sola línea de código.

---

## Resumen de variables de entorno

Ver [`.env.example`](../.env.example) para la lista completa comentada.
Las más relevantes para producción/despliegue:

| Variable | Para qué | Obligatoria |
|---|---|---|
| `GLOBAL_SHORTCUT` | Atajo para abrir/cerrar el panel | No (default `⌘⇧9`) |
| `STORAGE_PROVIDER` | `local` o `firestore` | No (default `local`) |
| `FIREBASE_*` | Config pública del proyecto Firebase | Solo si `STORAGE_PROVIDER=firestore` |
| `GOOGLE_OAUTH_CLIENT_ID` / `SECRET` | Login con Google desde Electron | Solo si usas login con Google |
| `GCP_PROJECT_ID` | Referencia del proyecto activo (scripts de `gcloud`, exports) | Recomendada en Fase 2 |
