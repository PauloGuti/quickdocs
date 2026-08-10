# QuickDocs

Panel flotante y transparente de comandos y documentación, para macOS (y,
de forma experimental, Windows). Pensado para tenerlo siempre a un atajo
de distancia mientras programas: `⌘ ⇧ 9` lo abre en la esquina superior
derecha, escribes lo que buscas, y listo — sin abrir el navegador, sin
perder el hilo. Se queda abierto hasta que tú lo cierres (no desaparece
al cambiar de ventana).

<p align="center"><em>Estilo widget de Apple: minimalista, con blur nativo,
texto grande y una sola columna de navegación (categoría → tema →
comandos) para no abrumar.</em></p>

## Qué incluye de fábrica

- **Python** — iniciar proyecto, instalar librerías, librerías recomendadas,
  imports, tipos de datos, ciclos, funciones, manejo de errores. Con selector
  de gestor de paquetes (**pip+venv / uv / Poetry**) que cambia los comandos
  mostrados a la sintaxis de cada uno.
- **JavaScript & React** — pnpm (proyecto, dependencias, monorepos), crear
  apps con Vite/Next.js, componentes y hooks de React.
- **Google ADK** (Agent Development Kit) — instalación, crear agentes,
  ejecutar, multi-agente, despliegue.
- **Desarrollo de Agentes** — guía conceptual (framework-agnóstica): estructura
  de carpetas para multi-agente, plantillas de system prompts, definición de
  skills/tools, memoria y contexto, patrones de orquestación multi-agente.
- **GitHub** — git básico, ramas, pull requests/issues con `gh`, deshacer cambios.
- **Google Cloud (gcloud)** — configuración, Cloud Run, Storage, IAM, Firestore.
- **BigQuery** — SQL básico/intermedio/avanzado (window functions, CTEs, MERGE),
  CLI `bq`, datasets/tablas/vistas, optimización de costos, **BigQuery ML**
  (regresión, clasificación, k-means, forecasting) e IA generativa desde SQL.
- **Docker** — imágenes, contenedores, Docker Compose, volúmenes y redes.
- **Terraform** — comandos básicos, estructura de proyecto, variables/outputs, state y módulos.
- **Go** — iniciar proyecto, comandos básicos, dependencias, tipos y sintaxis.
- **macOS** — portapapeles, Finder, Homebrew, utilidades del sistema.
- **Linux / Terminal** — archivos, permisos, texto/búsqueda, procesos y red (POSIX).
- **Seguridad** — reconocimiento de red, inspección del sistema, tráfico y
  certificados, integridad y claves. Pensado para auditar/administrar tus
  propios equipos o pentesting autorizado — no incluye nada destructivo.

Todo editable, exportable e importable desde la propia app (botón **•••**).

## Gestionar tu documentación

- **Agregar**: ••• → *Agregar documentación*. Puedes crear una categoría
  nueva con su propio emoji, o sumar a una existente. Con **⌘S** dentro del
  campo de código formateas con Prettier (JS/TS/JSON/YAML — bash y Python
  no tienen formateador automático todavía).
- **Editar / eliminar un comando**: botones directamente en su tarjeta.
- **Eliminar una categoría o un tema completo**: botón 🗑 en su fila (lista
  de categorías/temas), o desde Configuración → *Gestionar documentación*.
- **Reordenar arrastrando**: agarra el icono ⠿ de cualquier categoría, tema
  o comando y arrástralo a la posición que quieras (por ejemplo, BigQuery
  arriba de Python). El orden se guarda solo.
- **Exportar / importar**: ••• → *Exportar* genera un `.json` que puedes
  mandarle a un compañero de equipo; con *Importar* él lo suma a su propia
  librería (nunca sobrescribe lo que ya tiene, solo agrega lo nuevo).

## Cómo funciona

- Vive en la **barra de menú** (no en el Dock), corre en segundo plano y se
  invoca con un atajo global configurable. El panel permanece abierto hasta
  que lo cierras con el atajo, `Esc`, o el botón ✕ del panel.
- Fase actual: **almacenamiento 100% local** (un archivo JSON en tu Mac,
  nada sale de tu equipo). Pensado para migrar a Firestore/GCP más adelante
  sin tocar la interfaz — ver [`docs/DEPLOY.md`](docs/DEPLOY.md).
- Nada de valores hardcodeados: todo lo configurable vive en `.env`
  (ver [`.env.example`](.env.example)).
- **Windows**: el proyecto está preparado para empaquetarse ahí también
  (`npm run dist:win`, instalador NSIS), pero se construyó y probó en
  macOS — considera el soporte de Windows como beta no verificada.

## Empezar en local (modo desarrollo)

```bash
npm install        # instala dependencias y genera iconos + bundle de sintaxis
cp .env.example .env
npm start
```

**Manual rápido para compilar, compartir e instalar** (el flujo completo en
un solo lugar): [`docs/COMPARTIR_E_INSTALAR.md`](docs/COMPARTIR_E_INSTALAR.md).
Guías más detalladas: [`docs/INSTALL.md`](docs/INSTALL.md) (solo
instalación) y [`docs/DEPLOY.md`](docs/DEPLOY.md) (build avanzado, firma,
migración a GCP/Firestore).

## Estructura del proyecto

```
src/
  main/            proceso principal de Electron
    storage/        capa de almacenamiento (local hoy, Firestore mañana)
    auth/            capa de autenticación (offline hoy, Google mañana)
    main.js, window.js, tray.js, ipc.js, config.js
  preload/          puente seguro entre main y renderer (contextBridge)
  renderer/         interfaz (HTML/CSS/JS vanilla, sin framework)
data/               documentación semilla (Python, JS/React, ADK, GitHub, gcloud, macOS, Linux, Seguridad) en JSON
scripts/            generación de iconos y del bundle de resaltado de sintaxis
docs/               guías de instalación y despliegue
```

## Stack técnico

- [Electron](https://www.electronjs.org/) + `electron-builder` (`.dmg`/`.zip` para macOS, NSIS `.exe` para Windows)
- Vanilla JS/HTML/CSS en el renderer (panel pequeño, no necesita un framework)
- [highlight.js](https://highlightjs.org/) para el resaltado de sintaxis (empaquetado localmente, sin CDN)
- [Prettier](https://prettier.io/) standalone para formatear código con ⌘S (JS/TS/JSON/YAML), también empaquetado localmente
- `dotenv` para configuración por entorno
- Fase 2: Firebase Auth (Google Sign-In) + Firestore, en el mismo proyecto de GCP donde ya usas gcloud/ADK

## Formato de la documentación

Cada categoría es un JSON en `data/` con esta forma:

```json
{
  "id": "python",
  "name": "Python",
  "icon": "🐍",
  "topics": [
    {
      "id": "iniciar-proyecto",
      "name": "Iniciar un proyecto",
      "snippets": [
        {
          "id": "py-venv-crear",
          "title": "Crear entorno virtual",
          "description": "Crea un entorno aislado en la carpeta .venv",
          "language": "bash",
          "code": "python3 -m venv .venv",
          "tags": ["venv", "setup"]
        }
      ]
    }
  ]
}
```

Se eligió JSON (y no Markdown) porque cada snippet necesita campos
estructurados —lenguaje, descripción corta, tags para la búsqueda— que en
Markdown habría que "adivinar" parseando el texto. Estos archivos solo se
usan como semilla la primera vez que abres la app; después, tus cambios
viven en tu carpeta de usuario y estos archivos no se vuelven a tocar.
