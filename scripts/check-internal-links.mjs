#!/usr/bin/env node
// check-internal-links.mjs — Comprobador de enlaces internos, cero
// dependencias (solo stdlib de Node >= 18).
//
// No es parte de TemplateSSDUncleBob: se escribe para esta adopción porque
// ninguna herramienta ya presente en package.json valida los enlaces
// Markdown relativos entre páginas de `src/content/docs/` (Astro/Starlight
// solo validan el *frontmatter* de cada página vía el schema de
// `src/content.config.ts`; un `[texto](../slug-mal-escrito/)` sigue
// compilando sin avisos). Es el equivalente honesto, de bajo coste, para el
// checkpoint "enlaces internos no rotos" (ver CHECKPOINTS.md) — en el mismo
// espíritu que los mutadores caseros y sin dependencias de los ejemplos
// Python/Node de la plantilla (docs/mutation-testing.md).
//
// Uso:  node scripts/check-internal-links.mjs
// Sale 0 si todo enlace relativo/interno resuelve a una página real de
// `src/content/docs/`; sale 1 y lista cada enlace roto (archivo:línea) en
// caso contrario. Los enlaces externos (http(s)://, mailto:, etc.) y los
// anclas puras (#seccion) no se comprueban.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS_DIR = join(ROOT, 'src', 'content', 'docs');
const SITE_BASE = '/DockerSwarmDocs'; // astro.config.mjs -> base

/** Recorre `dir` recursivamente y devuelve la ruta absoluta de cada .md/.mdx. */
function collectDocFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectDocFiles(full));
    } else if (entry.isFile() && ['.md', '.mdx'].includes(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/** Slug de colección de contenido de Astro: ruta relativa a DOCS_DIR, en
 * POSIX, sin extensión; `index` (o `algo/index`) apunta a su carpeta padre
 * (el índice raíz -> slug "", la portada del sitio). */
function toSlug(absPath) {
  const rel = relative(DOCS_DIR, absPath).split(/\\/g).join('/');
  const noExt = rel.replace(/\.mdx?$/, '');
  if (noExt === 'index') return '';
  if (noExt.endsWith('/index')) return noExt.slice(0, -'/index'.length);
  return noExt;
}

/** Quita los bloques de código delimitados por ``` para que un
 * `](...)` de ejemplo dentro de un bloque de comandos nunca cuente como
 * enlace real. Comprobación por línea, deliberadamente simple (no es un
 * parser Markdown completo: es barata y suficiente para este repo). */
function extractLinks(markdown) {
  const links = [];
  let inFence = false;
  markdown.split('\n').forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    for (const match of line.matchAll(/\]\(([^)]+)\)/g)) {
      links.push({ target: match[1].trim(), line: i + 1 });
    }
  });
  return links;
}

/** Externo o no comprobable con este script: esquema explícito
 * (http:, https:, mailto:, tel:...), protocolo-relativo (//host/...) o
 * ancla pura (#seccion). */
function isExternal(target) {
  return /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target);
}

/** Resuelve `target` (enlace relativo o absoluto-de-sitio) contra el slug
 * de la página que lo contiene, usando el algoritmo estándar de resolución
 * de URLs (WHATWG URL, vía el global `URL` de Node) para que `./` y `../`
 * se comporten exactamente igual que en el navegador. Devuelve `null` si es
 * un enlace a un asset (último segmento con extensión, p. ej. `.png`) o una
 * ancla pura en la misma página — ninguno de los dos es un slug de
 * colección de contenido. */
function resolveInternalSlug(sourceSlug, target) {
  const [pathPart] = target.split('#');
  if (pathPart === '') return null;

  const basePath = sourceSlug ? `${sourceSlug}/` : '';
  const base = new URL(`https://internal.invalid/${basePath}`);
  const resolved = new URL(pathPart, base).pathname;
  const withoutBase = resolved.startsWith(`${SITE_BASE}/`)
    ? resolved.slice(SITE_BASE.length)
    : resolved;
  const slug = withoutBase.replace(/^\/|\/$/g, '');

  const lastSegment = slug.split('/').pop() ?? '';
  if (lastSegment.includes('.')) return null; // enlace a un asset, no a una página

  return slug;
}

function main() {
  const files = collectDocFiles(DOCS_DIR);
  const slugs = new Set(files.map(toSlug));
  const problems = [];

  for (const file of files) {
    const sourceSlug = toSlug(file);
    const raw = readFileSync(file, 'utf8');
    for (const { target, line } of extractLinks(raw)) {
      if (isExternal(target)) continue;
      const slug = resolveInternalSlug(sourceSlug, target);
      if (slug === null) continue;
      if (!slugs.has(slug)) {
        problems.push(
          `${relative(ROOT, file)}:${line}  enlace roto "${target}" -> no existe ninguna página con slug "${slug}"`
        );
      }
    }
  }

  if (problems.length > 0) {
    console.error(`check-internal-links: ${problems.length} enlace(s) interno(s) roto(s):\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exitCode = 1;
    return;
  }

  console.log(`check-internal-links: OK (${files.length} páginas, 0 enlaces internos rotos).`);
}

if (!statSync(DOCS_DIR, { throwIfNoEntry: false })) {
  console.error(`check-internal-links: no existe ${DOCS_DIR}`);
  process.exitCode = 1;
} else {
  main();
}
