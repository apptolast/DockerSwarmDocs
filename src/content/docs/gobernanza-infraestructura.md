---
title: "Gobernanza del repositorio de infraestructura: adopción de TemplateSSDUncleBob"
type: architecture
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture, commit 51e7339 (PR #13, \"feat: adopt TemplateSSDUncleBob harness conventions\", fusionado 2026-08-05): AGENTS.md, CHECKPOINTS.md, harness.config.json, docs/adopcion-templatessd.md, scripts/sync-memoria.sh, scripts/sync-memoria.ps1, CLAUDE.md, CHANGELOG.md, .gitignore, .claude/settings.json"
last-verified: 2026-08-05
tags:
  - documentacion
  - harness
  - gobernanza
  - automatizacion
  - tooling
  - ansible
  - terraform
status: stable
superseded-by: null
depends-on:
  - "architecture:agentes-operadores"
  - "policy:compuertas-abiertas"
used-by: []
related-runbooks: []
related-dashboards: []
related-alerts: []
see-also:
  - "architecture:introduccion"
  - "architecture:agentes-operadores"
  - "architecture:adopcion-templatessd"
sidebar:
  order: 10
---

# Gobernanza del repositorio de infraestructura: adopción de TemplateSSDUncleBob

## Resumen

`apptolast/DockerSwarmInfrastrcture` (el repositorio fuente que documenta
este sitio) adoptó, en el commit `51e7339` (PR
[`#13`](https://github.com/apptolast/DockerSwarmInfrastrcture/pull/13),
"feat: adopt TemplateSSDUncleBob harness conventions", fusionado el
2026-08-05), la disciplina de
[`Cenit-Digital/TemplateSSDUncleBob`](https://github.com/Cenit-Digital/TemplateSSDUncleBob).
Esta es una adopción **distinta e independiente** de la que ya documenta
la página [Adopción de TemplateSSDUncleBob en este repositorio](../adopcion-templatessd/):
esa otra página describe la adopción del propio sitio `DockerSwarmDocs`
(Astro/Starlight); esta describe la adopción, con alcance y ficheros
distintos, del repositorio de infraestructura (Terraform + Ansible) del
que este sitio se nutre.

La adopción no introduce ningún workflow autónomo: `terraform apply` y
`ansible-playbook` contra el host/clúster real siguen siendo, siempre,
una acción 100% manual del propietario
(`dockerswarm-infra/docs/adopcion-templatessd.md`, sección "0. Límite de
seguridad").

## Qué se añadió

- **`AGENTS.md`** — mapa de navegación para agentes de IA que trabajen en
  el repositorio: qué leer y cuándo, sin sustituir la lectura de
  `CLAUDE.md`.
- **`CHECKPOINTS.md`** — checklist de estado final con siete checkpoints
  (C1-C7), adaptado a infraestructura real. Dos de ellos declaran
  explícitamente que no hay equivalente honesto de la plantilla en vez de
  forzar uno:
  - **C6** — la plantilla aprueba un contrato Gherkin antes de escribir
    código; este dominio no tiene esa capa. El punto de máxima palanca
    equivalente ya existía antes de esta adopción: un plan de Terraform
    firmado e inspeccionado (`scripts/plan-terraform.sh`, verificado por
    `scripts/apply-terraform.sh`) o un `--check --diff` de Ansible
    revisado en la misma sesión antes de aplicar.
  - **C7** — no hay prueba de mutación. Verificado por grep: cero
    ocurrencias de `pytest`, `mutmut` o `cosmic-ray` en el repositorio; la
    suite es `unittest` sobre Python 3.14, y parte de los tests son
    puramente estáticos (parsean YAML/plantillas renderizadas y afirman
    sobre su estructura), por lo que un score de mutación penalizaría
    justo a los tests que más importan. El sustituto adoptado es la
    disciplina de test negativo por compuerta de `guardrail-adversary`
    (agente ya existente antes de esta adopción), reportada como `PASS` o
    `SUPERVIVIENTES(N)`, nunca como un porcentaje.
- **`harness.config.json`** — declara los comandos reales de este stack
  (`install`: `./scripts/bootstrap-tooling.sh`; `lint`:
  `./scripts/lint.sh`; `test`: `./scripts/validate-iac.sh`; `mutate` y
  `build` vacíos a propósito, con la razón documentada en
  `commands_notes`) en la forma declarativa de `TemplateSSDUncleBob`,
  como artefacto de consistencia entre repositorios de Cénit Digital.
  **No** está enganchado a `bin/harness` ni a `.harness/harness.mjs`: la
  cadena de verificación real y ejecutada por CI sigue siendo
  `scripts/validate-iac.sh` + `scripts/lint.sh`
  (`.github/workflows/validate.yml`).
- **`scripts/sync-memoria.sh`** y **`scripts/sync-memoria.ps1`** —
  copiados tal cual de la plantilla, como paso 2bis opcional y no
  bloqueante del protocolo de arranque de `CLAUDE.md`. Sincronizan
  `Cenit-Digital/SistemaDeMemoriaUncleBob` (repositorio privado); como
  `apptolast` no pertenece a esa organización, el paso normalmente
  terminará en su rama "sin red/sin permiso" sin traer patrones, lo cual
  es su comportamiento no bloqueante por diseño, no un fallo.
- **`docs/adopcion-templatessd.md`** — el documento fuente de esta misma
  página: explica qué se adoptó, la correspondencia entre los siete
  agentes ya existentes del repositorio (`terraform-operator`,
  `ansible-operator`, `iac-validator`, `judge`, `security-reviewer`,
  `guardrail-adversary`, `mentor`) y los roles de la plantilla, y por qué
  el motor genérico del arnés (`.harness/harness.mjs`, `bin/harness`) no
  se portó.
- Una sección "Session startup" nueva en `CLAUDE.md` que integra el paso
  2bis en el protocolo de arranque ya existente, sin tocar las nueve
  compuertas STOP ya documentadas (ver
  [Compuertas abiertas](../compuertas-abiertas/)).
- Una entrada en `.gitignore` para `.memoria-cache/` y dos líneas nuevas
  en el `allow` de `.claude/settings.json` para que
  `scripts/sync-memoria.sh`/`.ps1` no interrumpan cada sesión pidiendo
  permiso.
- Una entrada bajo `[Unreleased]` en `CHANGELOG.md` documentando la
  adopción.

## Qué se dejó exactamente igual

Según `dockerswarm-infra/docs/adopcion-templatessd.md`, sección 1, esta
adopción no modifica: los siete subagentes existentes de
`.claude/agents/` (ver [Agentes operadores](../agentes-operadores/)),
`.github/workflows/validate.yml` y `guard-sensitive-paths.yml`,
`.github/CODEOWNERS`, `.github/pull_request_template.md`,
`.github/actionlint.yaml`, `.github/dependabot.yml`, `.gitleaks.toml`,
`.ansible-lint`, `.hadolint.yaml`, `ruff.toml`, ni ningún fichero de
código de infraestructura (`ansible/`, `infra/terraform/`, `stacks/`,
`config/`, `migration/`, `backup/`, ni los scripts ya existentes bajo
`scripts/`). Las nueve compuertas STOP de `CLAUDE.md` tampoco se
revalidan ni se reescriben como parte de este cambio.

## Correspondencia de roles (resumen)

`dockerswarm-infra/docs/adopcion-templatessd.md`, sección 3, detalla la
correspondencia completa entre los seis roles de pipeline y tres roles de
soporte de la plantilla y los siete agentes ya existentes de este
repositorio. Los puntos más relevantes:

- `judge` (plantilla) ↔ `judge` (este repo): casi 1:1, incluso el nombre.
- `mutation_tester` (plantilla) ↔ `guardrail-adversary` (este repo):
  equivalente conceptual, no literal — ver C7 arriba.
- `spec_partner` y `gherkin_author` (plantilla): **sin equivalente**,
  dicho explícitamente — la "spec" de este repositorio ya vive versionada
  y declarativa en `CLAUDE.md`, `docs/*.md` y los contratos de
  `config/*.yml`.
- `a11y_seo_auditor` (plantilla): **no aplica** — este repositorio no
  tiene UI web propia que auditar (Traefik enruta aplicaciones de
  terceros cuyo código no vive aquí).
- `iac-validator` y `terraform-operator` (este repo): ampliaciones sin
  equivalente en la plantilla, por tratarse de dos stacks (Terraform y
  Ansible) con disciplinas de aplicación lo bastante distintas como para
  merecer agentes separados.

## TODO: verificar

- El coste real en tokens/USD de la ejecución que produjo el commit
  `51e7339` no está registrado en ninguna fuente disponible para esta
  extracción.
- Si `.github/workflows/validate.yml` fue modificado para invocar algo de
  `harness.config.json` directamente, o si sigue invocando
  `scripts/validate-iac.sh`/`scripts/lint.sh` sin pasar por él: la
  extracción de hoy no tuvo acceso al diff completo de
  `.github/workflows/` (no aparece en `scratch/changed-files.txt` de esta
  ejecución), así que se asume sin cambios por ausencia de evidencia en
  contra, pero no se ha verificado línea a línea.

## Referencias

- [`Cenit-Digital/TemplateSSDUncleBob`](https://github.com/Cenit-Digital/TemplateSSDUncleBob)
- `apptolast/DockerSwarmInfrastrcture`, commit `51e7339`, PR
  [`#13`](https://github.com/apptolast/DockerSwarmInfrastrcture/pull/13)
- [Agentes operadores (.claude/agents/)](../agentes-operadores/)
- [Compuertas externas abiertas y STOP gates](../compuertas-abiertas/)
- [Adopción de TemplateSSDUncleBob en este repositorio](../adopcion-templatessd/)
  (la adopción, distinta, del propio sitio `DockerSwarmDocs`)
