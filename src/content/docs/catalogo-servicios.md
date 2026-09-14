---
title: "Catálogo de servicios aprobados"
type: service
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture docs/SERVICE_CATALOG.md y config/services.yml, commit 45249ebb; sección 'Fuera de alcance de este catálogo': docs/SERVICE_CATALOG.md (cambiado en 2bb9a39), config/organizationweb.yml, config/image-channels.yml, docs/ORGANIZATIONWEB.md y docs/AUTOUPDATE.md, commit 44469bf"
last-verified: 2026-09-14
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
related-runbooks: []
related-dashboards: []
related-alerts: []
see-also:
  - "architecture:introduccion"
  - "infrastructure:estado-observado"
  - "policy:compuertas-abiertas"
  - "service:organizationweb"
  - "infrastructure:automatizacion-imagenes"
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

## Fuera de alcance de este catálogo

`config/organizationweb.yml` gobierna un stack aparte,
[OrganizationWeb](../organizationweb/), desplegado por primera vez el
2026-09-07 con el catálogo `491e2c2`, que PR29 incorporó a main como
`5607afc` — no forma parte de esta migración ni
de su marcador de restauración, y no se añade a la tabla anterior. El
sistema de actualización automática por canales de imagen
(`config/image-channels.yml`, stack `autoupdater`) tampoco es un servicio
migrado: gobierna qué imagen ejecutan los servicios renderizados por los
stacks `edge`, `workloads`, `organizationweb` y `observability`. Desde el
commit `2bb9a39`, `docs/SERVICE_CATALOG.md` lo describe como un contrato
operativo separado que apunta a cada baseline de este catálogo, de modo que
una actualización de imagen nunca cambia el hash de `config/services.yml`;
ver
[Actualización automática por canales de imagen](../automatizacion-imagenes/).

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
- 2026-09-14 — Añadida la sección "Fuera de alcance de este catálogo",
  enlazando OrganizationWeb y el modelo de canales de imagen; ninguno de
  los dos altera `config/services.yml` ni la tabla de servicios aprobados
  anterior. Sección verificada contra el commit `44469bf`.

## Referencias

- [`docs/SERVICE_CATALOG.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/SERVICE_CATALOG.md)
- [`config/services.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/services.yml)
- [`config/image-channels.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/image-channels.yml)
- [`docs/ORGANIZATIONWEB.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/ORGANIZATIONWEB.md)
