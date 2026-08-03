---
title: "Compuertas externas abiertas y STOP gates"
type: policy
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture README.md sección 'Compuertas externas abiertas' y CLAUDE.md sección 'Open STOP gates', re-verificado en commit 45249ebb; revalidación completa de las nueve compuertas en CLAUDE.md sección 'Open STOP gates (revalidated 2026-08-02)', commit 8a76620"
last-verified: 2026-08-03
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
sidebar:
  order: 3
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

## Revalidación completa — 2 de agosto de 2026

`CLAUDE.md` fue revalidado por completo el 2026-08-02 contra el worktree en
el commit `8a76620` (48 commits después de `d461e13`, el commit que había
dejado el listado anterior desactualizado por construcción). Esta
revalidación numera explícitamente las nueve compuertas, con una etiqueta
por cada una (`OPEN`, `CLOSED` o `PREMISE OBSOLETE`), y advierte además que
**no** debe revalidarse contra `README.md`, `docs/MIGRATION.md`,
`docs/BACKUP_RECOVERY.md` ni `migration/RUNTIME_GENERATION_PROMOTION.md`:
ninguno de esos ficheros se ha tocado desde `63dd546` (2026-07-27) y hoy
contradicen el estado real (por ejemplo, `README.md` sigue afirmando
`platform_minecraft_public_enabled: false` mientras `config/platform.yml`
ya dice `true`).

Dos de las nueve compuertas cambian de estado respecto al listado de
2026-07-27 de la sección anterior — y una de ellas contradice directamente
lo que esta misma página venía afirmando:

1. **Backend de state remoto (R2) — sigue OPEN.** Ya no hace falta
   "credenciales separadas": el propietario autorizó una única credencial
   R2 de cuenta que cubre los tres buckets
   (`infra/terraform/backend-identities.json`, mismo
   `access_key_id_sha256` en los tres roots). Faltan, verificado: el
   fichero real `infra/terraform/snapshot-recipients.json` (solo existe su
   `.example`) y la prueba de locking en vivo contra R2 real.
2. **Identidades de firma — sigue OPEN.** Cuatro registros de confianza
   (`*.allowed-signers`) ya existen con claves `ssh-ed25519` reales y un
   namespace restringido. Faltan, no verificable desde el repo: las claves
   privadas (fuera de git, bajo `/etc/dockerswarm/`) y cualquier firma real
   de plan o de lock-proof observable.
