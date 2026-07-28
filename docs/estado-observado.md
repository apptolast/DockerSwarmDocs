---
title: "Estado observado del servidor Swarm"
type: infrastructure
owner: PabloHurtadoGonzalo86
source-of-truth: "docker node ls; docker service ls (ejecutados en 159.195.156.57); apptolast/DockerSwarmInfrastrcture README.md sección 'Estado observado' y docs/DEPLOYMENT_STATUS.md"
last-verified: 2026-07-28
tags:
  - swarm
  - estado
  - observabilidad
  - seguridad
status: stable
superseded-by: null
depends-on: []
used-by: []
related-runbooks: []
related-dashboards: []
related-alerts: []
see-also:
  - "architecture:introduccion"
  - "policy:compuertas-abiertas"
sidebar_position: 2
---

# Estado observado del servidor Swarm

## Resumen

Instantánea del estado real (no del código previsto) del servidor Swarm de
`apptolast`. Existen dos instantáneas verificables en el repositorio fuente,
con fechas distintas, y la más reciente **sustituye explícitamente** a la
anterior — se documentan ambas aquí, con su fecha y su fuente, en vez de
mezclarlas en un único relato.

## Instantánea vigente — 28 de julio de 2026

Fuente: [`docs/DEPLOYMENT_STATUS.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/DEPLOYMENT_STATUS.md)
de `DockerSwarmInfrastrcture`, que dice explícitamente: "Sustituye a la
sección «Estado observado» de `README.md`, que describe el host antes del
primer despliegue real de este árbol."

Aplicado y verificado sobre `159.195.156.57`:

- Playbook `platform`: `ok=156 changed=18 failed=0`.
- Playbook `edge` con perfil `acme-staging`: `ok=71 failed=0`.
- Playbook `edge` con perfil `production`: `ok=72 changed=6 failed=0`.
- Certificados: 9 de 9 emitidos por Let's Encrypt producción.
- Servicios Swarm: 11 de 16 en estado `1/1`.
- Los nueve nombres del catálogo resuelven por HTTPS con cadena verificada
  desde Internet; `n8n`, `pablohurtadohg` y `albertohidalgo` sirven tráfico
  real.
- El nodo declara las etiquetas `platform.edge` y `platform.workloads`,
  existen nueve redes overlay aisladas, UFW mantiene trece reglas de egress
  más `80/tcp` y `443/tcp` de ingress, y `22/tcp` conserva su límite de tasa.

Pendiente, según la misma fuente:

- `kropia` no converge: necesita recuperar `CHOWN`, `SETGID`, `SETUID` y
  `NET_BIND_SERVICE` tras `cap_drop: ALL`; el arreglo está commiteado pero
  **no se ha aplicado todavía** por un bloqueo circular (ver más abajo).
- `minecraft-stats` y `passbolt` arrancan y Swarm los detiene por
  healthcheck; necesitan más margen de arranque, no una corrección de
  código.
- `shlink` pierde sus workers de RoadRunner (`WorkerAllocate: EOF`); causa
  sin confirmar.
- `openclaw` espera su alta inicial (`Missing config. Run 'openclaw
  setup'`), tal y como lo declara el catálogo.
- Bloqueo circular al redesplegar `workloads`: falla en «Inspect every
  running or stopped Docker container» porque los servicios en bucle de
  reinicio destruyen contenedores entre el listado y la inspección.
- El backup permanece bloqueado (custodio externo de la unlock key y bucket
  R2 con credencial propia pendientes); ver
  [Compuertas abiertas](./compuertas-abiertas.md).
- **No debe ejecutarse Terraform contra el root `cloudflare/apptolast-dns`**:
  en modo `initialize` fuerza `adoption_only=true`, lo que devolvería los
  nueve registros A a `138.199.157.58` (un servidor que ya no existe),
  porque los registros apuntan hoy a la plataforma por un cambio manual en
  Cloudflare aún no adoptado en `imports.tf`.

## Instantánea anterior (superada) — 26 de julio de 2026

Fuente: `README.md` de `DockerSwarmInfrastrcture`, sección "Estado
observado", tal y como estaba antes del primer despliegue productivo real:

- Docker Swarm activo en `159.195.156.57` con un único manager/worker,
  `Ready`, `Active` y `Leader`.
- El Swarm usa `10.0.0.0/8`, subredes `/24` y data path
  `159.195.156.57:4789`; autolock desactivado.
- No había stacks ni servicios persistentes desplegados; solo existía la red
  `ingress` y el nodo aún no tenía la label `platform.edge`.
- Los datos de migración estaban materializados bajo `/srv/dockerswarm`, con
  acceso root, sin workload usándolos todavía.
- Existía el Docker Secret `cloudflare_dns_api_token_v1`, expuesto fuera del
  gestor previsto y pendiente de rotación.
- Los registros públicos seguían apuntando al servidor anterior
  (`138.199.157.58`); no se había ejecutado el cutover.
- n8n estaba restaurado con sus workflows sin publicar.
- Minecraft conservaba `online-mode=false`, con DNS/firewall/publicación de
  `25565/TCP` bloqueados.

## Comando de verificación en vivo

`docker node ls` y `docker service ls`, ejecutados directamente en
`159.195.156.57`, son la fuente de verdad operativa instantánea citada por
esta página. Esta página en sí no ejecuta esos comandos automáticamente: es
una instantánea manual verificada contra los ficheros Markdown del repo
fuente en la fecha indicada en `last-verified`.

## Histórico relevante

- 2026-07-26 — Estado documentado en `README.md` ("Estado observado"),
  previo al primer despliegue productivo.
- 2026-07-28 — `docs/DEPLOYMENT_STATUS.md` sustituye a esa sección tras el
  primer despliegue productivo real.
- 2026-07-28 — Esta página creada, citando ambas instantáneas.

## Referencias

- [`README.md`, sección "Estado observado"](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/README.md)
- [`docs/DEPLOYMENT_STATUS.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/DEPLOYMENT_STATUS.md)
- [`docs/BACKUP_RECOVERY.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/BACKUP_RECOVERY.md)
