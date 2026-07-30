---
title: "Diagnósticos conocidos: Docker, Traefik y sudo-rs"
type: runbook
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture docs/KNOWN_ISSUES.md, commit 45249ebb"
last-verified: 2026-07-30
tags:
  - troubleshooting
  - docker
  - traefik
  - ansible
  - swarm
status: stable
superseded-by: null
depends-on: []
used-by:
  - "architecture:agentes-operadores"
related-runbooks: []
related-dashboards: []
related-alerts: []
see-also:
  - "architecture:introduccion"
  - "infrastructure:estado-observado"
  - "architecture:agentes-operadores"
sidebar_position: 6
---

# Diagnósticos conocidos: Docker, Traefik y sudo-rs

## Resumen

`DockerSwarmInfrastrcture` documenta explícitamente cuatro entradas de log o
fallos "esperados" en este stack (Docker 29.6.2, Traefik 3.7.9, Ubuntu 26.04
con `sudo-rs`), con su causa raíz identificada contra el código fuente
oficial correspondiente. El repo no oculta estos registros ni rebaja
globalmente el nivel de logging para conseguir una validación en verde: el
validador de arranque del Swarm los acepta de forma expresa y acotada
mediante `--allow-known-swarm-startup`, solo después de comprobar que el
nodo está `active`, `Ready`, `Active` y `Leader`. Cualquier otra entrada de
prioridad warning o superior sigue haciendo fallar la validación.

## `error creating cluster object`

```text
level=error msg="error creating cluster object"
```

El código oficial de Moby 29.6.2 explica que crear el objeto de clúster por
defecto debe fallar cuando el clúster ya existe; la condición que decide
registrar el error usa una disyunción (`err != ErrExist || err !=
ErrNameConflict`) que también registra los dos resultados esperados. El
mismo código sigue presente en la rama principal de Moby.

## `MAC address changed`

```text
level=warning msg="MAC address changed" iface=br0
```

Durante la restauración de la red `ingress`, Linux recalcula la MAC del
bridge al incorporar sus interfaces. Moby detecta el cambio mientras prepara
anuncios ARP/NA, lo registra y detiene el envío con la MAC antigua. En este
host aparece una sola vez por arranque; la red, el nodo y el scheduler
convergen correctamente pese al aviso.

## Advertencia de caracteres codificados de Traefik

Traefik 3.7.9 registra una advertencia antes de cargar la configuración,
para recordar que la política por defecto de caracteres codificados cambió.
Este repositorio configura explícitamente a `false` los siete caracteres en
los cuatro entrypoints, pero la advertencia se emite antes de que esos
valores se lean — es decir, aparece igual aunque la configuración ya sea
correcta. El validador ejecuta la imagen exacta, exige una sola ocurrencia
del texto conocido, y rechaza cualquier otra entrada `warning`, `error`,
`fatal` o `panic`.

## `Timeout waiting for privilege escalation prompt` con sudo-rs

Ubuntu 26.04 instala `sudo-rs` como alternativa preferente (prioridad 50),
de modo que `/usr/bin/sudo` apunta a `/usr/lib/cargo/bin/sudo`. `sudo-rs` no
reproduce el prompt pedido con `-p`: lo envuelve en su propio formato
(`[sudo: [sudo via ansible, key=<id>] password:] Password:`). El plugin
`become` de Ansible solo reconoce el prompt cuando una línea de la salida
**empieza** por el texto exacto `[sudo via ansible, key=<id>] password:`
(`check_password_prompt`, en `ansible/plugins/become/__init__.py`); la línea
de `sudo-rs` empieza por `[sudo:` seguido de un espacio, así que la
coincidencia nunca ocurre y la escalada aborta sin haber enviado nunca la
contraseña (`Timeout (12s) waiting for privilege escalation prompt`). El
mismo desajuste rompe la detección de contraseña incorrecta: Ansible busca
`Sorry, try again.` mientras `sudo-rs` responde
`sudo: Authentication failed, try again.`.

`requiretty` no interviene: `sudo-rs` no implementa ese ajuste, y `visudo`
rechaza `Defaults:admin !requiretty` con `unknown setting`.

**Solución aplicada**: el paquete `sudo` clásico sigue disponible en Ubuntu
26.04 e instala el binario setuid `/usr/bin/sudo.ws` (alternativa de
prioridad 40), que respeta `-p` byte a byte. Por eso `ansible/ansible.cfg`
fija `become_exe = /usr/bin/sudo.ws`. No se altera la alternativa del
sistema, no se concede `NOPASSWD` y no se almacena ninguna contraseña; el
cambio se limita a Ansible. `config/host-security.yml` bloquea la versión
del paquete `sudo` para que cualquier reconstrucción disponga del binario.

## Política de validación

Toda entrada de prioridad warning o superior, o con
`level=warning|error|fatal|panic`, hace fallar la validación de arranque del
Swarm, salvo las dos excepciones anteriores (`error creating cluster
object`, `MAC address changed`) y la advertencia de Traefik descritas
arriba. También falla si alguno de esos textos aparece más de una vez, o si
el manager no está sano. La aceptación es específica de versión y debe
revisarse al actualizar Docker, Traefik o la distribución base.

## Histórico relevante

- 2026-07-30 — Esta página creada, verificada contra
  `docs/KNOWN_ISSUES.md` en el commit `45249ebb` de
  `DockerSwarmInfrastrcture`.

## Referencias

- [`docs/KNOWN_ISSUES.md`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/docs/KNOWN_ISSUES.md)
- [Comentario y condición en Moby 29.6.2](https://github.com/moby/moby/blob/3d80467678f6e36325fa9ae3dd486fe91e5652e3/vendor/github.com/moby/swarmkit/v2/manager/manager.go#L953-L985)
- [Detección de MAC en Moby 29.6.2](https://github.com/moby/moby/blob/3d80467678f6e36325fa9ae3dd486fe91e5652e3/daemon/libnetwork/osl/interface_linux.go#L723-L733)
- [Emisión anterior a la carga en Traefik 3.7.9](https://github.com/traefik/traefik/blob/v3.7.9/cmd/traefik/traefik.go#L100-L103)
- [Alternativas de sudo en Ubuntu 26.04](https://manpages.ubuntu.com/manpages/resolute/en/man8/update-alternatives.8.html)
