---
title: "Adopción de TemplateSSDUncleBob en este repositorio"
type: architecture
owner: PabloHurtadoGonzalo86
source-of-truth: "Este repositorio: CLAUDE.md, AGENTS.md, CHECKPOINTS.md, harness.config.json, scripts/sync-memoria.sh, scripts/sync-memoria.ps1, scripts/check-internal-links.mjs (introducidos en la rama feat/adopt-templatessd-full); plantilla origen Cenit-Digital/TemplateSSDUncleBob (README.md, CLAUDE.md, AGENTS.md, CHECKPOINTS.md, docs/workflow.md, docs/tdd.md, docs/gherkin.md, docs/mutation-testing.md, docs/configuration.md, docs/memoria-organizacional.md, .harness/adapters/generic.md y node.md, .claude/agents/*.md, scripts/sync-memoria.sh y .ps1); apptolast/DockerSwarmMemoria (bot diario existente: PRs #4 y #10 ya fusionados en este repo, ver README.md de este repo, sección 'Disciplina de contribución manual')"
last-verified: 2026-08-04
tags:
  - documentacion
  - harness
  - gobernanza
  - automatizacion
  - tooling
status: stable
superseded-by: null
depends-on: []
used-by: []
related-runbooks: []
related-dashboards: []
related-alerts: []
see-also:
  - "architecture:introduccion"
sidebar:
  order: 9
---

# Adopción de TemplateSSDUncleBob en este repositorio

## Resumen

