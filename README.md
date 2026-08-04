# DockerSwarmDocs

Sitio de documentación de la infraestructura Docker Swarm de producción de
`apptolast`. Construido con [Starlight](https://starlight.astro.build/)
(framework [Astro](https://astro.build/)).

## Qué es este repo

Este repositorio no es la fuente de verdad de la infraestructura: esa sigue
siendo, siempre,
[`apptolast/DockerSwarmInfrastrcture`](https://github.com/apptolast/DockerSwarmInfrastrcture)
(Terraform + Ansible + docs Markdown para el VPS Netcup `159.195.156.57`,
un clúster Docker Swarm de un solo nodo).

`DockerSwarmDocs` es una capa de documentación **navegable** sobre esa
fuente de verdad: páginas Markdown bajo
[`src/content/docs/`](src/content/docs/), cada una con un frontmatter YAML
citable (`title`, `type`, `owner`, `source-of-truth`, `last-verified`,
`tags`, `status`, `superseded-by`, y las listas de relaciones
`depends-on`/`used-by`/`related-runbooks`/`related-dashboards`/
`related-alerts`/`see-also`), validado en build por el schema de
`src/content.config.ts`.

## Estado actual: sembrado a mano, mantenido por bot desde el 2026-07-30

Esta primera versión del sitio se sembró de forma **manual**: cada página
se escribió y verificó a mano contra el contenido real de
`apptolast/DockerSwarmInfrastrcture` (README.md, CLAUDE.md, CHANGELOG.md,
`docs/*.md`, `.claude/agents/*.md`) en el commit
[`854e160a`](https://github.com/apptolast/DockerSwarmInfrastrcture/commit/854e160a5fa1b369f1755083f1242b50966b19b0).
Si un dato no se pudo verificar contra ese repo, la página correspondiente
lo dice explícitamente en vez de rellenarlo con contenido inventado.

Desde el 2026-07-30, el bot **`apptolast/DockerSwarmMemoria`** mantiene el
sitio vivo de verdad: lee los cambios de `DockerSwarmInfrastrcture` y abre
Pull Requests aquí, siempre en modo borrador y siempre fusionadas por una
persona, nunca automáticamente. Dos rondas de esas propuestas ya se han
fusionado:
[`#4`](https://github.com/apptolast/DockerSwarmDocs/pull/4) (2026-07-30) y
[`#10`](https://github.com/apptolast/DockerSwarmDocs/pull/10) (2026-08-03,
que además añadió la página `observabilidad-backup.md`).

## Compatibilidad con el futuro RAG central

El frontmatter de cada página de `src/content/docs/` sigue, campo a campo, la plantilla
obligatoria de
[`apptolast/sistema-central-admin-servidor`](https://github.com/apptolast/sistema-central-admin-servidor)
(`docs/_template.md`), que gobierna el "segundo cerebro" RAG que esa
plataforma (hoy centrada en el clúster Kubernetes de Hetzner, Fase 0) está
construyendo para toda la infraestructura de `apptolast`. La intención
explícita es que, si ese RAG central se extiende algún día a cubrir también
este servidor Swarm, pueda ingerir el contenido de `src/content/docs/` de
este repo sin necesidad de reescribirlo.

Esto implica, en particular:

- Toda página factual bajo `src/content/docs/` lleva el frontmatter obligatorio completo
  (ver arriba), incluyendo un `source-of-truth` verificable y una fecha
  `last-verified`.
- Ningún dato factual se inventa: si algo no se pudo confirmar contra
  `DockerSwarmInfrastrcture`, la página lo marca explícitamente como
  pendiente de verificar.
- Los objetos reemplazados no se borran sin más: se marcan `superseded-by`
  (o, dentro del cuerpo de la página, se documenta explícitamente qué fuente
  más reciente sustituye a cuál, como ocurre entre `README.md` y
  `docs/DEPLOYMENT_STATUS.md` de `DockerSwarmInfrastrcture`).

## Disciplina de contribución manual (adopción de TemplateSSDUncleBob)

El bot `apptolast/DockerSwarmMemoria` ya propone contenido a este repositorio
vía Pull Request (dos rondas fusionadas hasta la fecha:
[`#4`](https://github.com/apptolast/DockerSwarmDocs/pull/4) y
[`#10`](https://github.com/apptolast/DockerSwarmDocs/pull/10)), siempre en
modo borrador y siempre fusionado por una persona, nunca automáticamente.
Además de ese bot, este repositorio adopta la disciplina de
[`Cenit-Digital/TemplateSSDUncleBob`](https://github.com/Cenit-Digital/TemplateSSDUncleBob)
(conversación → contrato → redacción → review → verificación) para el
**trabajo manual** sobre `src/content/docs/`: una página nueva o una
reestructuración que no viene ya propuesta por el bot. Ver `CLAUDE.md`,
`AGENTS.md` y `CHECKPOINTS.md` en la raíz del repo, y la página
[Adopción de TemplateSSDUncleBob](src/content/docs/adopcion-templatessd.md)
para el detalle completo de cómo convive con el bot sin duplicarlo ni
competir con él (spoiler: esta adopción no abre Pull Requests propios ni
corre en un cron — es disciplina para quien escribe a mano).

## Despliegue: GitHub Pages

Este sitio se publica en **GitHub Pages** en
<https://apptolast.github.io/DockerSwarmDocs/>. Hay dos workflows de CI
separados en `.github/workflows/`:

- `build.yml`: se dispara en cada push/PR a `main`, solo compila el sitio
  (job/check `build`), sin desplegar nada. Así una PR de un bot contra
  `main` nunca publica contenido todavía sin fusionar.
- `deploy.yml`: se dispara solo en cada push a `main` (nunca en
  pull_request), compila de nuevo y despliega a GitHub Pages mediante
  `actions/deploy-pages`.

Nota operativa: publicar requiere que **Settings → Pages → Source** esté
puesto en `GitHub Actions` en la configuración del repo (paso único,
manual o vía API, independiente de este workflow).

## Desarrollo local

```bash
npm install
npm run start   # servidor de desarrollo en http://localhost:4321
npm run build   # build de producción en dist/
```

## Estructura

```text
.
├── src/
│   ├── content/
│   │   ├── docs/            páginas de documentación (frontmatter obligatorio)
│   │   └── docs/index.md    portada del sitio (template splash)
│   ├── content.config.ts    schema de frontmatter (docsSchema + extend)
│   └── assets/              logo y demás activos optimizables por Astro
├── public/                  activos estáticos servidos tal cual (favicon)
├── astro.config.mjs         configuración del sitio, sidebar, i18n, site/base
├── CLAUDE.md · AGENTS.md · CHECKPOINTS.md   gobernanza (adopción de TemplateSSDUncleBob)
├── harness.config.json      comandos reales de este stack (build, check de enlaces…)
├── scripts/                 sync-memoria.(sh|ps1) (memoria organizacional, opcional)
│                             y check-internal-links.mjs (enlaces internos, cero deps)
└── .github/workflows/       CI: build (siempre) + deploy a Pages (push a main)
```
