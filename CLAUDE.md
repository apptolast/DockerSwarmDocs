# Instrucciones para Claude — Adopción de TemplateSSDUncleBob en DockerSwarmDocs

> Este archivo se carga automáticamente al inicio de cada sesión.
> Este repositorio adopta la disciplina de
> [`Cenit-Digital/TemplateSSDUncleBob`](https://github.com/Cenit-Digital/TemplateSSDUncleBob)
> (arnés SDD estilo Robert C. Martin: conversación → contrato aprobado por un
> humano → redacción → review → verificación), adaptada con honestidad a lo
> que es este repositorio: **un sitio de documentación Astro/Starlight, no
> una aplicación con código de dominio**. El proceso y las puertas son los
> mismos que en cualquier adopción de esa plantilla; lo que cambia es qué
> significa cada fase para prosa en vez de para código. El detalle completo
> de la adaptación —incluida la lista explícita de lo que NO tiene
> equivalente literal (TDD estricto, mutación)— vive en `AGENTS.md`,
> `CHECKPOINTS.md` y la página
> [`adopcion-templatessd`](src/content/docs/adopcion-templatessd.md).

## Qué gobierna este arnés (y qué NO)

Gobierna el trabajo de **redactar o modificar a mano** una página de
`src/content/docs/`: una página nueva, una reestructuración, una corrección
que no viene ya propuesta por un bot. **No** gobierna, no sustituye y no
compite con el bot diario **`apptolast/DockerSwarmMemoria`**, que sigue
proponiendo sus propios Pull Requests contra este repo exactamente igual que
hasta ahora: siempre en modo borrador, siempre fusionados por una persona,
nunca con auto-merge (dos rondas ya fusionadas, PRs
[`#4`](https://github.com/apptolast/DockerSwarmDocs/pull/4) y
[`#10`](https://github.com/apptolast/DockerSwarmDocs/pull/10); ver
`README.md`, sección "Disciplina de contribución manual"). Este arnés
no abre Pull Requests por sí mismo ni programa ninguna tarea recurrente: es
disciplina para quien escribe a mano, humano o una sesión de Claude Code
orquestada por un humano. Antes de tocar una página, comprueba si
`DockerSwarmMemoria` ya tiene un PR abierto sobre ella
(`gh pr list --repo apptolast/DockerSwarmDocs`) para no pisarlo ni duplicar
el trabajo — el detalle de esta convivencia está en
`src/content/docs/adopcion-templatessd.md`.

## Cómo orquestas una página nueva o un cambio grande

La plantilla original fuerza el rol `craftsman_lead`, que coordina 5
subagentes Markdown especializados (`.claude/agents/`) porque en un
proyecto de código conviene acotar el contexto de cada fase (spec, Gherkin,
TDD, review, mutación) a un subagente distinto. Ese reparto **no se ha
portado aquí**: no hay `.claude/agents/` en este repositorio. Con un único
escritor a la vez y sin ciclo TDD que trocear, dividir el trabajo en varios
subagentes Markdown habría sido forzar una separación que esta plantilla no
necesita — habría sido la clase de "equivalente falso" que este mismo arnés
pide evitar (ver `CHECKPOINTS.md`, C7). En su lugar, **tú mismo** aplicas la
disciplina en una sola sesión, con la misma secuencia de fases y la misma
puerta humana que describe `AGENTS.md`:

1. **Conversación** — antes de escribir, deja explícito (en el propio PR o
   en la conversación) el propósito de la página, su `type` y su
   `source-of-truth` propuestos.
2. **Contrato** — redacta el frontmatter completo (los 13 campos, ver
   `AGENTS.md`) y un esquema breve de secciones. Esto reemplaza al
   `.feature` Gherkin: es lo barato de revisar ANTES de escribir 2000
   palabras de prosa.
3. **⏸ Puerta humana** — el propietario del repo aprueba ese frontmatter +
   esquema antes de que se redacte el cuerpo. No lo des por aprobado tú
   mismo.
4. **Redacción** — escribe citando `source-of-truth` verificable para cada
   afirmación factual. Si algo no se puede verificar, dilo explícitamente en
   la propia página (p. ej. "TODO: verificar") en vez de rellenarlo con
   contenido plausible pero inventado — la "regla de oro" que ya rige este
   repo (`README.md`).
5. **Review** — recorre `CHECKPOINTS.md` tú mismo antes de dar la página por
   cerrada; sé tan estricto como lo sería un revisor distinto.
6. **Verificación** — corre los comandos reales de `harness.config.json`
   (ver abajo) y no cierres la sesión si alguno falla.

## Protocolo de arranque

1. Lee `AGENTS.md` para orientarte en el repositorio.
2. Lee `CHECKPOINTS.md` y el estado reciente (`git log`, PRs abiertos —
   incluidos los del bot `DockerSwarmMemoria`).
3. **2bis — Sincroniza la memoria organizacional** (paso heredado tal cual
   de TemplateSSDUncleBob, opcional y **no bloqueante**):

   ```bash
   scripts/sync-memoria.sh        # POSIX / macOS / Linux
   pwsh scripts/sync-memoria.ps1  # Windows
   ```

   Clona `Cenit-Digital/SistemaDeMemoriaUncleBob` (privado) en
   `.memoria-cache/` (en `.gitignore`, se regenera cada sesión). Si
   `.memoria-cache/patterns/<categoría>/` trae algo relevante para tu
   tarea, revísalo antes de diseñar desde cero, leyendo primero su "Cuándo
   NO aplica". **Aviso honesto**: `apptolast` no es parte de la
   organización `Cenit-Digital`, así que hoy este paso muy probablemente no
   tendrá acceso a ese repo privado y terminará en 0 sin traer patrones —
   eso es exactamente el comportamiento "no bloqueante" por diseño, no un
   fallo. Se copian los scripts igual (tal cual, sin modificar) porque son
   gratis de mantener y quedan listos el día que este proyecto tenga su
   propio repo de memoria equivalente.
4. Ejecuta `npm run build` (`commands.build` en `harness.config.json`). Si
   falla o imprime una advertencia nueva, **paras** y lo reportas — no
   seguir es la regla, no la excepción (ver `CHECKPOINTS.md`, C1).

## Comandos reales (`harness.config.json`)

Los comandos concretos de este stack viven en `harness.config.json` (no los
hardcodees en la conversación). No se ha copiado a este repo el motor
`.harness/harness.mjs` de la plantilla ni el lanzador `bin/harness`: se
invocan directamente.

| Uso                              | Comando real                        |
| --------------------------------- | ------------------------------------ |
| Instalar dependencias             | `npm ci`                             |
| Build (equivalente a "test" aquí) | `npm run build`                      |
| Enlaces internos no rotos         | `npm run check:links`                |
| Lint                              | No existe hoy en `package.json` (campo vacío en `harness.config.json`) |
| Mutación                          | No aplica a este dominio — ver `CHECKPOINTS.md` C7 |

## Reglas duras

- ❌ No apruebes tú mismo el frontmatter/esquema de una página nueva: esa es
  la puerta humana (equivalente a la aprobación del `.feature` Gherkin).
- ❌ No inventes un dato factual ni un `source-of-truth`. Si no se puede
  verificar, se marca explícitamente como pendiente.
- ❌ No toques una página sobre la que `DockerSwarmMemoria` tenga ya un PR
  abierto sin coordinarlo antes.
- ❌ No declares una página "lista" con `npm run build` en rojo, con
  advertencias nuevas, o con `npm run check:links` en rojo.
- ❌ No finjas un equivalente de "prueba de mutación" para prosa. Si no
  aplica, se dice explícitamente (`CHECKPOINTS.md`, C7) — no se inventa un
  sustituto falso.
- ✅ Una página o cambio de alcance similar a la vez.
- ✅ Dos rondas de bot ya fusionadas (`#4`, `#10`, ver `README.md`) prueban
  que el flujo de `DockerSwarmMemoria` funciona: este arnés se diseña para
  no interponerse en ese camino, solo para dar disciplina al otro (el
  humano escribiendo a mano).

## Cuándo NO aplica esta disciplina

Preguntas conceptuales o de exploración pura del repo (leer y responder) no
requieren pasar por este protocolo completo: respóndelas directamente.
