---
title: "Catálogo de servicios aprobados"
type: service
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture docs/SERVICE_CATALOG.md y config/services.yml, commit 45249ebb; excepción tracked-tag re-verificada contra config/workload-image-updates.yml, commit f91c6e9 (2026-08-20)"
last-verified: 2026-08-20
tags:
  - swarm
  - servicios
  - migracion
  - catalogo
status: stable
superseded-by: null
depends-on:
  - "policy:compuertas-abiertas"
used-by: []
related-runbooks:
  - "runbook:actualizacion-imagen-alberto"
related-dashboards: []
related-alerts: []
see-also:
  - "architecture:introduccion"
  - "infrastructure:estado-observado"
  - "policy:compuertas-abiertas"
  - "runbook:actualizacion-imagen-alberto"
sidebar:
  order: 5
---

# Catálogo de servicios aprobados

## Resumen

`config/services.yml` de `DockerSwarmInfrastrcture` es el contrato de alcance
de la migración: define qué cargas pueden llegar a la plataforma, cuáles
quedan fuera, y qué datos, hostnames, puertos e imágenes se conocen de cada
una. Por sí solo no autoriza un despliegue, una restauración, la apertura de
firewall ni un cambio DNS — es un catálogo, no una orden de ejecución. La
evidencia de origen procede de una auditoría de `MigracionNetCup` fechada el
2026-07-23.

## Semántica del contrato

- `images[].reference`, `ports[].target` y `datasets[].target_path` describen
  siempre el objetivo Docker Swarm; `source_reference`, `source_target` y
  `source_path` (cuando aparecen) describen solo la evidencia de origen y
  nunca deben alimentar el stack objetivo.
- `published: null` significa que el puerto no se publica en el host.
  `exposure: edge` significa que Traefik alcanza el puerto en una red
  interna; `exposure: internal` impide su publicación y `loopback` exige
  bind local.
- `migration: restore-state` restaura datos heredados; `migration: redeploy`
  recupera la imagen o el código sin estado runtime propio;
  `migration: clean-install` crea estado vacío (único modo permitido para
  `openclaw-clean`).

## Servicios aprobados

<!-- markdownlint-disable MD013 -->

| ID | Estrategia | Hostname | Puerto objetivo | Datos confirmados |
| --- | --- | --- | --- | --- |
| `kropia` | Redeploy | `kropia.apptolast.com` | Edge `80/TCP` | Imagen y snapshot Git |
| `traefik-edge` | Restore | `edge.apptolast.com` | `8000→80`, `8443→443`; `8080/8082` internos | ACME; rutas reconstruidas |
| `minecraft-stats` | Redeploy | `minecraft-stats.apptolast.com` | Edge `8080/TCP` | Mundo Minecraft en solo lectura |
| `minecraft` | Restore | Ninguno confirmado | Público `25565/TCP` | Unos 3,3 GB, mods y tres mundos |
| `n8n` | Restore | `n8n.apptolast.com` | Edge `5678/TCP` | PostgreSQL, home y clave runtime |
| `openclaw-clean` | Instalación limpia | `openclaw.apptolast.com` | Edge `18789/TCP` | Home vacío; estado legado prohibido |
| `passbolt` | Restore | `passbolt.apptolast.com` | Edge `80/TCP` | PostgreSQL y claves GPG/JWT |
| `personal-website-alberto` | Redeploy | `albertohidalgo.apptolast.com` | Edge `3000/TCP` | Imagen y snapshot Git |
| `personal-website-pablo` | Redeploy | `pablohurtadohg.apptolast.com` | Edge `3000/TCP` | Imagen y working tree capturado |
| `shlink` | Restore | `generadorcodigosqr.apptolast.com` | Edge `8080/TCP` | PostgreSQL |

<!-- markdownlint-enable MD013 -->

La auditoría de origen restauró 46 workflows y 35 credenciales de n8n, y
confirmó unos 3,76 GB de PostgreSQL y unos 72 MB en su home. Esas cifras son
criterios de reconciliación, no límites del esquema.

