---
title: "Runbook: la excepción tracked-tag de la imagen de Alberto"
type: runbook
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture docs/ACTUALIZACIONES_IMAGENES.md, config/workload-image-updates.yml, scripts/resolve-tracked-image.py, ansible/roles/image_preflight/{defaults,tasks}/main.yml, ansible/roles/workloads/tasks/derive.yml, ansible/playbooks/{site,workloads,preflight-images,render-workloads}.yml, CHANGELOG.md (sección [Unreleased] → Changed), commit f91c6e9 (#21, 2026-08-20)"
last-verified: 2026-08-20
tags:
  - swarm
  - imagenes
  - preflight
  - alberto
  - seguridad
  - runbook
status: stable
superseded-by: null
depends-on:
  - "service:catalogo-servicios"
used-by: []
related-runbooks:
  - "runbook:diagnosticos-conocidos"
related-dashboards: []
related-alerts: []
see-also:
  - "service:catalogo-servicios"
  - "architecture:introduccion"
  - "infrastructure:estado-observado"
sidebar:
  order: 11
---

# Runbook: la excepción tracked-tag de la imagen de Alberto

## Resumen

Toda imagen externa del catálogo de despliegue de `DockerSwarmInfrastrcture`
se fija por digest (`@sha256:...`) — ver
[Catálogo de servicios aprobados](../catalogo-servicios/). El servicio
`personal-website-alberto` (servicio Swarm `portfolio-alberto`) es, desde el
commit `f91c6e9` ("feat: govern Alberto tracked image updates", PR
[`#21`](https://github.com/apptolast/DockerSwarmInfrastrcture/pull/21),
2026-08-20), la **única excepción operativa** a esa regla: puede actualizarse
siguiendo la etiqueta mutable `docker.io/hgarciaalberto/personal-website:latest`,
pero solo dentro de un contrato que exige revisión humana explícita del
digest antes de cada actualización y que falla en seco si el registro remoto
ya no coincide con lo aprobado.

## Los dos contratos

- `config/services.yml` conserva el digest histórico de la migración para
  `personal-website-alberto`/`app`
  (`docker.io/hgarciaalberto/personal-website@sha256:34c6854a…`, ver
  `docs/ACTUALIZACIONES_IMAGENES.md:26-27`). No se toca en una actualización
  normal: es evidencia de restauración, no la referencia de runtime.
- `config/workload-image-updates.yml` declara la excepción operativa, con
  `workload_image_update_schema_version: 1` y exactamente una entrada:

  | Campo | Valor |
  | --- | --- |
  | `catalog_service` | `personal-website-alberto` |
  | `component` | `app` |
  | `swarm_service` | `portfolio-alberto` |
  | `catalog_reference` | El mismo digest histórico de `config/services.yml` |
  | `tracked_reference` | `docker.io/hgarciaalberto/personal-website:latest` |
  | `approved_runtime_reference` | `tracked_reference` + `@sha256:<digest aprobado>`, versionado en Git |
  | `update_policy` | `tracked-tag` |

  `ansible/roles/image_preflight/tasks/main.yml:1-50` valida en cada
  ejecución que esta lista tenga longitud 1, que sus claves sean exactamente
  esas siete, y que `catalog_reference` coincida byte a byte con el digest
  que `approved_services` declara para ese servicio/componente — no puede
  ampliarse a otro servicio ni a otra imagen sin cambiar también el
  validador.

## Cómo se aplica en Ansible

1. **`image_preflight`** (`ansible/roles/image_preflight/tasks/main.yml`)
   solo resuelve la etiqueta seguida cuando el playbook que lo invoca fija
   `image_preflight_include_tracked_updates: true` — así lo hacen `site`,
   `workloads` y `preflight-images`
   (`ansible/playbooks/{site,workloads,preflight-images}.yml`). El valor por
   defecto del rol es `false`
   (`ansible/roles/image_preflight/defaults/main.yml:10`).
2. Con el flag activo, el rol ejecuta
   `docker buildx imagetools inspect --format '{{json .Manifest}}'` sobre la
   etiqueta seguida y pasa esa salida por `scripts/resolve-tracked-image.py
   resolve`, que exige un `mediaType` soportado, un `digest`
   `sha256:[a-f0-9]{64}` válido y que la referencia resultante
   (`tracked_reference@digest`) coincida exactamente con
   `approved_runtime_reference`. Si Docker Hub ya movió `latest`, este paso
   falla y el playbook se detiene antes de descargar nada.
3. Tras el `pull`, `scripts/resolve-tracked-image.py verify` comprueba
   además que la imagen local descargada sea `linux/amd64`, tenga un `Id`
   de contenido válido y que su `RepoDigests` contenga exactamente el
   digest resuelto — no basta con que el tag coincida, el contenido
   descargado debe demostrarlo.
4. **`workloads`** (`ansible/roles/workloads/tasks/derive.yml:142-190`)
   vuelve a exigir, de forma independiente, que el mapa
   `image_preflight_tracked_runtime_references` tenga exactamente una clave
   (`tracked_reference`) y que su valor coincida con
   `approved_runtime_reference` antes de derivar
   `workloads_images.portfolio_alberto` — salvo en
   `render-workloads.yml`, que fija `workloads_render_only: true` y usa
   directamente `tracked_reference` sin tocar el registro (renderizado
   local, sin mutación).

## Actualizar la imagen: procedimiento resumido

Detalle completo, con comandos exactos y checklist, en
`docs/ACTUALIZACIONES_IMAGENES.md` del repositorio fuente. Resumen:

1. Inspecciona el digest actual de la etiqueta con
   `docker buildx imagetools inspect` sin descargar la imagen.
2. Revisa el cambio de la aplicación (repositorio de origen, dependencias,
   notas de seguridad) — juicio humano, ningún script lo sustituye.
3. En `config/workload-image-updates.yml`, reemplaza únicamente el digest
   de `approved_runtime_reference`, conservando el prefijo exacto. No
   cambies `tracked_reference`, el servicio, el componente ni el digest
   histórico de `config/services.yml`.
4. Documenta el motivo y el digest nuevo en `CHANGELOG.md`, bajo
   `[Unreleased]`.
5. Ejecuta `./scripts/bootstrap-tooling.sh`, `./scripts/validate-iac.sh` y
   `./scripts/lint.sh` en ese orden.
6. Revisa el diff, crea el commit y abre PR.
7. Tras el merge, ejecuta primero el dry-run
   (`./scripts/deploy-ansible.sh --playbook workloads --check
   --ask-become-pass`). Si Docker Hub ya movió `latest`, falla; vuelve al
   paso 1.
8. Solo después de revisar ese resultado, aplica manualmente
   (`./scripts/deploy-ansible.sh --playbook workloads
   --confirm-production --ask-become-pass`).
9. Verifica el servicio, réplicas, ruta HTTPS, logs y alertas; repite el
   playbook para confirmar que un segundo apply converge sin cambios.

## Qué no automatizar

Ningún cron, webhook ni watcher de Docker Hub puede disparar un despliegue:
`docs/ACTUALIZACIONES_IMAGENES.md:117-120` lo prohíbe explícitamente. La
etiqueta seguida solo sirve para detectar si el contenido aprobado sigue
disponible; la autorización real es siempre el digest versionado y revisado
en Git. Tampoco se modifica `config/services.yml` para esquivar el
contrato: ese catálogo pertenece a la evidencia de migración, separado a
propósito de la excepción operativa.

## TODO: verificar

- Si `ansible/playbooks/observability.yml` y `ansible/playbooks/edge.yml`
  (ambos listados como modificados en el commit `f91c6e9`) tocan algo
  relacionado con esta excepción o son cambios independientes en el mismo
  commit: esta extracción no leyó su diff completo línea a línea.
- Si `config/host-security.yml` (también modificado en `f91c6e9`) está
  relacionado con este cambio o es un cambio no relacionado incluido en el
  mismo commit.

## Referencias

- [`docs/ACTUALIZACIONES_IMAGENES.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/ACTUALIZACIONES_IMAGENES.md)
- [`config/workload-image-updates.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/workload-image-updates.yml)
- [`scripts/resolve-tracked-image.py`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/scripts/resolve-tracked-image.py)
- [Catálogo de servicios aprobados](../catalogo-servicios/)
- PR [`apptolast/DockerSwarmInfrastrcture#21`](https://github.com/apptolast/DockerSwarmInfrastrcture/pull/21)
