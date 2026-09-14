---
title: "OrganizationWeb: aplicación desplegada de forma independiente"
type: service
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture docs/ORGANIZATIONWEB.md, config/organizationweb.yml, config/capacity-profiles.yml, config/image-channels.yml, stacks/organizationweb/stack.yml.j2, docs/AUTOUPDATE.md, commits 5607afc, 5ba4f11, 2bb9a39, e920338 y 44469bf (2026-09-07 a 2026-09-14)"
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
| `edge_network` | `apptolast-edge-organizationweb` (red overlay cifrada dedicada, no attachable; la declara `ansible/group_vars/all.yml` y la crea el rol `edge`, ver [Topología de red](../topologia-red/)) |
| `data_root` | `/srv/organizationweb` |
| Servicios | `backend`, `web`, `postgres`, `rabbitmq` |
| Release declarado | `2ac34cd64d40c744215f5775d0cbd1b382791db0` |

<!-- markdownlint-enable MD013 -->

Desde el commit `2bb9a39` (#42), la imagen que ejecuta cada servicio no sale
de `config/organizationweb.yml` sino de `config/image-channels.yml`, que
`stacks/organizationweb/stack.yml.j2` renderiza: `backend`
(`docker.io/ocholoko888/organizationweb-api:latest`) y `web`
(`docker.io/ocholoko888/organizationweb-web:latest`) siguen su canal
`:latest`, clase `owner`; `postgres` y `rabbitmq` están en hold base por
digest, clase `stateful-major` (ver
[Actualización automática por canales de imagen](../automatizacion-imagenes/)).
Los digests de `images` en `config/organizationweb.yml` quedan solo como
baseline revisado y evidencia de restauración. Los cuatro servicios están en
`autoupdate: false`: `backend` porque sus actualizaciones aplican migraciones
de esquema (Flyway) que Swarm no revierte, y `web` porque avanza junto a su
`backend`; no hay backup fuera del host todavía (STOP gate 5, ver
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
`com.apptolast.purpose=organizationweb`, y son objetos inmutables: si alguno
ya existe no se sustituyen credenciales ni se recrea una mitad del conjunto
con passwords nuevos. **TODO: verificar** — la fuente no documenta ningún
procedimiento de rotación (ni un sufijo `-v2`):

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
- 2026-09-12 (23:12 UTC) — Commit `2bb9a39` (#42): las imágenes de
  `backend` y `web` pasan a salir del canal `:latest` de
  `config/image-channels.yml`.
- 2026-09-13 — Commit `e920338` (#43) añade el stack `autoupdater` al perfil
  de capacidad (3000m / 6802 MiB de reservas, 14600m / 11501 MiB de límites).
- 2026-09-14 — Esta página creada, verificada contra el commit `44469bf`
  de `DockerSwarmInfrastrcture`; el histórico completo release-por-release
  (releases 20 a 23 con su evidencia de aceptación, más la sección del
  release `2ac34cd`, candidato sin aceptación registrada) permanece
  únicamente en
  `docs/ORGANIZATIONWEB.md` del repositorio fuente, no duplicado aquí.

## Referencias

- [`docs/ORGANIZATIONWEB.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/ORGANIZATIONWEB.md)
- [`config/organizationweb.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/organizationweb.yml)
- [`config/capacity-profiles.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/capacity-profiles.yml)
- [`config/image-channels.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/image-channels.yml)
- [`docs/AUTOUPDATE.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/AUTOUPDATE.md)