Este repositorio adopta la disciplina de
[`Cenit-Digital/TemplateSSDUncleBob`](https://github.com/Cenit-Digital/TemplateSSDUncleBob)
— un arnés de desarrollo estilo Robert C. Martin ("Uncle Bob"): **conversar
la spec → destilarla en un contrato → tallar el trabajo → podar con juicio
(review) → validar con verificación real**, con una única puerta de
aprobación humana en el punto de máximo apalancamiento. La plantilla es
agnóstica al lenguaje: el proceso, los roles y las puertas son fijos, y solo
cambian los comandos concretos del stack (`harness.config.json`). Esta
página documenta **qué se adoptó aquí, cómo se adaptó con honestidad al
hecho de que este repo es un sitio de documentación (no una aplicación con
código de dominio), y —el punto que más importa— cómo convive con el bot ya
existente `apptolast/DockerSwarmMemoria` sin duplicarlo ni competir con él**.

## Qué se adoptó y qué cambia frente a la plantilla original

| Pieza de la plantilla | En `TemplateSSDUncleBob` | En este repo |
| --- | --- | --- |
| `CLAUDE.md` / `AGENTS.md` / `CHECKPOINTS.md` | Gobiernan un pipeline de 5 fases sobre código | Mismo pipeline de fondo (conversación → contrato → puerta humana → redacción → review → verificación), adaptado a prosa — ver `AGENTS.md`, sección 3 |
| `harness.config.json` | Comandos de test/lint/mutación de un stack de código | Comandos reales de `package.json`: `npm ci`, `npm run build`, `npm run check:links`; `lint`/`test`/`mutate` vacíos a propósito |
| `.harness/harness.mjs` + `bin/harness` | Motor agnóstico que ejecuta los comandos declarados | **No portado.** Los comandos de `harness.config.json` se invocan directamente (`npm run …`); no hay un binario intermedio que envolver aquí |
| `.claude/agents/*.md` (9 roles) | Reparte el trabajo entre subagentes especializados (spec, Gherkin, TDD, judge, mutación, seguridad, a11y/SEO, mentor) | **No portado como ficheros separados.** Un único escritor a la vez (humano o una sesión de Claude Code) aplica la misma secuencia de fases; ver el porqué en `AGENTS.md`, sección 4 |
| Gherkin (`.feature`, Given/When/Then) | El contrato que aprueba el humano antes del TDD | Sustituido por el **frontmatter de 13 campos + un esquema de secciones**: el contrato barato de revisar antes de escribir prosa |
| TDD estricto (Rojo-Verde-Refactor) | Un test a la vez, código mínimo | Sin equivalente literal: la "unidad de verificación" de una afirmación factual es su cita (`source-of-truth`), no un assert |
| Prueba de mutación | Mide si los tests "muerden" un defecto de código | **No aplica.** Declarado explícito en `CHECKPOINTS.md`, C7 — sin sustituto inventado |
| `scripts/sync-memoria.(sh\|ps1)` | Sincroniza patrones validados de la organización | Copiados **tal cual**, sin modificar (ver más abajo el matiz honesto sobre su utilidad real hoy) |
| Evolución autónoma (`autonomous-evolve.yml`) | Bot semanal/diario que propone mejoras del propio arnés vía PR | **Deliberadamente NO adoptado** — ver la sección siguiente |

## Cómo convive con el bot `apptolast/DockerSwarmMemoria` (sin duplicarlo ni competir)

Este es el punto de diseño más importante de esta adopción, y la razón por
la que **no** se ha traído la pieza de "evolución autónoma" de la plantilla
(`.github/workflows/autonomous-evolve.yml` en `TemplateSSDUncleBob`, que
abre PRs programados para mejorar el propio arnés). Este repositorio **ya**
tiene un mecanismo automático de propuesta de contenido: el bot
`apptolast/DockerSwarmMemoria` lee los cambios de `DockerSwarmInfrastrcture`
y abre Pull Requests aquí, siempre en modo borrador y siempre fusionados por
una persona, nunca automáticamente — dos rondas ya fusionadas hasta la
fecha, [`#4`](https://github.com/apptolast/DockerSwarmDocs/pull/4) y
[`#10`](https://github.com/apptolast/DockerSwarmDocs/pull/10) (ver
`README.md`, sección "Disciplina de contribución manual").

Añadir un segundo bot programado —aunque fuera para una tarea distinta—
crearía exactamente el riesgo que esta adopción debe evitar: dos mecanismos
automáticos proponiendo contenido al mismo repositorio, potencialmente sobre
las mismas páginas, sin que ninguno sepa del otro. Por eso el reparto de
responsabilidades queda así, explícito:

- **`DockerSwarmMemoria` sigue siendo el único mecanismo automático** que
  propone contenido nuevo o actualizado a partir de cambios reales en
  `DockerSwarmInfrastrcture`. Esta adopción no toca su cron, su workflow, ni
  su criterio de qué proponer. Las dos rondas ya fusionadas
  ([`#4`](https://github.com/apptolast/DockerSwarmDocs/pull/4),
  [`#10`](https://github.com/apptolast/DockerSwarmDocs/pull/10)) siguen
  siendo el historial real de ese bot, sin reescribirse.
- **Esta adopción de `TemplateSSDUncleBob` gobierna el otro camino**: el
  trabajo manual — una persona (o una sesión de Claude Code que orquesta una
  persona) escribiendo o reestructurando una página que el bot no propuso,
  o revisando/ampliando lo que el bot sí propuso. No abre Pull Requests por
  sí misma, no corre en un cron, no tiene ningún workflow de GitHub Actions
  asociado.
- **El mismo contrato de calidad se aplica a los dos caminos**, sin
  duplicar el mecanismo: el frontmatter de 13 campos
  (`src/content.config.ts`) y la regla de "nada inventado" ya se le exigen
  a cualquier página, venga de un PR del bot o de una edición manual. Esta
  adopción simplemente lo hace **explícito como checklist** en
  `CHECKPOINTS.md`, utilizable también por quien revisa (y fusiona a mano)
  un PR de `DockerSwarmMemoria` — sin crear una segunda validación
  automática que compita con la revisión humana que ya exige ese bot.
- **`AGENTS.md` pide explícitamente comprobar PRs abiertos del bot**
  (`gh pr list`) antes de tocar una página a mano, precisamente para no
  pisar una propuesta que ya está en vuelo.

En una frase: `DockerSwarmMemoria` sigue siendo la única fuente de
**automatización de propuesta**; esta adopción es **disciplina para el
trabajo manual**, con el mismo listón de calidad, sin autonomía propia y sin
ningún Pull Request propio.

## Lo que no tenía un equivalente limpio (dicho explícitamente, no inventado)

- **Prueba de mutación**: no aplica. `CHECKPOINTS.md` (C7) lo dice sin
  rodeos, con el motivo, en vez de simular una métrica de mutación sobre
  prosa Markdown (lo que sería, literalmente, teatro de verificación).
- **TDD estricto (Rojo-Verde-Refactor)**: tampoco tiene equivalente
  honesto porque no hay una suite de tests que falle/pase sobre código de
  dominio. Lo que sí tiene un equivalente real es la **puerta humana antes
  de producir el artefacto caro**: en la plantilla es el `.feature` Gherkin
  aprobado antes del TDD; aquí es el frontmatter + esquema de secciones
  aprobado antes de escribir la prosa completa.
- **Los 9 roles de `.claude/agents/`**: no se han portado como ficheros de
  subagente independientes. Repartir el trabajo en `spec_partner`,
  `gherkin_author`, `tdd_craftsman`, `judge`, `mutation_tester`, etc. tiene
  sentido en un pipeline de código con fases que conviene aislar por
  contexto; para un único escritor redactando una página a la vez, sin
  ciclo TDD que trocear, ese reparto habría sido forzar estructura donde no
  hace falta — el mismo criterio que ya pide esta adopción para no fingir
  la mutación. El detalle de qué sí se conserva (la secuencia de fases y la
  puerta humana) está en `AGENTS.md`, sección 4.
- **`scripts/sync-memoria.(sh|ps1)`**: se copian tal cual, sin modificar una
  sola línea (paso 2bis de `CLAUDE.md`). Dicho con honestidad: apuntan a
  `Cenit-Digital/SistemaDeMemoriaUncleBob`, un repo **privado** de otra
  organización. `apptolast` no pertenece a `Cenit-Digital`, así que en la
  práctica este paso muy probablemente terminará siempre en su rama "sin
  red/sin permiso" — que es exactamente su comportamiento **no bloqueante**
  por diseño, no un fallo. Se copian de todos modos porque no cuestan nada
  de mantener y quedan listos para el día en que `apptolast` tenga su propio
  repositorio de memoria organizacional equivalente.
- **"Build sin advertencias"**: al encargar esta adopción se dio por hecho
  que la opción de Starlight `disable404Route` ya estaba activa en
  `astro.config.mjs` como la disciplina de 0 advertencias de este repo. Se
  comprobó y no es así — hoy el build imprime una advertencia preexistente
  (`Entry docs → 404 was not found`, por la ruta `/404` que Starlight
  inyecta automáticamente sin que exista `src/content/docs/404.md`). Se ha
  dejado sin corregir en esta misma PR a propósito (no estaba en su alcance,
  y arreglarla implica elegir entre dos soluciones con un matiz de
  producto: perder o no la página 404 estilizada de Starlight — ver el
  detalle y las dos opciones en `CHECKPOINTS.md`, C3).

## Ficheros que introduce esta adopción

- `CLAUDE.md`, `AGENTS.md`, `CHECKPOINTS.md` — gobernanza adaptada.
- `harness.config.json` — comandos reales de este stack.
- `scripts/sync-memoria.sh` y `scripts/sync-memoria.ps1` — copiados tal
  cual de la plantilla.
- `scripts/check-internal-links.mjs` (cero dependencias) — nuevo, no existe
  en la plantilla; cierra el checkpoint "enlaces internos no rotos" porque
  ni Astro ni Starlight validan en build un enlace relativo mal escrito
  entre páginas. Expuesto también como `npm run check:links`.
- Esta misma página.

## Histórico relevante

- 2026-08-04 — Página creada junto con el resto de la adopción
  (`CLAUDE.md`, `AGENTS.md`, `CHECKPOINTS.md`, `harness.config.json`,
  `scripts/sync-memoria.sh`/`.ps1`, `scripts/check-internal-links.mjs`), en
  la rama `feat/adopt-templatessd-full`.

## Referencias

- [`Cenit-Digital/TemplateSSDUncleBob`](https://github.com/Cenit-Digital/TemplateSSDUncleBob)
- `CLAUDE.md`, `AGENTS.md` y `CHECKPOINTS.md` de este mismo repositorio (raíz
  del repo; sin enlace directo aquí porque, al escribir esta página, solo
  existen en la rama `feat/adopt-templatessd-full` — un enlace a
  `blob/main/` estaría roto hasta que esa rama se fusione).
- [PR #4 de DockerSwarmMemoria](https://github.com/apptolast/DockerSwarmDocs/pull/4)
- [PR #10 de DockerSwarmMemoria](https://github.com/apptolast/DockerSwarmDocs/pull/10)
