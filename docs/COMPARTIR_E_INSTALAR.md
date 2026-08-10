# Manual: compilar, compartir e instalar QuickDocs

Guía corta y práctica para el flujo completo. Si necesitas más detalle en
algún paso puntual, están [`INSTALL.md`](INSTALL.md) (solo instalación) y
[`DEPLOY.md`](DEPLOY.md) (build avanzado, firma, migración a GCP).

## El flujo en una frase

**Vos compilás → compartís un archivo o el repo → la otra persona instala.**
No hace falta ningún servidor ni cuenta en la nube para nada de esto — todo
sucede en tu Mac y en la del destinatario.

---

## Paso 1 — Compilar el instalador

### Para Mac (local, en tu propia máquina)

Requisitos: tener el proyecto en tu máquina, Node 18+ instalado, y haber
corrido `npm install` al menos una vez.

```bash
cd command_tools          # la carpeta del proyecto
npm run dist:mac
```

Tarda uno o dos minutos. Cuando termina, el instalador queda en:

```
dist/QuickDocs-<versión>-universal.dmg
```

Es "universal": el mismo archivo sirve tanto para Mac con Apple Silicon
(M1/M2/M3/M4) como para Mac con Intel.

> ¿Cambiaste algo del código o de la documentación semilla (los archivos
> en `data/`) desde el último `.dmg` que generaste? Volvé a correr
> `npm run dist:mac` — no se actualiza solo.

### Para Windows (`.exe`) — vía GitHub Actions, no local

Compilar el instalador de Windows **desde un Mac Apple Silicon no
funciona directamente** (la herramienta que arma el `.exe`, `makensis`, es
un binario Intel y necesitaría Rosetta 2). En vez de pelear con eso, el
repo ya tiene un workflow que lo compila en un Windows real de GitHub:

1. Andá a **github.com/PauloGuti/quickdocs → Actions → Build** (en el menú
   de la izquierda).
2. Clic en **Run workflow** (botón a la derecha, rama `main`) → **Run workflow**.
3. Esperá ~2-3 minutos a que termine (círculo verde ✓).
4. Entrá a esa ejecución → abajo, en **Artifacts**, vas a ver
   `quickdocs-windows` (el `.exe`) y `quickdocs-mac` (el `.dmg`, compilado
   ahí mismo de yapa). Descargá el que necesites — viene en un `.zip`, dentro
   está el instalador real.

También se puede disparar desde la terminal, sin entrar a la web:

```bash
gh workflow run build.yml
gh run watch          # sigue el progreso en vivo
gh run download       # descarga los artefactos cuando termina
```

**Publicar una versión con link directo (opcional):** si en vez de bajar
el artefacto manualmente querés un link permanente para mandar (tipo
`github.com/.../releases/download/...`), creá un tag de versión y el mismo
workflow arma un **Release** con el `.dmg` y el `.exe` adjuntos:

```bash
git tag v0.1.0
git push origin v0.1.0
```

---

## Paso 2 — Compartir

Dos formas, según qué necesita la otra persona:

### A) Solo quiere *usar* la app (lo más común)

Mandale el archivo `.dmg` (Mac) o `.exe` (Windows) que descargaste en el
Paso 1, por AirDrop, Google Drive, Slack, un pendrive, lo que sea. No
necesita Node, ni git, ni saber programar — solo lo instala como cualquier
app (ver Paso 3).

### B) Quiere el código (para editarlo, sumar comandos al repo, o seguir
### trabajando en el proyecto)

Compartí el repositorio de GitHub. Si es privado, primero agregalo como
colaborador:

```bash
gh repo add-collaborator PauloGuti/quickdocs <usuario-de-github-de-la-persona>
```

(o desde la web: github.com/PauloGuti/quickdocs → **Settings** → **Collaborators**)

Esa persona después hace:

```bash
git clone git@github.com:PauloGuti/quickdocs.git
cd quickdocs
npm install
cp .env.example .env
npm start
```

Y ya tiene la app corriendo desde el código fuente — sin necesidad de
generar un `.dmg`.

---

## Paso 3 — Instalar

