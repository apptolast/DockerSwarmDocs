---
title: "Agentes operadores (.claude/agents/)"
type: architecture
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture .claude/agents/ansible-operator.md, .claude/agents/iac-validator.md, .claude/agents/terraform-operator.md"
last-verified: 2026-07-28
tags:
  - ansible
  - terraform
  - seguridad
  - automatizacion
  - arquitectura
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
sidebar_position: 4
---

# Agentes operadores (`.claude/agents/`)

## Resumen

`DockerSwarmInfrastrcture` define tres agentes de Claude Code, cada uno
acotado a una parte concreta del ciclo de vida de la infraestructura. Viven
como ficheros Markdown con frontmatter en
`.claude/agents/{ansible-operator,iac-validator,terraform-operator}.md` del
repositorio fuente. Los tres comparten la misma disciplina: nunca inventan un
bypass, siempre validan antes de aplicar (check-then-apply), y ante una
compuerta STOP (ver [Compuertas abiertas](./compuertas-abiertas.md)) reportan
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
  [Compuertas abiertas](./compuertas-abiertas.md)) y la prohibición de
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

## Histórico relevante

- 2026-07-27 — Los tres ficheros de agente (`ansible-operator.md`,
  `iac-validator.md`, `terraform-operator.md`) existen en
  `.claude/agents/` del repositorio fuente (fecha de última modificación
  observada).
- 2026-07-28 — Esta página creada, verificada contra el contenido actual de
  los tres ficheros.

## Referencias

- [`.claude/agents/ansible-operator.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/.claude/agents/ansible-operator.md)
- [`.claude/agents/iac-validator.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/.claude/agents/iac-validator.md)
- [`.claude/agents/terraform-operator.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/.claude/agents/terraform-operator.md)
- [`CLAUDE.md`, sección "Fail-closed philosophy"](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/CLAUDE.md)
