# AGENTS.md — Mapa de navegación para agentes de IA

> Punto de entrada para cualquier agente que trabaje en este repositorio.
> NO es una biblia de reglas: es un **mapa**. Lee solo lo que necesites.
>
> Este repositorio adopta el proceso de
> [`Cenit-Digital/TemplateSSDUncleBob`](https://github.com/Cenit-Digital/TemplateSSDUncleBob)
> (conversación → contrato → redacción → review → verificación), adaptado
> con honestidad de dominio: `DockerSwarmDocs` es un **sitio de
> documentación** (Astro/Starlight), no una aplicación con código propio.
> Ver `CLAUDE.md` para el protocolo de arranque y
> `src/content/docs/adopcion-templatessd.md` para la explicación completa,
> incluida su convivencia con el bot `apptolast/DockerSwarmMemoria`.

## 1. Antes de empezar

1. Ejecuta `npm run build` (`commands.build` de `harness.config.json`). Si
   falla o imprime una advertencia nueva, para y resuelve antes de escribir
   contenido.
2. Comprueba si `apptolast/DockerSwarmMemoria` tiene ya un PR abierto sobre
   la página que vas a tocar (`gh pr list`), para no duplicar ni competir
   con él.
3. Lee `CHECKPOINTS.md` antes de dar cualquier página por cerrada.

## 2. Mapa del repositorio

| Archivo / carpeta                     | Qué contiene                                                        | Cuándo leerlo                        |
| -------------------------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| `harness.config.json`                  | ⭐ Comandos reales de este stack (build, check de enlaces…)          | Antes de tocar el arnés                |
| `CLAUDE.md`                            | Protocolo de arranque y reglas duras                                | Siempre, al empezar sesión             |
| `CHECKPOINTS.md`                       | Criterios objetivos de "página/cambio terminado"                    | Antes de cerrar cualquier página       |
| `src/content.config.ts`                | Schema Zod del frontmatter (los 13 campos + `title`)                 | Antes de escribir una página nueva     |
| `src/content/docs/*.md`                | Las páginas del sitio (el contenido en sí)                           | Siempre                                |
| `src/content/docs/adopcion-templatessd.md` | Cómo esta adopción convive con el bot `DockerSwarmMemoria`      | Para entender el porqué de este arnés  |
| `astro.config.mjs`                     | Config del sitio: sidebar explícito por `slug`, i18n, `site`/`base`  | Al añadir una página (hay que listarla en `sidebar`) |
| `scripts/sync-memoria.sh` (`.ps1`)     | Sincroniza la memoria organizacional (paso 2bis, opcional)           | Al arrancar sesión                     |
| `scripts/check-internal-links.mjs`     | Comprueba enlaces relativos rotos entre páginas (cero dependencias)  | Antes de cerrar cualquier cambio       |
| `.github/workflows/build.yml`          | CI: compila en cada push/PR a `main`, no despliega                   | Para entender el gate de PR            |
| `.github/workflows/deploy.yml`         | Despliega a GitHub Pages solo en push a `main`                       | Para entender el despliegue            |
| `README.md`                            | Qué es este repo, su relación con `DockerSwarmInfrastrcture` y el bot | Para orientarte la primera vez         |

## 3. El pipeline adaptado

```
idea de página / cambio
  │  CONVERSACIÓN     — propósito, alcance, source-of-truth propuesto
  │
  │  CONTRATO         — frontmatter completo (13 campos) + esquema de
  │                      secciones. Es el equivalente honesto al .feature
  │                      Gherkin de la plantilla: un contrato barato de
  │                      revisar ANTES de escribir prosa, no una lista de
  │                      Given/When/Then (la prosa no tiene esa forma).
  │
  ▼  ⏸  PUERTA HUMANA: el propietario del repo aprueba frontmatter + esquema
  │
  │  REDACCIÓN        — se escribe citando source-of-truth verificable;
  │                      "TODO: verificar" en vez de inventar
  │
  │  REVIEW           — contra CHECKPOINTS.md (cobertura de los 13 campos,
  │                      nada inventado, coherencia con páginas existentes)
  │
  │  VERIFICACIÓN     — npm run build (0 advertencias) + npm run
  │                      check:links + el propio schema Zod de
  │                      content.config.ts (corre dentro de build)
  ▼
página lista para PR
```

Una sola página (o cambio de alcance equivalente) a la vez. Una sola puerta
de aprobación humana: sobre el frontmatter + esquema, **antes** de escribir
el cuerpo — exactamente el mismo principio que motiva la puerta sobre
Gherkin en la plantilla original ("aprobar tarde es caro").

## 4. Qué NO tiene equivalente literal (y por qué)

La plantilla original valida con **TDD estricto** (un test a la vez,
Rojo→Verde→Refactor) y cierra cada feature con **prueba de mutación**
(introduce defectos de código y exige que algún test falle). Ninguna de las
dos tiene un equivalente honesto en documentación:

- **TDD estricto** asume código ejecutable y una suite que falla/pasa. Una
  página Markdown no "falla" de esa manera; su unidad de verificación real
  es la cita verificable (`source-of-truth`) y el schema de frontmatter, no
  un test rojo. Por eso el "contrato" (frontmatter + esquema) hace aquí el
  trabajo que el `.feature` Gherkin hace en código: es lo que se aprueba
  ANTES de producir el artefacto caro (la prosa), pero lo que sigue después
  no es un ciclo Rojo-Verde-Refactor.
- **Prueba de mutación NO APLICA a este dominio.** Se dice explícito y sin
  rodeos en `CHECKPOINTS.md` (C7), tal y como pide la adaptación: no se
  finge un sustituto. No hay "mutantes" de una afirmación factual en
  prosa, y no hay tests que "muerdan" — inventar una métrica aquí sería
  teatro de verificación, no una medida real.

Tampoco se ha portado el reparto en 5-9 subagentes Markdown especializados
de `.claude/agents/` de la plantilla (`craftsman_lead`, `spec_partner`,
`gherkin_author`, `tdd_craftsman`, `judge`, `mutation_tester`,
`security_reviewer`, `a11y_seo_auditor`, `mentor`): con un único escritor a
la vez y sin ciclo TDD que trocear en fases, ese reparto de contexto no
aporta nada real aquí y se explica por qué en `CLAUDE.md`. Lo que sí se
conserva, porque sí tiene equivalente honesto, es la **secuencia de fases y
la puerta humana única** — la parte que de verdad importa del método.

## 5. Reglas duras (no negociables)

- **Una sola página (o cambio de alcance similar) a la vez.**
- **No cierres** una página sin `npm run build` en verde (sin advertencias
  nuevas) y `npm run check:links` en verde.
- **No saltes** la puerta humana sobre frontmatter + esquema para una
  página nueva.
- **No inventes** un dato factual ni un `source-of-truth`: si no se puede
  verificar, se marca explícito como pendiente (la "regla de oro" ya
  vigente en este repo, ver `README.md`).
- **No compitas** con `apptolast/DockerSwarmMemoria`: comprueba PRs
  abiertos del bot antes de tocar una página.
- **Si "mutación" o "TDD estricto" no tienen sentido para lo que estás
  haciendo, dilo** — no inventes un equivalente falso.

## 6. Si te bloqueas

- Relee `CHECKPOINTS.md` y `src/content/docs/adopcion-templatessd.md`.
- Si una herramienta no hace lo que esperas, no inventes un rodeo:
  documenta el bloqueo en el PR o en la conversación y para la sesión.
