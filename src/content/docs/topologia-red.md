---
title: "Topología de red y aislamiento de edge"
type: network
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture docs/ARCHITECTURE.md secciones 'Contrato compartido', 'Topología' y 'Aislamiento de red y edge'; config/platform.yml, commit 45249ebb; ansible/roles/host_baseline/defaults/main.yml, ansible/roles/host_baseline/tasks/crowdsec-docker.yml, ansible/roles/host_baseline/templates/crowdsec-ipset-ready.sh.j2, ansible/roles/host_baseline/templates/docker-firewall-crowdsec.conf.j2, ansible/roles/platform/files/dockerswarm-docker-firewall.service, tests/test_crowdsec_ipset_ready.py, commits 501e6ea y 54cb10a"
last-verified: 2026-09-14
tags:
  - swarm
  - red
  - traefik
  - arquitectura
  - seguridad
  - crowdsec
status: stable
superseded-by: null
depends-on:
  - "service:catalogo-servicios"
used-by:
  - "service:organizationweb"
related-runbooks: []
related-dashboards: []
related-alerts: []
see-also:
  - "architecture:introduccion"
  - "infrastructure:estado-observado"
  - "architecture:agentes-operadores"
  - "service:catalogo-servicios"
  - "service:organizationweb"
sidebar:
  order: 7
---

# Topología de red y aislamiento de edge

## Resumen

`DockerSwarmInfrastrcture` gobierna un único nodo Docker Swarm
manager/worker, con un contrato de red y edge declarado en
`config/platform.yml` y aplicado mediante Ansible/Traefik. Esta página
documenta el contrato y los invariantes de topología y aislamiento tal como
están codificados en el repositorio fuente — no el estado aplicado en un
momento dado (para eso, ver [Estado observado](../estado-observado/), que
ya sustituye la instantánea de "Estado aplicado actual" de 26 de julio de
2026 de `docs/ARCHITECTURE.md` por la más reciente de
`docs/DEPLOYMENT_STATUS.md`).

## Contrato compartido (`config/platform.yml`)

<!-- markdownlint-disable MD013 -->

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

<!-- markdownlint-enable MD013 -->

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
[Estado observado](../estado-observado/).

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
(ver [Catálogo de servicios](../catalogo-servicios/) para el detalle de
cada uno). Minecraft no pasa por Traefik en ningún caso; su publicación TCP
directa sigue desactivada por el gate descrito arriba.

## Red edge dedicada para OrganizationWeb

Fuera del contrato de `config/platform.yml` descrito arriba,
`config/organizationweb.yml` declara una red overlay edge propia,
`apptolast-edge-organizationweb`, cifrada y no attachable, igual en
naturaleza a las demás redes aisladas por workload. Según
`docs/ORGANIZATIONWEB.md`, el playbook `edge` crea únicamente esa red
adicional y un router file-provider para `organizacion.apptolast.com`,
conservando los ocho routers y redes legacy existentes y los Configs
anteriores de Traefik para rollback; `organizationweb` necesita esa red
creada antes de su propio `--check`. Por separado, el stack `autoupdater`
(ver [Actualización automática por canales de imagen](../automatizacion-imagenes/))
usa su propia red overlay no attachable, para que el vigilante Shepherd
salga a Docker Hub sin compartir red con ningún workload HTTP.

## Orden de arranque: CrowdSec antes que el firewall de Docker

El rol `host_baseline` instala en `dockerswarm-docker-firewall.service`
(descrito arriba) un *drop-in* systemd
(`/etc/systemd/system/dockerswarm-docker-firewall.service.d/20-crowdsec-order.conf`,
plantilla `docker-firewall-crowdsec.conf.j2`) con dos hooks en orden fijo:

1. `ExecStartPre` ejecuta un script nuevo
   (`host_baseline_crowdsec_ipset_wait_script`, instalado en
   `/usr/local/sbin/dockerswarm-wait-for-crowdsec-ipsets` desde la
   plantilla `crowdsec-ipset-ready.sh.j2`) que sondea `ipset list -n` cada
   segundo hasta encontrar al menos un ipset `crowdsec-blacklists-<N>`
   (IPv4) y uno `crowdsec6-blacklists-<N>` (IPv6), o agota un timeout
   configurable (`host_baseline_crowdsec_ipset_wait_timeout_seconds`,
   90 segundos por defecto) y sale con error.