`25565/TCP` (Minecraft) forma parte del alcance aprobado, pero sigue sujeto a
restauración, prueba, y a una decisión explícita sobre `online-mode=false`
antes de cambiar `platform_minecraft_public_enabled` y abrir firewall/DNS
(ver [Compuertas abiertas](../compuertas-abiertas/)). El hostname de Traefik
expone únicamente el health endpoint versionado (`/ping`); no autoriza un
dashboard público.

## Exclusiones explícitas

Cada regla denegada tiene un ID canónico y, cuando procede, aliases
observados:

- `inern-seller` (alias `inemsellar`), `menus-admin` (alias `menus-dev`),
  `cattle` (alias `rancher`), `mcp-fullstack` (alias compuesto
  `cyberlab/platform`), `uptime-kuma` (alias `kuma`).
- `uptime-kuma` no procede de la auditoría original: es una exclusión
  añadida el 2026-07-27 tras confirmar con el propietario que
  `kuma.apptolast.com` (un Uptime Kuma legacy) no se migra ni se recrea en
  la plataforma nueva.
- Demás exclusiones canónicas: `greenhouse`, `hermes`, `invernaderos-api`,
  `whoop`, `vpn`, `cluster-ops`, `redisinsight`, `ficsit-monitor`, `gibbon`,
  `health-dashboard`, `keel`, `kube-system`, `langflow`, `longhorn-system`,
  `metal`, `monitoring-dozzle`, `openclaw-legacy`.

Añadir una carga denegada a un stack, aunque su imagen exista o su namespace
aparezca en un backup, es un cambio de alcance y requiere modificar
`config/services.yml` de forma explícita.

## Excepción operativa: tracked-tag de `personal-website-alberto`

Desde el commit `f91c6e9` (2026-08-20, PR
[`#21`](https://github.com/apptolast/DockerSwarmInfrastrcture/pull/21)),
`personal-website-alberto` sigue conservando su digest histórico en este
catálogo, pero es el único servicio con permiso para actualizarse siguiendo
la etiqueta mutable `docker.io/hgarciaalberto/personal-website:latest` bajo
un contrato separado (`config/workload-image-updates.yml`,
`update_policy: tracked-tag`) que exige revisión humana del digest antes de
cada actualización y falla en seco si el registro remoto ya no coincide con
lo aprobado. Ningún otro servicio del catálogo tiene esta excepción; todos
los demás siguen fijados por digest sin tag mutable alguno. Detalle completo
en [Runbook: la excepción tracked-tag de la imagen de Alberto](../actualizacion-imagen-alberto/).

## Observabilidad interna

Prometheus, Alertmanager, Blackbox Exporter, Loki, Alloy, Grafana, Node
Exporter, cAdvisor, PostgreSQL Exporter y Redis Exporter son componentes
nuevos de plataforma, no servicios heredados ni datos a migrar. El catálogo
fija sus imágenes por digest; ningún puerto de observabilidad se publica en
el host y no existe hostname público para Grafana ni para ningún otro
componente de observabilidad. Sus rutas persistentes se crean vacías bajo
`/srv/dockerswarm/observability`.

## Validación

```bash
.venv/bin/python scripts/validate-services.py
.venv/bin/python scripts/validate-services.py --self-test
```

El validador rechaza, entre otras cosas: claves de esquema inesperadas o
ausentes, IDs/hostnames/puertos/datasets duplicados, solapamientos entre
servicios aprobados y denegados, imágenes sin `@sha256:<64 hex>`, cualquier
importación de estado legado en `openclaw-clean`, y divergencias con el
state root, los puertos públicos, el hostname o la imagen target de Traefik
declarados en las fuentes actuales de plataforma.

## Histórico relevante

- 2026-07-23 — Auditoría de `MigracionNetCup` que produjo la evidencia de
  origen del catálogo.
- 2026-07-27 — Exclusión `uptime-kuma` añadida tras decisión explícita del
  propietario.
- 2026-07-30 — Esta página creada, verificada contra el commit `45249ebb`
  de `DockerSwarmInfrastrcture`.
- 2026-08-20 — Documentada la excepción operativa `tracked-tag` de
  `personal-website-alberto`, introducida en el commit `f91c6e9`
  (PR [`#21`](https://github.com/apptolast/DockerSwarmInfrastrcture/pull/21)).

## Referencias

- [`docs/SERVICE_CATALOG.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/SERVICE_CATALOG.md)
- [`config/services.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/services.yml)
