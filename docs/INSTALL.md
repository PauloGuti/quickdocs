# Guía de instalación (usuario final)

Esta guía es para instalar QuickDocs como una app normal de Mac, ya sea en
tu propio equipo o en otro Macbook.

## 1. Consigue el instalador (`.dmg`)

Alguien con el proyecto debe generarlo una vez (ver
[`DEPLOY.md`](DEPLOY.md#construir-el-instalador)):

```bash
npm run dist:mac
```

Esto deja un archivo como `dist/QuickDocs-0.1.0-universal.dmg`. Cópialo al
Mac donde quieras instalar QuickDocs (AirDrop, USB, Drive, lo que sea).

## 2. Instalar

1. Haz doble clic en el `.dmg` para montarlo.
2. Arrastra el icono **QuickDocs** a la carpeta **Aplicaciones**.
3. Expulsa el `.dmg` (icono de expulsar en Finder) y puedes borrarlo.

## 3. Primer arranque (aviso de Gatekeeper)

Como esta app aún no está firmada con un certificado de Apple Developer,
macOS mostrará un aviso de "app dañada" o "de un desarrollador no
identificado" la primera vez. Es normal y solo pasa una vez:

1. Ve a **Aplicaciones**, haz **clic derecho** sobre QuickDocs → **Abrir**.
2. En el diálogo, confirma **Abrir**.

Si aun así macOS la bloquea, ejecuta esto una sola vez en Terminal
(le dice a macOS que confías en este archivo concreto):

```bash
xattr -cr /Applications/QuickDocs.app
```

> Si más adelante quieres evitar este paso para otros usuarios, ver
> [`DEPLOY.md`](DEPLOY.md#firma-y-notarización-opcional) sobre firma y
> notarización con una cuenta de Apple Developer.

## 4. Usarla

- QuickDocs **no aparece en el Dock**: vive en la barra de menú (arriba a
  la derecha, junto al reloj), como Spotlight o Raycast.
- Atajo por defecto: **⌘ ⇧ 9** — abre/cierra el panel donde esté tu cursor.
- Escribe en la barra de búsqueda para filtrar por cualquier comando,
  descripción o categoría.
- Haz clic en una categoría → un tema → verás la lista de comandos con su
  descripción y el código, ya coloreado.
- Botón **Copiar** en cada tarjeta para llevarlo directo al portapapeles.
- Botón **•••** (arriba a la derecha del panel):
  - **Agregar documentación** — suma tus propios comandos.
  - **Configuración** — tema claro/oscuro/sistema, color de acento, inicio
    automático con el sistema.
- Para **salir completamente**: icono de la barra de menú → **Salir de
  QuickDocs**. Cerrar el panel (Esc o clic afuera) solo lo oculta, no
  cierra la app — así el atajo global sigue funcionando.

## 5. ¿Cambiar el atajo de teclado?

Desde la propia app: **Configuración (•••) → Atajo global** → clic en el
botón → presiona la combinación que quieras (debe incluir ⌘, Ctrl o ⌥).
Se guarda al instante, sin reiniciar la app. Si la combinación ya la usa
otra app del sistema, QuickDocs avisa y mantiene la anterior funcionando.

El valor con el que arranca por primera vez una copia recién instalada
sale de `GLOBAL_SHORTCUT` en el `.env` con el que se construyó (ver
[`.env.example`](../.env.example)) — pero una vez que el usuario lo
cambia desde Configuración, esa elección manda y queda guardada en su Mac.

## 6. Desinstalar

1. Icono de la barra de menú → **Salir de QuickDocs**.
2. Borra `/Applications/QuickDocs.app`.
3. (Opcional) Borra tus datos guardados:
   `~/Library/Application Support/QuickDocs/`.