2. `ExecStartPost` ejecuta el script ya existente que ordena las reglas
   CrowdSec/Docker (`host_baseline_crowdsec_order_script`).

El propio drop-in añade `CapabilityBoundingSet=CAP_NET_RAW` a la unidad.
El objetivo declarado por el mensaje del commit que introdujo el script de
espera ("Wait for CrowdSec ipsets before Docker firewall") es evitar que
el firewall de Docker quede activo antes de que existan los ipsets que
CrowdSec usa para bloquear IPs, cerrando una ventana de arranque sin ese
filtrado — el mecanismo concreto (el propio script y su timeout) está
verificado contra el fichero fuente; la existencia de esa ventana de
riesgo en producción antes del cambio es una lectura del mensaje del
commit, no una medición directa: TODO: verificar con un log de arranque
real si esa ventana llegó a manifestarse.

Por separado, la propia unidad `dockerswarm-docker-firewall.service`
(rol `platform`) pasó a declarar `Requires=docker.service`,
`PartOf=docker.service` y `WantedBy=docker.service`, además de
`After=docker.service network-online.target
crowdsec-firewall-bouncer.service` — es decir, el firewall de Docker
queda atado al ciclo de vida de `docker.service` en vez de administrarse
como unidad independiente. Sigue siendo `Type=oneshot` con
`RemainAfterExit=yes` y conserva `CapabilityBoundingSet=CAP_NET_ADMIN
CAP_NET_RAW`.

`tests/test_crowdsec_ipset_ready.py` (nuevo) verifica, contra las
plantillas renderizadas y la unidad literal: que el script de espera
acepta cuando existen ambas familias de ipsets, que falla con el mensaje
esperado si falta la familia IPv6, que el `ExecStartPre` del drop-in
precede siempre a su `ExecStartPost`, y que tanto la unidad como el
drop-in conservan sus capacidades declaradas.

## Histórico relevante

- 2026-07-30 — Esta página creada, verificada contra las secciones
  "Contrato compartido", "Topología" y "Aislamiento de red y edge" de
  `docs/ARCHITECTURE.md` en el commit `45249ebb` de
  `DockerSwarmInfrastrcture`. La sección "Estado aplicado actual" de ese
  mismo fichero (fechada 26 de julio de 2026) queda deliberadamente fuera
  de esta página por estar superada por `docs/DEPLOYMENT_STATUS.md`, ya
  documentado en [Estado observado](../estado-observado/).
- 2026-07-30 — Añadida la sección "Orden de arranque: CrowdSec antes que
  el firewall de Docker", verificada contra los commits `501e6ea` ("Wait
  for CrowdSec ipsets before Docker firewall") y `54cb10a` ("Enable Docker
  firewall with Docker service") de `DockerSwarmInfrastrcture`.
- 2026-09-14 — Añadida la sección "Red edge dedicada para
  OrganizationWeb", verificada contra `config/organizationweb.yml` y
  `docs/ORGANIZATIONWEB.md` (commit `5ba4f11`), y la mención de la red
  propia del stack `autoupdater`.

## Referencias

- [`docs/ARCHITECTURE.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/ARCHITECTURE.md)
- [`config/platform.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/platform.yml)
- [`ansible/roles/host_baseline/tasks/crowdsec-docker.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/ansible/roles/host_baseline/tasks/crowdsec-docker.yml)
- [`ansible/roles/host_baseline/templates/crowdsec-ipset-ready.sh.j2`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/ansible/roles/host_baseline/templates/crowdsec-ipset-ready.sh.j2)
- [`ansible/roles/platform/files/dockerswarm-docker-firewall.service`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/ansible/roles/platform/files/dockerswarm-docker-firewall.service)
- [`docs/ORGANIZATIONWEB.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/ORGANIZATIONWEB.md)
- [`config/organizationweb.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/config/organizationweb.yml)
