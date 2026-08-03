---
title: "Observabilidad de fallos de backup: escritura de estado audible"
type: runbook
owner: PabloHurtadoGonzalo86
source-of-truth: "apptolast/DockerSwarmInfrastrcture backup/backupctl.py (record_failure, clase RuntimeStatus), stacks/observability/config/prometheus-alerts.yml, ansible/roles/backup/defaults/main.yml y CHANGELOG.md sección 'Fixed', commit e92cda3"
last-verified: 2026-08-03
tags:
  - backup
  - observabilidad
  - alertas
  - monitorizacion
  - restic
status: stable
superseded-by: null
depends-on:
  - "policy:compuertas-abiertas"
used-by: []
related-runbooks: []
related-dashboards: []
related-alerts:
  - BackupLastRunFailed
  - ApplicationBackupStale
  - BackupMetricsMissing
see-also:
  - "architecture:introduccion"
  - "policy:compuertas-abiertas"
  - "infrastructure:estado-observado"
sidebar:
  order: 8
---

# Observabilidad de fallos de backup: escritura de estado audible

## Resumen

`backup/backupctl.py` corrigió, en el commit `e92cda3` ("fix(backup): make
the silent status-write failure audible (#9)", 2026-08-02), un fallo
silencioso en la propia escritura del estado y las métricas del backup.
Antes de este commit, si esa escritura fallaba, no quedaba ningún rastro; el
fallo no era cosmético, sino que dejaba ciega a la monitorización crítica de
backup. Por separado, esta página documenta también un hueco de cobertura de
alertas que sigue abierto y que la corrección no cierra: solo uno de los
cuatro tipos de backup tiene alerta de "estado obsoleto".

## El fallo corregido

`RuntimeStatus.write()` (`backup/backupctl.py`) escribe, tras cada operación,
un documento JSON de estado y regenera el fichero de métricas Prometheus
(`dockerswarm_backup.prom`) a partir de todos los ficheros de estado
existentes. `record_failure()`, invocado desde los manejadores de excepción
de `main()`, es el único punto donde se registra que una operación de backup
falló.

Antes del fix, `record_failure()` envolvía esa escritura en
`except Exception: pass`. Un `OSError` por disco lleno o por permisos, o un
fichero de estado corrupto en esa misma escritura, hacían que el registro de
fallo fallara a su vez, sin dejar ningún rastro. El efecto operativo
concreto: el gauge `dockerswarm_backup_last_run_success` conservaba el `1`
del run anterior, así que la alerta crítica `BackupLastRunFailed`
(`severity: critical`, dispara con `dockerswarm_backup_last_run_success ==
0`) nunca llegaba a disparar para ese fallo.

## El fix

`record_failure()` conserva la captura ancha a propósito — no debe
enmascarar el error primario del backup, que ya se reporta por su propio
camino — pero ahora, si la escritura de estado falla, imprime un aviso
explícito por `stderr`:

```text
WARNING: cannot record backup failure status: <NombreDeLaExcepcion>
```

El propio comentario que acompaña al cambio en el código es explícito sobre
por qué una captura ancha con aviso es mejor que un fallo no controlado ahí
mismo: silenciar por completo la escritura de estado deja ciega a la
monitorización, mientras que un `stderr` audible al menos dispara la
sospecha del operador o del proceso que invoque `backupctl.py`.

## Hueco de alertas que sigue abierto

`backup/backupctl.py` instala cuatro tipos de operación —`application`,
`swarm-state`, `verify` y `rehearsal`—, cada uno con su propio calendario en
`ansible/roles/backup/defaults/main.yml`:

<!-- markdownlint-disable MD013 -->

| Tipo | Calendario (`OnCalendar`) | Alerta de "estado obsoleto" |
| --- | --- | --- |
| `application` | Diario, `02:15` | `ApplicationBackupStale` (`> 36h`, `severity: critical`) |
| `swarm-state` | Semanal, domingo `04:15` | Ninguna |
| `verify` | Semanal, sábado `03:15` | Ninguna |
| `rehearsal` | Mensual, día 1 `05:15` | Ninguna |

<!-- markdownlint-enable MD013 -->

`stacks/observability/config/prometheus-alerts.yml` define
`ApplicationBackupStale` filtrando explícitamente
`kind="application"`. Las otras tres operaciones, todas con calendario fijo
igual que `application`, no tienen ninguna alerta equivalente sobre
`dockerswarm_backup_last_finished_timestamp_seconds`. La única alerta que
las cubre en absoluto es `BackupLastRunFailed`, y esa alerta solo dispara si
la métrica existe y vale `0` — no cubre el caso en que el timer de systemd
deja de ejecutarse por completo (por ejemplo, si se deshabilita o si falla
antes de invocar `backupctl.py`), porque en ese caso no se escribe ninguna
métrica nueva y la última conocida sigue en `1` indefinidamente.
`BackupMetricsMissing` (`absent(...)`) tampoco cubre este caso para los tres
tipos no-`application`, porque también filtra `kind="application"`.

Esta página no propone el arreglo (añadir las tres alertas de staleness
equivalentes, o generalizar `BackupMetricsMissing`/`ApplicationBackupStale`
a los cuatro `kind`): eso es una decisión de quien mantiene
`DockerSwarmInfrastrcture`, señalada aquí para que no se pierda. TODO:
verificar si existe ya un ticket o decisión explícita del propietario sobre
extender esta cobertura a los otros tres tipos.

## Histórico relevante

- 2026-08-02 — `backup/backupctl.py` deja de tragarse en silencio el fallo
  de la escritura de estado/métricas (`record_failure()`), commit `e92cda3`.
- 2026-08-03 — Esta página creada, verificada contra el commit `e92cda3` de
  `DockerSwarmInfrastrcture` y contra la configuración de alertas y
  calendarios de backup vigente en ese mismo commit.

## Referencias

- [`backup/backupctl.py`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/backup/backupctl.py)
- [`stacks/observability/config/prometheus-alerts.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/stacks/observability/config/prometheus-alerts.yml)
- [`ansible/roles/backup/defaults/main.yml`](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/ansible/roles/backup/defaults/main.yml)
- [`CHANGELOG.md`, sección "Fixed"](https://github.com/apptolast/DockerSwarmInfrastrcture/blob/main/CHANGELOG.md)
