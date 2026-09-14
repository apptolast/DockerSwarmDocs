---
title: "Actualización automática por canales de imagen"
type: infrastructure
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture docs/AUTOUPDATE.md, config/image-channels.yml, config/autoupdater.yml, stacks/autoupdater/stack.yml.j2, scripts/resolve-image-channel.py, scripts/validate-image-channels.py, scripts/validate-autoupdater.py, commits 2bb9a39, e920338, 6594913, 5e974ce y 44469bf (2026-09-11 a 2026-09-14)"
last-verified: 2026-09-14
tags:
  - swarm
  - autoupdate
  - shepherd
  - imagenes
  - docker-hub
  - automatizacion
status: stable
superseded-by: null
depends-on:
  - "service:catalogo-servicios"
  - "policy:compuertas-abiertas"
used-by:
  - "service:organizationweb"
related-runbooks: []
related-dashboards: []
related-alerts: []
see-also:
  - "architecture:introduccion"
  - "infrastructure:estado-observado"
  - "service:catalogo-servicios"
  - "service:organizationweb"
  - "policy:compuertas-abiertas"
sidebar:
  order: 11
---

# Actualización automática por canales de imagen

## Resumen

El owner decidió el 2026-09-11 que todo servicio Swarm, actual o futuro, se
actualiza desde un **canal revisado** en Git en lugar de un digest revisado:
las imágenes propias del owner siguen `:latest`; las bases de datos y colas
de terceros siguen un canal de versión mayor fijado. Esto reinterpreta la
regla de oro de `DockerSwarmInfrastrcture` ("un servidor perdido se
reconstruye desde un commit revisado más secretos y backups externos"): la
reconstrucción ahora descarga la cabeza actual de cada canal, no bytes
concretos. `config/image-channels.yml` es la única fuente de lo que ejecuta
cada servicio renderizado por los stacks `edge`, `workloads`,
`organizationweb` y `observability`; el propio vigilante (Shepherd, stack
`autoupdater`) mueve los digests entre despliegues para los servicios que
opten explícitamente por ello.

## Formas de una entrada de canal

Cada entrada de `image_channel_services` declara `stack`, `service`,
`baseline`, `reference`, `class` y `autoupdate`.

<!-- markdownlint-disable MD013 -->

| Forma de `reference` | Modo | `autoupdate` | Uso |
| --- | --- | --- | --- |
| `repo:tag` | canal | `true` o `false` | Se resuelve al desplegar; con `true` el vigilante también la re-fija entre despliegues. |
| `repo:tag@sha256:...` | hold | siempre `false` | Migración escalonada o rollback a un digest concreto. |
| `repo@sha256:...` | hold base | siempre `false` | Solo si es byte a byte la referencia del baseline. |
| `repo` sin tag ni digest | rechazada | — | Implicaría `:latest` sin revisión. |

<!-- markdownlint-enable MD013 -->

Reglas fijadas por `scripts/validate-image-channels.py` sin excepciones:
`class` es `owner` (tag siempre `latest`) para `apptolast`, `ocholoko888` y
`hgarciaalberto`; `stateful-major` para bases de datos, colas y Traefik, con
tag exacto de una tabla fija (`pg16`, `15-alpine`, `16-alpine`,
`7.2-alpine`, `v3`, `17-alpine`, `4.3-management-alpine`) cuya versión mayor
debe coincidir con el baseline; `third-party` para el resto. Todo servicio
renderizado aparece exactamente una vez en `image_channel_services` o en
`image_channel_exclusions` — un servicio nuevo sin entrada rompe CI. La
etiqueta de servicio `apptolast.autoupdate` vale `"true"` si y solo si
`autoupdate` es verdadero, y el socket Docker solo se permite montarlo en el
stack `autoupdater`.

## El vigilante (Shepherd, stack `autoupdater`)

Registrado en Git desde el commit `e920338` ("feat: register the
autoupdater watcher stack (#43)", 2026-09-13), sustituyendo al Shepherd que
corría en el host sin revisar (`IGNORELIST_SERVICES`, `SLEEP_TIME=20m`, sin
filtro por etiqueta). Contrato completo en `config/autoupdater.yml`:

- **Imagen**: `containrrr/shepherd:v1.8.1`, fijada por digest,
  `resolve_image: never`; es la única exclusión del mapa de canales — nunca
  se actualiza a sí mismo.
- **Entorno**: `FILTER_SERVICES=label=apptolast.autoupdate=true`,
  `SLEEP_TIME=1h`, `TIMEOUT=900`, `REGISTRY_USER=ocholoko888`,
  `WITH_REGISTRY_AUTH=true`, `TZ=UTC`. `SLEEP_TIME=1h` (frente a los `20m`
  del vigilante sin revisar) se eligió para no agotar el límite de 200
  descargas/6h de una cuenta gratuita de Docker Hub autenticada.
- **Credencial**: contraseña de `/run/secrets/shepherd_registry_password`,
  montada desde el secret externo `autoupdater-dockerhub-pat-v1`
  (uid/gid 0, modo `0400`), creado a mano por el owner fuera de Git.
- **Socket**: `/var/run/docker.sock` en solo lectura — único stack
  autorizado a montarlo; el bind de solo lectura no limita la API, así que
  el servicio sigue siendo equivalente a root en el único manager.
- **Recursos**: reserva 100m CPU / 18 MiB, límite 250m CPU / 45 MiB.
- **Ubicación**: una réplica en `node.role == manager`, sin puertos, en una
  red overlay propia no attachable.

Como ninguna entrada de `config/image-channels.yml` tenía inicialmente
`autoupdate: true`, tras el primer apply el vigilante no seleccionó ningún
servicio.

### Mitigación del crash tras un rollback (commit `44469bf`, 2026-09-14)

Shepherd v1.8.1 corre con `set -euo pipefail`; si Swarm hace rollback
automático (`failure_action: rollback`) tras una actualización fallida, el
servicio queda con `PreviousSpec` nulo y el script de Shepherd revienta con
`nil pointer evaluating` al intentar leerlo, cortando el resto del ciclo
(los servicios siguientes en el listado no se revisan). Verificado el
2026-09-14 con el CLI 28.5.2 de la propia imagen sobre el campo análogo
`.UpdateStatus.State`, no directamente sobre un `PreviousSpec` nulo real.
El fix del commit `44469bf` ("fix: delay watcher restarts by a full cycle
after a crash (#48)") cambia `restart_policy.delay` a `1h`: con el valor
anterior (`30s`) el contenedor reintentaba la misma cabeza rota cada 30
segundos, agotando peticiones de Docker Hub. Es una mitigación, no un
arreglo de raíz — mientras la cabeza siga rota, hay un intento cada hora
(con su corte de servicio) y ninguna alerta avisa porque `observability` no
está en el perfil de capacidad activo hoy (ver más abajo).

## Servicios activados (commit `5e974ce`, 2026-09-13/14)

Pasan a `autoupdate: true`: `workloads/kropia`,
`workloads/portfolio-alberto`, `workloads/portfolio-pablo` (imágenes
propias sin volumen), `workloads/minecraft-stats` (imagen propia, solo
monta el mundo de Minecraft en solo lectura) y `workloads/selenium`
(tercero sin estado). Criterio: ningún dato propio ni migración de esquema,
así que una imagen mala no deja nada que restaurar — el rollback de Swarm
(120 s de `monitor` y healthcheck) vuelve a la anterior, a costa de varios
minutos sin servicio por intento.

Siguen deliberadamente en `autoupdate: false`: `minecraft` (formato del
mundo), `passbolt`, `shlink`, y `organizationweb` `backend`/`web`
(migraciones de esquema, sin backup fuera del host — ver
[Compuertas abiertas](../compuertas-abiertas/), gate 5, y
[OrganizationWeb](../organizationweb/)); `openclaw` y `n8n` siguen en hold
de versión; Traefik queda fuera por su radio de impacto (un fallo corta los
diez hosts).

## Interruptor y rollback

- **Interruptor general**: un PR que pone `enabled: false` en
  `config/autoupdater.yml` renderiza `replicas: 0` (el servicio sigue
  registrado y su presupuesto de capacidad reservado), aplicado con
  `--playbook autoupdater`. Nunca se usa `docker service scale` a mano
  salvo emergencia, y ese mismo día se codifica el mismo cambio en un PR.
- **Rollback de un servicio**: un PR que cambia su entrada a hold
  (`repo:tag@sha256:<último bueno>`, `autoupdate: false`) y el playbook de
  su stack.
- **Nunca `docker service rollback`**: el vigilante reescribe
  `PreviousSpec` en cada ciclo, así que un `PreviousSpec` antiguo puede
  apuntar a una versión mayor distinta de la real.

## Riesgos aceptados

- La reconstrucción reproduce canales, no bytes; solo `observed-images.yml`
  registra los digests de cada apply, y lo que mueva el vigilante entre
  applies no queda registrado hasta el siguiente.
- El vigilante usa el socket Docker en el único manager (equivalente a
  root); el owner acepta este consumidor explícitamente.
- Shepherd v1.8.1 apenas se mantiene (último commit upstream 2025-11-11,
  según `docs/AUTOUPDATE.md`) y tiene fallos latentes; el `restart delay`
  de 1h es mitigación, no arreglo de raíz.

## TODO: verificar

- El gasto real de Docker Hub (`ratelimit-remaining`) tras el primer ciclo
  del vigilante con los cinco servicios activados no está registrado en el
  repositorio fuente a fecha `last-verified`; `docs/AUTOUPDATE.md` solo
  ofrece una estimación (~60 de 200 descargas por ventana de 6h).

## Histórico relevante

- 2026-09-11 — Decisión del owner de adoptar el modelo de canales; commit
  `2bb9a39` ("feat: render every swarm service from reviewed image
  channels (#42)") introduce `config/image-channels.yml` y los
  validadores/resolvers asociados.
- 2026-09-13 — Commit `e920338` registra en Git el stack `autoupdater`
  (Shepherd). Commit `6594913` ("fix: resolve oci image indexes that omit
  their media type (#44)") corrige `resolve-image-channel.py` para índices
  OCI sin `mediaType`.
- 2026-09-13/14 — Commit `5e974ce` activa `autoupdate: true` en los cinco
  canales sin datos propios ni migraciones de esquema.
- 2026-09-14 — Commit `44469bf` cambia el `restart_policy.delay` del
  vigilante a 1h tras identificar el crash por `PreviousSpec` nulo
  siguiente a un rollback automático.
- 2026-09-14 — Esta página creada, verificada contra el commit `44469bf`
  de `DockerSwarmInfrastrcture`.

## Referencias

- [`docs/AUTOUPDATE.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/AUTOUPDATE.md)
- [`config/image-channels.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/image-channels.yml)
- [`config/autoupdater.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/autoupdater.yml)
- [`stacks/autoupdater/stack.yml.j2`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/stacks/autoupdater/stack.yml.j2)
