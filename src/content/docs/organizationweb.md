---
title: "OrganizationWeb: aplicación desplegada de forma independiente"
type: service
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture docs/ORGANIZATIONWEB.md, config/organizationweb.yml, config/capacity-profiles.yml, commits 5607afc, 5ba4f11 (2026-09-07 a 2026-09-11)"
last-verified: 2026-09-14
tags:
  - swarm
  - organizationweb
  - servicios
  - capacidad
  - secrets
status: stable
superseded-by: null
depends-on:
  - "network:topologia-red"
  - "infrastructure:automatizacion-imagenes"
  - "policy:compuertas-abiertas"
used-by: []
related-runbooks: []
related-dashboards: []
related-alerts: []
see-also:
  - "architecture:introduccion"
  - "service:catalogo-servicios"
  - "infrastructure:automatizacion-imagenes"
  - "policy:compuertas-abiertas"
sidebar:
  order: 12
---

# OrganizationWeb: aplicación desplegada de forma independiente

## Resumen

`OrganizationWeb` es una aplicación propia (backend + web + PostgreSQL +
RabbitMQ) desplegada como stack Swarm independiente, gobernada por su
propio catálogo `config/organizationweb.yml` — **no** forma parte de
`config/services.yml` ni de su marcador de restauración (ver
[Catálogo de servicios aprobados](../catalogo-servicios/), que documenta
exclusivamente el alcance de la migración de `MigracionNetCup`). Se aceptó
en producción por primera vez el 7 de septiembre de 2026 (PR29, commit
`5607afc`) y ha recibido varias actualizaciones de catálogo desde entonces,
documentadas con su propia evidencia en
`docs/ORGANIZATIONWEB.md` de `DockerSwarmInfrastrcture`. Esta página resume
el contrato vigente y las reglas operativas, no repite el histórico
release-por-release de esa fuente.

## Contrato (`config/organizationweb.yml`)

<!-- markdownlint-disable MD013 -->

| Campo | Valor |
| --- | --- |
| `hostname` | `organizacion.apptolast.com` |
| `edge_network` | `apptolast-edge-organizationweb` (red overlay cifrada dedicada, no attachable) |
| `data_root` | `/srv/organizationweb` |
| Servicios | `backend`, `web`, `postgres`, `rabbitmq` |
| Release declarado | `2ac34cd64d40c744215f5775d0cbd1b382791db0` |

<!-- markdownlint-enable MD013 -->

`backend` y `web` fijan su imagen por digest OCI (`ocholoko888/organizationweb-api`,
`ocholoko888/organizationweb-web`); `postgres` y `rabbitmq` fijan la suya
también por digest, gobernados como entradas `hold`/`stateful-major` del
modelo de canales (ver
[Actualización automática por canales de imagen](../automatizacion-imagenes/)).
`backend` y `web` permanecen deliberadamente en `autoupdate: false` porque
sus actualizaciones aplican migraciones de esquema (Flyway) que Swarm no
revierte, y no hay backup fuera del host todavía (STOP gate 5, ver
[Compuertas abiertas](../compuertas-abiertas/)).

**TODO: verificar** — `docs/ORGANIZATIONWEB.md` describe el release
`2ac34cd` bajo el encabezado "Release de aplicación 2ac34cd" (sin el
calificativo "desplegada y aceptada" que llevan las secciones de los
releases anteriores, 20 a 23, cada una con su propia evidencia de
aceptación HTTPS). `config/organizationweb.yml` ya declara ese release como
el vigente en el catálogo, y el texto fuente indica que las imágenes se
construyeron y publicaron el 11 de septiembre de 2026, pero este documento
no puede confirmar de forma independiente si la aceptación productiva de
ese release concreto (con sus diez migraciones Flyway V22–V32) ya se
completó o sigue pendiente del operador.

## Perfil de capacidad

`config/capacity-profiles.yml` declara el perfil activo (`active:
organizationweb`), que agrupa los stacks `edge`, `workloads`,
`organizationweb` y `autoupdater` — excluye `observability`, que no está en
el perfil activo hoy. Agregado del perfil: 3000m CPU / 6802 MiB de
reservas, 14600m CPU / 11501 MiB de límites. El propio stack
`organizationweb` reserva 500m CPU / 800 MiB y limita 2250m CPU / 1600 MiB
entre sus cuatro servicios esperados (`backend`, `postgres`, `rabbitmq`,
`web`). El perfil alternativo `observability` (que sustituye
`organizationweb` por `observability` en el mismo agregado de cuatro
stacks) queda declarado pero no activo.

## Secrets (bootstrap manual, siete objetos)

Todos los secrets de `OrganizationWeb` son externos, creados a mano por el
operador fuera de Git, con las etiquetas
`com.apptolast.managed-by=manual-bootstrap` y
`com.apptolast.purpose=organizationweb`, y son inmutables — una rotación
crea un secret `-v2` nuevo y actualiza la referencia, nunca sobrescribe el
existente:

- `organizationweb-db-username-v1`, `organizationweb-db-password-v1`
- `organizationweb-auth-username-v1`, `organizationweb-auth-password-v1`
- `organizationweb-rabbitmq-username-v1`,
  `organizationweb-rabbitmq-password-v1`, `organizationweb-rabbitmq-config-v1`

El rol de Ansible solo inspecciona metadatos de estos secrets (`no_log`);
nunca los crea ni conoce su valor. El operador los crea con un script
root-only temporal fuera del checkout, bajo el lock de operación global del
host (`scripts/host_global_operation_lock.py`), sin que ningún valor
aparezca en argumentos, historial, logs o Git.

## Orden de despliegue y rollback

El playbook `edge` debe aplicarse antes que `organizationweb`: crea la red
edge dedicada y el router file-provider que `organizationweb` necesita. El
runbook de origen exige `--check` antes de `--confirm-production` para
ambos playbooks, y repetición del apply con `changed=0` exigido en la
segunda ejecución consecutiva. El rollback de Swarm **no revierte
migraciones Flyway**: retroceder a un release anterior exige un backup
`pg_dump` fresco (bajo el lock de operación) o validar explícitamente que
la versión anterior de la API tolera el esquema ya migrado — nunca se
restaura automáticamente una copia antigua sobre escrituras posteriores.

## Histórico relevante

- 2026-09-07 — Primera aceptación productiva (PR29, commit `5607afc`),
  catálogo `491e2c2`.
- 2026-09-11 — Catálogo actualizado a la revisión de aplicación `2ac34cd`
  (commit `5ba4f11`), con diez migraciones Flyway nuevas (V22–V32).
- 2026-09-14 — Esta página creada, verificada contra el commit `5ba4f11`
  de `DockerSwarmInfrastrcture`; el histórico completo release-por-release
  (releases 20 a 24, con su evidencia de aceptación HTTPS, backups y
  restauraciones probadas) permanece únicamente en
  `docs/ORGANIZATIONWEB.md` del repositorio fuente, no duplicado aquí.

## Referencias

- [`docs/ORGANIZATIONWEB.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/ORGANIZATIONWEB.md)
- [`config/organizationweb.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/organizationweb.yml)
- [`config/capacity-profiles.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/capacity-profiles.yml)
