---
title: "Agentes operadores (.claude/agents/)"
type: architecture
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture .claude/agents/ansible-operator.md, .claude/agents/iac-validator.md, .claude/agents/terraform-operator.md, re-verificado en commit 45249ebb; .claude/agents/judge.md, .claude/agents/security-reviewer.md, .claude/agents/guardrail-adversary.md, .claude/agents/mentor.md y .github/workflows/guard-sensitive-paths.yml añadidos en commit 8a76620, re-verificado en ese mismo commit"
last-verified: 2026-08-03
tags:
  - ansible
  - terraform
  - seguridad
  - automatizacion
  - arquitectura
  - revision
status: stable
superseded-by: null
depends-on:
  - "policy:compuertas-abiertas"
used-by: []
related-runbooks: []
related-dashboards: []
related-alerts: []
see-also:
  - "architecture:introduccion"
  - "infrastructure:estado-observado"
sidebar:
  order: 4
---

# Agentes operadores (`.claude/agents/`)

## Resumen

`DockerSwarmInfrastrcture` define tres agentes de Claude Code, cada uno
acotado a una parte concreta del ciclo de vida de la infraestructura. Viven
como ficheros Markdown con frontmatter en
`.claude/agents/{ansible-operator,iac-validator,terraform-operator}.md` del
repositorio fuente. Los tres comparten la misma disciplina: nunca inventan un
bypass, siempre validan antes de aplicar (check-then-apply), y ante una
compuerta STOP (ver [Compuertas abiertas](../compuertas-abiertas/)) reportan
el bloqueo en vez de rodearlo.

## `ansible-operator`

Ejecuta los playbooks Ansible del repo exclusivamente a través de
`./scripts/deploy-ansible.sh` (con la única excepción de
`bootstrap-host`, que usa `scripts/bootstrap-host.sh`). Nunca invoca
`ansible-playbook` a pelo contra el inventario de producción (salvo
`--syntax-check` local, que no toca ningún host real).

- Secuencia obligatoria de dos pasos, en orden, sin saltarse ninguno: primero
  `--check` (dry run) y solo después de revisar su salida, `--confirm-production`.
  Ambos flags son mutuamente excluyentes en una sola invocación.
- Tras un `apply`, se espera que un `--check` de repetición reporte
  `changed=0`; un diff distinto de cero se investiga, no se ignora.
- `deploy-ansible.sh` rechaza por diseño un worktree git sucio; el agente no
  hace commit por iniciativa propia ni busca una forma de rodear ese rechazo.
- Nunca inventa un flag `--force`/`--skip-lock`, ni borra o edita a mano un
  fichero de lock o marker bajo `/run/lock/`.
- Edita únicamente contenido Ansible bajo `ansible/` (playbooks y roles); no
  toca `config/`, material de secretos, ni ficheros de lock/marker.

## `iac-validator`

Ejecuta la secuencia de validación completa del repo, en este orden exacto:

```bash
./scripts/bootstrap-tooling.sh
./scripts/validate-iac.sh
./scripts/lint.sh
```

- No tiene herramientas `Write`/`Edit`: diagnostica y ejecuta scripts ya
  existentes del repo, nunca modifica Terraform, Ansible ni el código de las
  herramientas de lock para forzar que un run pase.
- Sabe distinguir los tres tipos de fallo esperados: comando requerido
  ausente (`lint.sh`), fallo que exige root por el lock de validación Docker
  (esperado en el host de producción, donde el Swarm está activo), y marker
  obsoleto que requiere recuperación explícita.
- La recuperación de un marker obsoleto pasa siempre por una comprobación
  previa vía `/proc` de que el proceso controlador original ya no vive, y por
  el script correcto para cada tipo de marker exactamente (nunca cruza
  `host_global_operation_lock.py` con `ansible-operation-lock.py`, ni al
  revés): jamás borra ni edita un fichero de lock/marker directamente, y
  nunca inventa, adivina o reconstruye una cadena de confirmación o un
  `operation-id`.

## `terraform-operator`

