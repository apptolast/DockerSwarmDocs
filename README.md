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

## Estado actual: contenido sembrado a mano, no autogenerado

Esta primera versión del sitio es **manual** ("seed"): cada página se
escribió y verificó a mano contra el contenido real de
`apptolast/DockerSwarmInfrastrcture` (README.md, CLAUDE.md, CHANGELOG.md,
`docs/*.md`, `.claude/agents/*.md`) en el commit
[`854e160a`](https://github.com/apptolast/DockerSwarmInfrastrcture/commit/854e160a5fa1b369f1755083f1242b50966b19b0).
No existe todavía ningún proceso que regenere estas páginas automáticamente
cuando cambie el repo fuente. Si un dato no se pudo verificar contra ese
repo, la página correspondiente lo dice explícitamente en vez de rellenarlo
con contenido inventado.

En el futuro, el bot **`apptolast/DockerSwarmMemoria`** es quien está
pensado para abrir Pull Requests aquí y mantener este sitio vivo (sincronizado
con los cambios reales de `DockerSwarmInfrastrcture`), en vez de que las
páginas se editen a mano indefinidamente. Ese bot no existe todavía en esta
fecha: este repo se crea como el punto de partida sobre el que trabajaría.

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
└── .github/workflows/       CI: build (siempre) + deploy a Pages (push a main)
```
