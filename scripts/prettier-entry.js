// Entrada para el bundle de Prettier del renderer (formateo con ⌘S al
// editar un snippet). Solo se incluyen los plugins de los lenguajes que
// soporta el formulario de "Agregar documentación": JS/TS, JSON, YAML.
// bash/python/texto no tienen formateador aquí — Prettier no los soporta
// de forma nativa (ver app.js, PRETTIER_PARSER_BY_LANGUAGE).
import * as prettier from 'prettier/standalone';
import babelPlugin from 'prettier/plugins/babel';
import estreePlugin from 'prettier/plugins/estree';
import typescriptPlugin from 'prettier/plugins/typescript';
import yamlPlugin from 'prettier/plugins/yaml';

window.prettierStandalone = prettier;
window.prettierPlugins = {
  babel: babelPlugin,
  estree: estreePlugin,
  typescript: typescriptPlugin,
  yaml: yamlPlugin,
};