### En Mac (recibe el `.dmg`)

1. Doble clic en el `.dmg` para montarlo.
2. Arrastrar el icono de **QuickDocs** a la carpeta **Aplicaciones**.
3. Expulsar el `.dmg` (ya se puede borrar).
4. **Primera vez**: macOS va a avisar que es de "un desarrollador no
   identificado" (la app no está firmada con una cuenta de Apple
   Developer). Es normal, pasa una sola vez:
   - Ir a **Aplicaciones**, clic derecho sobre QuickDocs → **Abrir** →
     confirmar **Abrir** en el diálogo.
   - Si igual la bloquea, una vez en Terminal:
     ```bash
     xattr -cr /Applications/QuickDocs.app
     ```
5. Listo. QuickDocs **no aparece en el Dock** — vive en la barra de menú
   (arriba a la derecha, icono `>_`). El atajo por defecto es **⌘ ⇧ 9**.

### En Windows (recibe el `.exe`) — beta, no verificada por mí

1. Doble clic en `QuickDocs Setup <versión>.exe`.
2. El instalador (NSIS) deja elegir carpeta de instalación y crea accesos
   directos en el Escritorio y el menú Inicio.
3. **Primera vez**: como el `.exe` tampoco está firmado con un certificado
   de código, Windows SmartScreen probablemente avise "Windows protegió tu
   PC". Es el equivalente al aviso de Gatekeeper en Mac:
   - Clic en **Más información** → **Ejecutar de todas formas**.
4. QuickDocs queda en la bandeja del sistema (system tray, abajo a la
   derecha, junto al reloj). El atajo por defecto sigue siendo **Ctrl ⇧ 9**
   (en Windows, `CommandOrControl` del atajo se traduce a Ctrl).

> Esta parte de Windows nunca la probé en una máquina Windows real —
> avisame si algo no se ve o no se comporta como debería (el efecto de
> blur del panel, sobre todo, depende de la versión de Windows).

### Cambiar el atajo de apertura

Ya no hace falta tocar ningún archivo: **Configuración (•••) → Atajo
global** → clic en el botón → presionar la combinación que quieras
(con ⌘, Ctrl o ⌥) → se guarda sola. Si la combinación ya la usa otra app,
QuickDocs avisa y no toca la que ya tenías funcionando.

---

## Actualizar una instalación existente

Cuando agregues comandos nuevos o cambies algo del código:

1. Recompilá: `npm run dist:mac` (Mac, local) y/o disparás el workflow de
   GitHub Actions de nuevo (Windows, o Mac también si preferís no usar tu
   máquina).
2. Mandás el instalador nuevo igual que la primera vez.
3. La persona repite el Paso 3 — instalar encima **reemplaza** la versión
   vieja. Sus comandos agregados a mano (categorías/temas propios) **no se
   pierden**: viven fuera de la app (en Mac:
   `~/Library/Application Support/QuickDocs/`; en Windows:
   `%APPDATA%\QuickDocs\`), y solo se le suma lo nuevo (ver "documentación
   semilla" en el `README.md`).

---

## Desinstalar

1. Icono de la barra de menú → **Salir de QuickDocs**.
2. Borrar `/Applications/QuickDocs.app`.
3. (Opcional) Borrar los datos guardados: `~/Library/Application Support/QuickDocs/`.

---

## Problemas comunes

**"QuickDocs está dañado y no se puede abrir"** — Gatekeeper por no estar
firmada. Solución: el paso 4 de arriba (`xattr -cr`) o firmar la app con
una cuenta de Apple Developer (ver `DEPLOY.md` → *Firma y notarización*).

**El atajo que grabé no se guardó / dice "ocupado por otra app"** —
alguna otra app (o el propio macOS) ya usa esa combinación. Probá otra;
QuickDocs no te deja quedarte sin atajo funcionando.

**Le mandé el `.dmg` a alguien con un Mac más viejo y no abre** — QuickDocs
necesita macOS relativamente reciente (Electron 43 requiere macOS 11+
aprox.). Si es un Mac muy antiguo, avisame y ajustamos la versión de
Electron.