Opera Terraform únicamente sobre cuatro roots de
`infra/terraform/`: `cloudflare/state-bootstrap`, `cloudflare/apptolast-dns`,
`netcup/perimeter` y `testing/r2-lock`; y únicamente a través de las
herramientas propias del repo (`scripts/plan-terraform.sh`,
`scripts/apply-terraform.sh`, `scripts/migrate-terraform-state.sh`,
`scripts/terraform-safety.py`, `scripts/test-terraform-r2-locking.sh`, y
`terraform fmt`/`validate`/`test` estándar).

- No tiene herramientas `Write`/`Edit` sobre ficheros `.tf`: si una tarea
  requiere cambiar contenido Terraform, propone el diff exacto en su
  respuesta y pide confirmación humana antes de que se escriba nada.
- Respeta sin excepción los STOP gates que codifica
  `scripts/terraform-safety.py` y los wrappers del repo, entre ellos el
  bloqueo incondicional del cutover DNS hacia la IP de plataforma (ver
  [Compuertas abiertas](../compuertas-abiertas/)) y la prohibición de
  aplicar/migrar el root `cloudflare/state-bootstrap` (backend local sin
  contrato de cuarentena post-writer).
- Ante credenciales ausentes o fuera de alcance, lo reporta como bloqueo, no
  como algo que rellenar inventando un valor.
- Siempre hace `plan` antes de `apply`, y `apply-terraform.sh` exige un
  worktree git limpio.

## Disciplina compartida: check-then-apply y STOP gates

Los tres agentes están diseñados para el mismo contexto: un Swarm de un solo
nodo, sin alta disponibilidad, donde una decisión equivocada no tiene
redundancia que la absorba (`CLAUDE.md`, "Fail-closed philosophy"). Por eso
comparten estas reglas, sin excepción documentada:

- Dry-run (`--check` / `plan`) siempre antes que apply, nunca al revés ni en
  paralelo.
- Un worktree git sucio bloquea cualquier writer; ninguno de los tres agentes
  hace commit por iniciativa propia para desbloquearlo.
- Ningún agente acepta ni inventa un flag `--force`/bypass: si algo bloquea,
  el resultado esperado es reportarlo, no rodearlo.
- Los locks/markers bajo `/run/lock/` nunca se editan ni borran a mano; su
  recuperación exige evidencia explícita (verificación por `/proc` de que no
  queda proceso controlador vivo) y el script correcto para ese tipo de
  marker.

## Los cuatro revisores (`.claude/agents/`)

