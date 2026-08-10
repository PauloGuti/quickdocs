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
(M1/M2/M3/M4) como para Mac con Intel — no necesitas preguntar qué chip
tiene la persona a la que se lo mandas.

> ¿Cambiaste algo del código o de la documentación semilla (los archivos
> en `data/`) desde el último `.dmg` que generaste? Volvé a correr
> `npm run dist:mac` — no se actualiza solo.

---

## Paso 2 — Compartir

Dos formas, según qué necesita la otra persona:

### A) Solo quiere *usar* la app (lo más común)

Mandale el archivo `.dmg` de `dist/` por AirDrop, Google Drive, Slack, un
pendrive, lo que sea. Pesa ~200 MB. No necesita Node, ni git, ni saber
programar — solo lo instala como cualquier app de Mac (ver Paso 3).

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

## Paso 3 — Instalar (para quien recibe el `.dmg`)

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

### Cambiar el atajo de apertura

Ya no hace falta tocar ningún archivo: **Configuración (•••) → Atajo
global** → clic en el botón → presionar la combinación que quieras
(con ⌘, Ctrl o ⌥) → se guarda sola. Si la combinación ya la usa otra app,
QuickDocs avisa y no toca la que ya tenías funcionando.

---

## Actualizar una instalación existente

Cuando agregues comandos nuevos o cambies algo del código:

1. `npm run dist:mac` de nuevo (genera un `.dmg` con el contenido actualizado).
2. Mandás el `.dmg` nuevo igual que la primera vez.
3. La persona repite el Paso 3 — arrastrar a Aplicaciones **reemplaza** la
   versión vieja. Sus comandos agregados a mano (categorías/temas propios)
   **no se pierden**: viven en `~/Library/Application Support/QuickDocs/`,
   separado de la app en sí, y solo se le suma lo nuevo (ver
   "documentación semilla" en el `README.md`).

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
