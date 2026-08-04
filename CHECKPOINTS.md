# CHECKPOINTS — Evaluación del estado final

> Adaptación de `CHECKPOINTS.md` de
> [`Cenit-Digital/TemplateSSDUncleBob`](https://github.com/Cenit-Digital/TemplateSSDUncleBob)
> a un sitio de documentación (Astro/Starlight), no a una aplicación con
> código de dominio. En sistemas con revisión no se evalúa el camino, se
> evalúa el destino: estos son los checkpoints objetivos que un revisor
> (humano o IA) puede usar para decidir si una página o un cambio están
> listos para PR. Los comandos citados son los reales, declarados en
> `harness.config.json` (no se ejecutan a través de ningún motor genérico:
> se invocan directamente).

## C1 — El arnés de gobernanza está completo

- [ ] Existen `CLAUDE.md`, `AGENTS.md`, `CHECKPOINTS.md`, `harness.config.json`.
- [ ] `npm run build` (`commands.build`) termina con código de salida 0.
- [ ] `npm run check:links` (`commands.check_links`) termina con código de
      salida 0.

> Como en la plantilla original, estas casillas son un rubric reutilizable
> (se marcan al evaluar un estado concreto, no quedan fijas): no se marcan
> `[x]` aquí de antemano para que no envejezcan como una afirmación falsa si
> una PR futura rompe el build. Estado verificado de un vistazo al escribir
> esta adopción (2026-08-04): los tres puntos de arriba SÍ se cumplían en
> ese momento — ver C3 para el matiz honesto sobre advertencias.

## C2 — Contrato de frontmatter (13 campos)

- [ ] Toda página **factual** nueva o modificada bajo `src/content/docs/`
      rellena los 13 campos del contrato compartido con la plantilla
      obligatoria de `apptolast/sistema-central-admin-servidor`
      (`docs/_template.md`) y consumido por `apptolast/DockerSwarmMemoria`:
      `type`, `owner`, `source-of-truth`, `last-verified`, `tags`, `status`,
      `superseded-by`, `depends-on`, `used-by`, `related-runbooks`,
      `related-dashboards`, `related-alerts`, `see-also` — definidos como
      schema Zod en `src/content.config.ts`.
- [ ] El build (`astro build`, invocado por `npm run build`) sincroniza y
      valida ese schema; un campo con el tipo equivocado (p. ej. `status`
      fuera del enum, o `last-verified` que no sea fecha) rompe el build.
      Esa validación **ya es real y ya corre hoy**, no es aspiracional.
- [ ] Páginas no factuales (la portada `index.md`, tipo "splash") quedan
      exentas de los 13 campos — son `.optional()` en el schema
      precisamente por eso, y es la convención ya vigente en este repo.

## C3 — Build sin advertencias nuevas

- [x] `npm run build` no imprime ninguna línea de advertencia/error nueva
      respecto al estado de esta rama.
- **Historial de este checkpoint:** la primera pasada de esta adopción
  encontró que el build sí emitía una advertencia preexistente (`Entry docs
  → 404 was not found`, de `astro/dist/content/runtime.js`) y documentó
  honestamente que el supuesto inicial ("`disable404Route` ya activo") era
  falso — no se fingió un build limpio. Quedaban dos arreglos posibles sobre
  la mesa, (a) `src/content/docs/404.md` o (b) `disable404Route: true` sin
  más, cada uno con una pérdida (un aviso distinto y peor con (a), la página
  404 estilizada con (b) a secas).
- **Corregido el mismo día**, combinando `disable404Route: true` en
  `astro.config.mjs` con una página `src/pages/404.astro` propia usando
  `<StarlightPage>` (`@astrojs/starlight/components/StarlightPage.astro`) —
  patrón oficial documentado en
  <https://starlight.astro.build/reference/configuration/#disable404route> y
  <https://starlight.astro.build/guides/customization/>. Esto evita el
  `console.warn` sin perder una página 404 estilizada (a diferencia de la
  opción (b) tal cual). Verificado con `npm run build` a stdout/stderr
  separados, **0 bytes en stderr**, en 3 ejecuciones consecutivas.
- [x] Toda página nueva no debe añadir advertencias nuevas a las que ya
      existen (hoy, ninguna).

## C4 — Enlaces internos no rotos

- [ ] `npm run check:links` (`scripts/check-internal-links.mjs`, cero
      dependencias) escanea los enlaces Markdown relativos entre páginas de
      `src/content/docs/` y falla si alguno no resuelve a un slug real. No
      existía ningún mecanismo para esto antes de esta adopción: ni Astro
      ni Starlight validan en build un `[texto](../slug-mal-escrito/)`
      escrito a mano.
- [ ] Toda página nueva que enlace a otra página de este sitio pasa
      `npm run check:links` en verde antes del PR.

## C5 — Ningún dato inventado (la "regla de oro" ya vigente en este repo)

- [ ] Cada afirmación factual de una página nueva o modificada cita un
      `source-of-truth` verificable (commit, fichero, comando ejecutado).
- [ ] Si un dato no se pudo verificar contra la fuente, la página lo dice
      explícitamente (p. ej. "TODO: verificar") en vez de completarlo con
      contenido plausible pero inventado — exactamente la regla que ya
      declara `README.md` de este repo, ahora explícita también como
      checkpoint del arnés.

## C6 — Convivencia con el bot `DockerSwarmMemoria`

- [ ] Antes de tocar una página, se comprobó si `apptolast/DockerSwarmMemoria`
      tiene ya un PR abierto sobre ella (`gh pr list`).
- [ ] Este arnés no abrió ningún Pull Request por sí mismo ni programó
      ninguna tarea recurrente — sigue habiendo un único mecanismo
      automático de propuesta de contenido (el bot), y sigue fusionando
      siempre una persona, nunca en automático.

## C7 — Prueba de mutación

**NO APLICA a este dominio.** Se deja dicho explícitamente, sin fingir un
sustituto:

- La prueba de mutación mide si una suite de tests **detectaría** un
  defecto introducido a propósito en código ejecutable (`killed / total`
  mutantes). Este repositorio no tiene código de dominio bajo `src/`
  distinto del contenido en sí (Markdown) ni una suite de tests que
  "muerda" nada — `src/content.config.ts` es un schema de validación de
  datos, no lógica de negocio con casos de borde que mutar.
- No hay una noción honesta de "mutante" para una afirmación factual en
  prosa: cambiar una fecha o un nombre a ver "si alguien lo nota" no mide
  nada real, no tiene umbral objetivo, y sería exactamente el "teatro de
  verificación" que este mismo arnés pide no fingir.
- El control real y ya existente que cumple el mismo propósito de fondo
  —"¿la red atrapa lo que tiene que atrapar?"— no es una puntuación de
  mutación: es la combinación de **C5** (source-of-truth verificable, nada
  inventado) y el campo `last-verified` de cada página (expone cuándo una
  afirmación deja de haberse revisado, en vez de envejecer en silencio).
  Esa combinación ya hace, con medios honestos, el trabajo que en código
  hace la mutación: obligar a que cualquier afirmación pueda fallar una
  revisión real.
- Por eso `harness.config.json` declara `mutation.applicable: false` con su
  razón, y `commands.mutate` queda vacío a propósito.

---

**Cómo usar este archivo:** antes de abrir un PR que toque
`src/content/docs/`, repasa C1-C6 tú mismo (o pide que lo repase la sesión
de Claude Code que lo escribió). C7 no se evalúa: se cita como constancia de
que se consideró y se descartó con motivo, no por omisión.