3. **Token Cloudflare Terraform / credencial ACME — sigue OPEN.** Sin
   cambio en la reutilización del token ya documentada. Novedad: la
   condición que el propio repo fijaba para revocar
   `cloudflare_dns_api_token_v1` ("revocar tras verificar `v2` en
   servicio") **ya se cumplió** — 9 de 9 certificados emitidos por Let's
   Encrypt producción (`docs/DEPLOYMENT_STATUS.md`) —, así que solo falta
   la revocación en sí, una acción del propietario en Cloudflare.
4. **Credenciales Netcup — sigue OPEN,** sin cambios de fondo.
5. **Custodio externo de la unlock key — sigue OPEN,** sin cambios de
   fondo; el backup sigue bloqueado por esto (ver
   [Estado observado](../estado-observado/)).
6. **Aceptación OAuth/negocio de n8n — sigue OPEN,** sin cambios de fondo.
   Matiz explícito de la revalidación: que n8n sirva tráfico real no cierra
   esta compuerta — la aceptación pendiente es sobre publicar los 46
   workflows restaurados, no sobre levantar el servicio.
7. **Decisión sobre Minecraft (`online-mode=false`) — pasa a CLOSED,**
   cerrada por el commit `08cace6` (2026-07-28):
   `config/platform.yml` declara `platform_minecraft_offline_public_accepted:
   true` junto con `platform_minecraft_public_enabled: true`. **Esto
   contradice la lista de 2026-07-27 de la sección anterior de esta misma
   página**, que listaba esta decisión como pendiente — y coincide con lo
   que [Topología de red](../topologia-red/) ya documentaba desde su
   creación (2026-07-30) sin que esta página se hubiera actualizado en
   consecuencia. La compuerta en sí no se eliminó: su valor por defecto
   sigue siendo `false` y sigue comprobándose en tres sitios distintos del
   repo; lo que cambió es que el riesgo ya fue aceptado explícitamente.
8. **Snapshot de migración o promoción versionada — sigue OPEN,** y su
   premisa temporal ("antes de arrancar workloads") ya se sobrepasó sin
   cerrarse: `docs/DEPLOYMENT_STATUS.md` registra 11 de 16 servicios Swarm
   en `1/1` desde el 2026-07-28, sin que se documentara ninguna de las dos
   condiciones que exige `docs/MIGRATION.md`. Que los servicios ya estén
   corriendo no cierra esta compuerta.
9. **Cutover DNS a la IP de plataforma — pasa a PREMISE OBSOLETE.** El
   cutover **ya ocurrió**, a mano en Cloudflare, no vía Terraform: el
   commit `08cace6` (2026-07-28) marcó las nueve etiquetas
   `platform_dns_cutover` restantes a `true` (`edge` ya lo estaba), y las
   diez resuelven hoy a `159.195.156.57` (confirmado con
   `dig +short <label>.apptolast.com A` el 2026-07-28); el servidor legado
   `138.199.157.58` fue borrado por el propietario. **Esto también
   contradice la lista de 2026-07-27** de la sección anterior, que
   afirmaba que "no ha habido cutover". Lo que no cambia: el coordinador de
   host-readiness sigue sin ejecutarse nunca contra la plataforma real, y
   `scripts/terraform-safety.py` sigue rechazando sin condiciones cualquier
   cambio Terraform hacia esa IP — de hecho el riesgo se invirtió: ahora es
   Terraform el que, en modo `initialize`, devolvería por error los nueve
   registros no-`edge` al servidor legado ya inexistente, porque
   `imports.tf` no cubre el registro `edge` y el resto de la adopción
   manual en Cloudflare todavía no está reflejada en el árbol.

Ninguna de estas nueve compuertas se satisface inventando un valor,
cableando una credencial o añadiendo un flag de bypass — la revalidación de
2026-08-02 lo repite en los mismos términos que la versión anterior.

## Diferencia con el listado de `README.md`

El listado de `README.md` ("Compuertas externas abiertas") es una versión
anterior y más breve: menciona "token Cloudflare Terraform separado y
credencial ACME rotada" como una única compuerta pendiente, sin el matiz
—añadido después, según `CLAUDE.md`— de que el token Cloudflare ya se
aprovisionó reutilizando la credencial ACME/Traefik existente, dejando solo
la rotación ACME como pendiente real. Por eso esta página usa `CLAUDE.md`
(fechado 2026-07-27) como fuente principal, citando expresamente los dos
documentos.

Esta comparación queda a su vez superada por la revalidación de
2026-08-02 de la sección anterior: `README.md` no se ha tocado desde
`63dd546` (2026-07-27) y hoy contradice el estado real en al menos el
gate de Minecraft, así que ya no es una fuente fiable ni siquiera para el
matiz que describe este apartado — se conserva aquí solo como registro
histórico de la comparación, no como estado vigente.

## Cuándo escalar

Si una tarea parece requerir cruzar cualquiera de estas compuertas —incluida
la de cutover DNS—, la actuación correcta (documentada en el propio repo
fuente, ver [Agentes operadores](../agentes-operadores/)) es parar y
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
- 2026-08-02 — `CLAUDE.md` revalida por completo las nueve compuertas
  contra el commit `8a76620`: dos cambian de estado (Minecraft pasa a
  CLOSED, cutover DNS pasa a PREMISE OBSOLETE), contradiciendo el listado
  de 2026-07-27 citado arriba en esta misma página. Añadida la sección
  "Revalidación completa — 2 de agosto de 2026" con el detalle de las
  nueve compuertas.

## Referencias

- [`README.md`, sección "Compuertas externas abiertas"](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/README.md)
- [`CLAUDE.md`, sección "Open STOP gates"](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/CLAUDE.md)
- [`docs/TERRAFORM_STATE.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/TERRAFORM_STATE.md)
- [`docs/EDGE.md`, "Registro de secrets instalados"](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/EDGE.md)