Añadidos en el commit `8a76620` ("feat(agents): add the four reviewers and
the sensitive-path guard (#10)", 2026-08-02). Antes de este commit el
repositorio tenía tres operadores y ningún revisor (así lo dice el propio
`.claude/agents/judge.md`: "Este repositorio tiene tres operadores... y
ningún revisor. Tú eres el revisor."). Los cuatro comparten un rasgo con los
operadores —disciplina fail-closed, cero flags de bypass, cero valores
inventados— pero invierten el permiso de escritura: ninguno tiene `Write` ni
`Edit`, por diseño deliberado y documentado, igual que ya declaraba
`terraform-operator.md` de sí mismo.

- **`judge`**: veredicto `APPROVED`/`CHANGES_REQUESTED` contra `CLAUDE.md`,
  `.github/pull_request_template.md` y las compuertas STOP. Sin `Write`/
  `Edit`; escribe su veredicto a `.build/review/` únicamente vía `Bash`
  (heredoc), un directorio en `.gitignore` para no ensuciar el worktree que
  los writers exigen limpio. Ejecuta la secuencia de validación
  (`bootstrap-tooling.sh`, `validate-iac.sh`, `lint.sh`) como evidencia, pero
  nunca corrige lo que encuentra: señala `fichero:línea` y deja el arreglo al
  operador correspondiente.
- **`security-reviewer`**: revisor de seguridad **obligatorio** (no opcional)
  para todo diff que toque `ansible/`, `config/`, `scripts/`, `stacks/`,
  `infra/terraform/`, `backup/`, `migration/` o `.claude/`. Recorre ocho ejes
  fijos: cortafuegos (UFW/`DOCKER-USER`/CrowdSec), alta en el grupo `docker`,
  política SSH staged/final y su rollback, escritura de secretos en claro,
  ciclo de rotación crear-nuevo/repuntar/revocar-viejo, lectura TOCTOU-segura,
  `allowed-signers`/atestación, y blast radius de `--check`/
  `--confirm-production`. No repite lo que ya cubren `gitleaks`, `shellcheck`,
  `markdownlint` ni `ansible-lint`.
- **`guardrail-adversary`**: testing negativo de guardarrailes. Por cada gate
  que un cambio toque, busca si existe un test que demuestre que el gate
  **rechaza** la entrada mala (no solo que acepta la buena) y lista los
  "supervivientes" — bypasses sin cobertura — citando el test exacto que
  falta. Nunca escribe el test ni edita el gate para forzar un PASS.
- **`mentor`**: el único de solo lectura estricta (`Read`/`Glob`/`Grep`, sin
  `Bash`). Explica el porqué de las decisiones del repo (fail-closed, el
  mutex host-global, el idiom TOCTOU, el orden CrowdSec/`DOCKERSWARM-INGRESS`,
  las puertas STOP) citando `fichero:línea`, y remite a los otros agentes
  cuando lo que hace falta es ejecutar algo, no entenderlo.

**`.github/workflows/guard-sensitive-paths.yml`**: workflow (no agente) que
etiqueta con `permissions-change` cualquier PR que toque una ruta sensible —
el propio motor de CI (`scripts/bootstrap-tooling.sh`, `scripts/lint.sh`,
`scripts/validate*`, `.ansible-lint`), el motor de operaciones peligrosas
(`scripts/terraform-safety.py`, los scripts de lock/lease, `apply-terraform.sh`,
`deploy-ansible.sh`), el contrato de producción (`config/`,
`ansible/roles/host_security/`, `ansible/roles/host_baseline/`,
`infra/terraform/`, `stacks/workloads/config/`), o el gobierno del propio
repositorio (`.gitleaks.toml`, `.github/`, `.claude/`). Usa
`pull_request_target` sin checkout ni ejecución de código del PR (solo pide
por API la lista de nombres de fichero vía `gh api`), incluye
`previous_filename` para que un rename no lo esquive, y nunca bloquea el
check por sí mismo: la aplicación real es `.github/CODEOWNERS` más la
protección de rama.

## Histórico relevante

- 2026-07-27 — Los tres ficheros de agente (`ansible-operator.md`,
  `iac-validator.md`, `terraform-operator.md`) existen en
  `.claude/agents/` del repositorio fuente (fecha de última modificación
  observada).
- 2026-07-28 — Esta página creada, verificada contra el contenido actual de
  los tres ficheros.
- 2026-07-30 — Re-verificada contra el commit `45249ebb` de
  `DockerSwarmInfrastrcture`: los tres ficheros de agente conservan el
  mismo contenido citado arriba, sin cambios.
- 2026-08-02 — Añadidos los cuatro revisores (`judge`, `security-reviewer`,
  `guardrail-adversary`, `mentor`) en `.claude/agents/` y el workflow
  `.github/workflows/guard-sensitive-paths.yml`, verificado contra el commit
  `8a76620` de `DockerSwarmInfrastrcture` ("feat(agents): add the four
  reviewers and the sensitive-path guard (#10)"); `CHANGELOG.md`, sección
  `### Added`, registra el mismo detalle.

## Referencias

- [`.claude/agents/ansible-operator.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/.claude/agents/ansible-operator.md)
- [`.claude/agents/iac-validator.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/.claude/agents/iac-validator.md)
- [`.claude/agents/terraform-operator.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/.claude/agents/terraform-operator.md)
- [`.claude/agents/judge.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/.claude/agents/judge.md)
- [`.claude/agents/security-reviewer.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/.claude/agents/security-reviewer.md)
- [`.claude/agents/guardrail-adversary.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/.claude/agents/guardrail-adversary.md)
- [`.claude/agents/mentor.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/.claude/agents/mentor.md)
- [`.github/workflows/guard-sensitive-paths.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/.github/workflows/guard-sensitive-paths.yml)
- [`CLAUDE.md`, sección "Fail-closed philosophy"](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/CLAUDE.md)
