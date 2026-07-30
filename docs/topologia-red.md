---
title: "Topología de red y aislamiento de edge"
type: network
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture docs/ARCHITECTURE.md secciones 'Contrato compartido', 'Topología' y 'Aislamiento de red y edge'; config/platform.yml, commit 45249ebb"
last-verified: 2026-07-30
tags:
  - swarm
  - red
  - traefik
  - arquitectura
  - seguridad
status: stable
superseded-by: null
depends-on:
  - "service:catalogo-servicios"
used-by: []
related-runbooks: []
related-dashboards: []
related-alerts: []
see-also:
  - "architecture:introduccion"
  - "infrastructure:estado-observado"
  - "architecture:agentes-operadores"
  - "service:catalogo-servicios"
sidebar_position: 7
---

# Topología de red y aislamiento de edge

## Resumen

`DockerSwarmInfrastrcture` gobierna un único nodo Docker Swarm
manager/worker, con un contrato de red y edge declarado en
`config/platform.yml` y aplicado mediante Ansible/Traefik. Esta página
documenta el contrato y los invariantes de topología y aislamiento tal como
están codificados en el repositorio fuente — no el estado aplicado en un
momento dado (para eso, ver [Estado observado](./estado-observado.md), que
ya sustituye la instantánea de "Estado aplicado actual" de 26 de julio de
2026 de `docs/ARCHITECTURE.md` por la más reciente de
`docs/DEPLOYMENT_STATUS.md`).

## Contrato compartido (`config/platform.yml`)

{/* markdownlint-disable MD013 */}

| Campo | Valor |
| --- | --- |
| Entorno/release | `production`, `0.1.0` no aceptada |
| IPv4 nueva/legacy | `159.195.156.57`, `138.199.157.58` |
| Interfaz pública | `eth0` |
| Swarm | `10.0.0.0/8`, subredes `/24`, data path `4789/UDP` |
| Instalación/estado | `/opt/dockerswarm`, `/srv/dockerswarm` |
| TCP contractual | `80`, `443`, `25565` |
| Gate Minecraft | `true` |
| Zona | `apptolast.com` |

{/* markdownlint-enable MD013 */}

`25565` (Minecraft) está en la allowlist coherente de las tres capas
(Terraform, Ansible, catálogo). El gate explícito
`platform_minecraft_public_enabled` es `true` desde el commit
`08cace61` ("feat: publish minecraft behind an explicit offline-mode
acceptance", 2026-07-28), acompañado de
`platform_minecraft_offline_public_accepted: true` — una aceptación
explícita, codificada y auditable del riesgo de exponer
`online_mode: false` (`config/minecraft.yml`), según el propio comentario
de `config/platform.yml`, no una activación implícita. Que el gate
declarado esté abierto no implica por sí solo que el estado aplicado en
`159.195.156.57` ya publique el puerto; para eso ver
[Estado observado](./estado-observado.md).

Invariantes declarados: ningún secreto entra en Git; un recurso tiene un
único writer; import/adopción precede a cualquier cambio de recurso
existente; servicio, datos, DNS y rollback se aceptan como una unidad;
estado declarado y estado aplicado se informan por separado.

## Topología

Existe un único nodo manager/worker: tolera cero fallos del manager y no
ofrece alta disponibilidad. Traefik corre con una réplica, restringida al
nodo etiquetado, y publica `80/443` en modo host; su estrategia de
actualización `stop-first` puede causar una interrupción breve durante un
despliegue.

Antes de añadir nodos al clúster se necesitan, como mínimo: red privada
autenticada, número impar de managers en dominios de fallo distintos,
capacidad/almacenamiento compatibles, y pruebas de quorum — ninguno de
estos prerrequisitos está resuelto hoy.

Los puertos de control de Swarm — `2377/TCP`, `7946/TCP+UDP` y `4789/UDP` —
no se publican en Internet. Netcup, UFW y la cadena `DOCKER-USER` forman la
frontera pública del host.

## Aislamiento de red y edge

Traefik **no monta el socket Docker** y no activa el provider Swarm: usa el
file provider con Configs inmutables, de modo que ningún servicio queda
publicado automáticamente por añadir labels a su definición.

En vez de una overlay compartida, el contrato crea:

- una overlay cifrada y no "attachable" por workload HTTP;
- `apptolast-edge-monitoring`, dedicada a observabilidad;
- ninguna conexión lateral entre workloads salvo dependencias declaradas
  explícitamente.

La configuración dinámica de Traefik declara exactamente estas rutas:
`/ping` de `edge.apptolast.com`, Kropia, Minecraft Stats, n8n, OpenClaw
limpio, Passbolt, el portfolio de Pablo, el portfolio de Alberto, y Shlink
(ver [Catálogo de servicios](./catalogo-servicios.md) para el detalle de
cada uno). Minecraft no pasa por Traefik en ningún caso; su publicación TCP
directa sigue desactivada por el gate descrito arriba.

## Histórico relevante

- 2026-07-30 — Esta página creada, verificada contra las secciones
  "Contrato compartido", "Topología" y "Aislamiento de red y edge" de
  `docs/ARCHITECTURE.md` en el commit `45249ebb` de
  `DockerSwarmInfrastrcture`. La sección "Estado aplicado actual" de ese
  mismo fichero (fechada 26 de julio de 2026) queda deliberadamente fuera
  de esta página por estar superada por `docs/DEPLOYMENT_STATUS.md`, ya
  documentado en [Estado observado](./estado-observado.md).

## Referencias

- [`docs/ARCHITECTURE.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/ARCHITECTURE.md)
- [`config/platform.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/platform.yml)
