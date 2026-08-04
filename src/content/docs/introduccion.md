---
title: "Introducción a DockerSwarm Docs"
type: architecture
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture, README.md y CLAUDE.md (raíz del repo), commit 45249ebb; lista de páginas re-verificada tras la ejecución del 2026-08-03 (commit af05ec0)"
last-verified: 2026-08-03
tags:
  - swarm
  - arquitectura
  - documentacion
  - rag
status: stable
superseded-by: null
depends-on: []
used-by: []
related-runbooks: []
related-dashboards: []
related-alerts: []
see-also:
  - "infrastructure:estado-observado"
  - "policy:compuertas-abiertas"
  - "architecture:agentes-operadores"
  - "service:catalogo-servicios"
  - "runbook:diagnosticos-conocidos"
  - "network:topologia-red"
sidebar:
  order: 1
---

# Introducción a DockerSwarm Docs

## Resumen

Este sitio documenta la infraestructura Docker Swarm de producción de
`apptolast`: un único VPS Netcup (`159.195.156.57`) que actúa a la vez como
manager y worker de un clúster Swarm de un solo nodo. La fuente de verdad de
esa infraestructura es el repositorio
[`apptolast/DockerSwarmInfrastrcture`](https://github.com/apptolast/DockerSwarmInfrastrcture),
construido con Terraform (proveedores: Cloudflare DNS, Netcup, backends R2) y
Ansible (host, Swarm, stacks). Este sitio (`DockerSwarmDocs`) no sustituye esa
fuente de verdad: es una capa de documentación navegable sobre ella.

## Contexto / por qué existe este sitio

El repositorio `DockerSwarmInfrastrcture` es código (Terraform, Ansible,
scripts) más un puñado de ficheros Markdown bajo `docs/`. Es preciso, pero no
está pensado como sitio navegable, ni lleva metadatos estructurados para que
un sistema externo lo indexe de forma fiable.

`DockerSwarmDocs` traduce ese contenido a páginas Markdown con:

- **Frontmatter YAML obligatorio** en cada página factual (`title`, `type`,
  `owner`, `source-of-truth`, `last-verified`, `tags`, `status`,
  `superseded-by`, y las listas de relaciones `depends-on`, `used-by`,
  `related-runbooks`, `related-dashboards`, `related-alerts`, `see-also`).
  Este formato es compatible, campo a campo, con la plantilla obligatoria de
  [`apptolast/sistema-central-admin-servidor`](https://github.com/apptolast/sistema-central-admin-servidor)
  (`docs/_template.md`), que gobierna el futuro "segundo cerebro" RAG de toda
  la infraestructura de `apptolast` (hoy centrado en el clúster Kubernetes de
  Hetzner, Fase 0). El objetivo es que, si ese RAG se extiende algún día a
  cubrir también este servidor Swarm, pueda ingerir estas páginas sin
  reescritura.
- **Tags navegables** (Docusaurus genera automáticamente páginas de índice
  por tag, en `/docs/tags`), para filtrar por tema (`swarm`, `dns`,
  `terraform`, `ansible`, `seguridad`, etc.) igual que en una wiki técnica.
- **Trazabilidad obligatoria**: cada afirmación factual debe poder citarse
  contra un fichero, sección o comando concreto del repo fuente. Si un dato
  no se puede verificar así, la página debe decirlo explícitamente (por
  ejemplo, `TODO: verificar`) en vez de rellenarlo con contenido plausible
  pero inventado.

## La regla de oro

Todo lo que documenta este sitio está gobernado por la misma regla de oro que
rige el repositorio fuente (`README.md` de `DockerSwarmInfrastrcture`):

> La regla de oro es que un servidor perdido se reconstruye desde un commit
> revisado más los secretos y backups externos. Ninguna configuración manual
> del host se considera estado válido si no queda codificada o documentada
> aquí.

Aplicada a este propio sitio, la misma regla implica: si un dato no está en
el Markdown versionado del repo fuente (o no puede verificarse contra él),
tampoco debe darse por válido aquí. El Markdown en git —del repo fuente, y de
este sitio— es la única fuente de verdad; nada se documenta "de memoria" ni
se despliega/publica como efecto colateral de escribir estas páginas (este
sitio no gestiona DNS, TLS, ni Traefik: eso sigue siendo, exclusivamente,
responsabilidad de `DockerSwarmInfrastrcture` y una decisión de su
propietario).

## Qué NO es este sitio

- No es una fuente de verdad alternativa: ante cualquier discrepancia con
  `DockerSwarmInfrastrcture`, gana el repositorio de infraestructura.
- No se autogenera todavía. Esta primera versión es manual ("seed"), escrita
  y verificada a mano contra el commit
  [`854e160a`](https://github.com/apptolast/DockerSwarmInfrastrcture/commit/854e160a5fa1b369f1755083f1242b50966b19b0)
  de `DockerSwarmInfrastrcture`. Ver el `README.md` de este repo para el plan
  de mantenimiento futuro (`apptolast/DockerSwarmMemoria`).
- No está desplegado en ningún dominio: la publicación (GitHub Pages, DNS,
  Traefik) es una decisión aparte, pendiente del propietario del repositorio.

## Páginas de este sitio

- [Estado observado](../estado-observado/) — instantánea verificable del
  estado real del servidor.
- [Compuertas abiertas](../compuertas-abiertas/) — condiciones externas que
  bloquean pasos productivos concretos (cutover DNS, backups, etc.).
- [Agentes operadores](../agentes-operadores/) — los tres agentes Claude Code
  que aplican cambios sobre este servidor con disciplina check-then-apply.
- [Catálogo de servicios](../catalogo-servicios/) — los servicios aprobados
  para la migración, sus hostnames/puertos y las exclusiones explícitas.
- [Diagnósticos conocidos](../diagnosticos-conocidos/) — entradas de log y
  fallos "esperados" de Docker, Traefik y `sudo-rs`, con su causa raíz.
- [Topología de red y aislamiento de edge](../topologia-red/) — el
  contrato de red de `config/platform.yml` y cómo Traefik aísla cada
  workload.
- [Observabilidad de fallos de backup](../observabilidad-backup/) — la
  corrección de la escritura de estado silenciosa y el hueco de alertas de
  "estado obsoleto" que sigue abierto en tres de los cuatro tipos de
  backup.
- [Adopción de TemplateSSDUncleBob](../adopcion-templatessd/) — la
  disciplina de contrato de frontmatter y verificación que rige el trabajo
  manual sobre `src/content/docs/`, y cómo convive con el bot
  `DockerSwarmMemoria` sin duplicarlo.

## Histórico relevante

- 2026-07-28 — Página creada como parte de la primera versión (seed) de
  `DockerSwarmDocs`, verificada contra el commit `854e160a` de
  `DockerSwarmInfrastrcture`.
- 2026-07-30 — Primera ejecución real de extracción de
  `apptolast/DockerSwarmMemoria`: se añaden tres páginas nuevas (catálogo
  de servicios, diagnósticos conocidos, topología de red) y se re-verifica
  el contenido de esta página y de las tres páginas del seed contra el
  commit `45249ebb`, sin encontrar cambios respecto a lo ya documentado.
- 2026-08-03 — Nueva ejecución de extracción, rango `54cb10a..af05ec0` de
  `DockerSwarmInfrastrcture`: se añade una página nueva (observabilidad de
  backup) y se actualizan [Agentes operadores](../agentes-operadores/) (los
  cuatro revisores y el guardián de rutas sensibles) y
  [Compuertas abiertas](../compuertas-abiertas/) (revalidación completa de
  las nueve compuertas del 2026-08-02, que corrige el estado de Minecraft y
  del cutover DNS respecto a lo documentado hasta ahora).

## Referencias

- [`README.md` de DockerSwarmInfrastrcture](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/README.md)
- [`CLAUDE.md` de DockerSwarmInfrastrcture](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/CLAUDE.md)
- [`sistema-central-admin-servidor`](https://github.com/apptolast/sistema-central-admin-servidor)
