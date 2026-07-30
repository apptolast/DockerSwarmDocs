---
title: "Compuertas externas abiertas y STOP gates"
type: policy
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture README.md sección 'Compuertas externas abiertas' y CLAUDE.md sección 'Open STOP gates', re-verificado en commit 45249ebb"
last-verified: 2026-07-30
tags:
  - seguridad
  - dns
  - terraform
  - backup
  - politica
status: stable
superseded-by: null
depends-on: []
used-by: []
related-runbooks: []
related-dashboards: []
related-alerts: []
see-also:
  - "architecture:introduccion"
  - "infrastructure:estado-observado"
  - "architecture:agentes-operadores"
sidebar_position: 3
---

# Compuertas externas abiertas y STOP gates

## Resumen

`DockerSwarmInfrastrcture` es "fail-closed": mientras estas condiciones
externas no se cumplan, ciertos pasos productivos concretos quedan
bloqueados por diseño, y ningún script del repo acepta un valor inventado,
una credencial fabricada ni un flag de bypass para saltárselos. Esta página
resume esas compuertas tal y como están documentadas en el repo fuente; no
las reinterpreta ni las relaja.

## Contexto

El propio repositorio lo dice sin margen de ambigüedad (`README.md`):

> No se debe sustituir ninguna de estas entradas por valores inventados ni
> desactivar los gates para obtener una ejecución verde.

Y (`CLAUDE.md`, sobre las mismas compuertas):

> None of these gates may be satisfied by inventing values, hardcoding a
> credential, or adding a bypass flag. If a task seems to require passing
> one of these gates, stop and surface that to the user rather than working
> around it.

`CLAUDE.md` advierte además que su propia lista "debe re-verificarse contra
el `README.md`, `docs/TERRAFORM_STATE.md` y `docs/MIGRATION.md` actuales
antes de tratarse como vigente — las compuertas se cierran con el tiempo".
La lista siguiente es la versión de `CLAUDE.md` (más detallada, fechada
2026-07-27), que en algunos puntos ya incorpora avances no reflejados todavía
en el listado más breve de `README.md`.

## Compuertas abiertas (estado a 2026-07-27)

- **Backend de state remoto (R2)**: hacen falta dos backends R2
  independientes, con credenciales separadas, prueba de locking en vivo y
  snapshots cifrados.
- **Identidades de firma**: hacen falta identidades/firmas reales para
  planes y pruebas de locking, mantenidas fuera de git.
- **Token Cloudflare Terraform / credencial ACME**: el 2026-07-27 se
  aprovisionó un token Cloudflare para Terraform con scope `Zone:DNS`
  confirmado contra la API real de Cloudflare para la zona
  `apptolast.com`, guardado fuera de git en
  `/etc/dockerswarm/terraform/dns-zone-api-token.txt`. Su token ID
  (`185f75d78a7b79a5b1d41e595fdaf90f`, confirmado vía
  `/user/tokens/verify`) es el mismo que el Docker Secret
  `cloudflare_dns_api_token_v2` ya registrado
  (ver `docs/EDGE.md`, "Registro de secrets instalados"): es la misma
  credencial ACME/Traefik reutilizada para Terraform por decisión explícita
  del propietario, no una credencial nueva. La rotación de la credencial
  ACME originalmente solicitada sigue abierta y es independiente de esta
  reutilización.
- **Credenciales Netcup**: hacen falta credenciales reales de SCP/import de
  Netcup si se activa ese root de Terraform.
- **Custodio externo de la unlock key**: hace falta un custodio externo
  antes de activar el autolock del Swarm.
- **Aceptación OAuth/negocio de n8n**: pendiente de aceptación explícita.
- **Decisión sobre Minecraft**: pendiente una decisión explícita sobre
  `online-mode=false` antes de publicar el servicio.
- **Snapshot de migración**: hace falta prueba de que el snapshot staged es
  final, o un refresh/promoción versionado vía
  `migration/scripts/promote_runtime_generation.py`, antes de arrancar
  workloads.
- **Cutover DNS a la IP de plataforma**: distinto de las anteriores, esta
  compuerta no se desbloquea aportando ninguna credencial. `terraform-safety.py`
  rechaza de forma incondicional cualquier create/cambio de un registro
  Cloudflare hacia la IP de plataforma. El 2026-07-27 se añadió el
  coordinador de "host-readiness" firmado que esta compuerta necesitaba
  (`scripts/host-readiness-probe.sh` y la cadena de verificación en
  `scripts/terraform-safety.py`), y `plan-terraform.sh`/`apply-terraform.sh`
  ya aceptan su prueba vía `--host-readiness`. La ausencia de esa prueba, o
  una prueba para el hostname equivocado, sigue fallando igual que antes. El
  coordinador **nunca se ha ejecutado contra la plataforma real y no ha
  habido cutover** — eso sigue siendo una decisión deliberada y separada que
  exige que la plataforma esté realmente lista (Traefik/ACME desplegados y
  sirviendo) más el visto bueno explícito del propietario del repositorio,
  no solo la existencia del código.

## Diferencia con el listado de `README.md`

El listado de `README.md` ("Compuertas externas abiertas") es una versión
anterior y más breve: menciona "token Cloudflare Terraform separado y
credencial ACME rotada" como una única compuerta pendiente, sin el matiz
—añadido después, según `CLAUDE.md`— de que el token Cloudflare ya se
aprovisionó reutilizando la credencial ACME/Traefik existente, dejando solo
la rotación ACME como pendiente real. Por eso esta página usa `CLAUDE.md`
(fechado 2026-07-27) como fuente principal, citando expresamente los dos
documentos.

## Cuándo escalar

Si una tarea parece requerir cruzar cualquiera de estas compuertas —incluida
la de cutover DNS—, la actuación correcta (documentada en el propio repo
fuente, ver [Agentes operadores](./agentes-operadores.md)) es parar y
reportarlo explícitamente al propietario, nunca inventar un valor, una
credencial o un flag de bypass para forzar una ejecución en verde.

## Histórico relevante

- 2026-07-26 — `README.md` documenta las compuertas externas abiertas.
- 2026-07-27 — Token Cloudflare Terraform aprovisionado por reutilización de
  credencial; coordinador de host-readiness añadido para el gate de cutover
  DNS. `CLAUDE.md` documenta el listado actualizado de "Open STOP gates".
- 2026-07-28 — Esta página creada, citando ambas fuentes.
- 2026-07-30 — Re-verificada contra el commit `45249ebb` de
  `DockerSwarmInfrastrcture`: el listado de "Open STOP gates" de
  `CLAUDE.md` y la sección "Compuertas externas abiertas" de `README.md`
  conservan el mismo contenido citado arriba, sin cambios.

## Referencias

- [`README.md`, sección "Compuertas externas abiertas"](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/README.md)
- [`CLAUDE.md`, sección "Open STOP gates"](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/CLAUDE.md)
- [`docs/TERRAFORM_STATE.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/TERRAFORM_STATE.md)
- [`docs/EDGE.md`, "Registro de secrets instalados"](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/EDGE.md)
