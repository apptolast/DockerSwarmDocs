// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://apptolast.github.io',
  base: '/DockerSwarmDocs',
  integrations: [
    starlight({
      title: 'DockerSwarm Docs (apptolast)',
      tagline:
        'Documentación viva de la infraestructura Docker Swarm de producción de apptolast',
      description:
        'Documentación viva de la infraestructura Docker Swarm de producción de apptolast',
      favicon: '/favicon.ico',
      logo: {
        src: './src/assets/logo.svg',
        alt: 'apptolast logo',
      },
      // Sitio 100% en español: se declara como locale "root" en vez de
      // usar el inglés por defecto de Starlight (ver research i18n).
      locales: {
        root: {
          label: 'Español',
          lang: 'es',
        },
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/apptolast/DockerSwarmDocs',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/apptolast/DockerSwarmDocs/edit/main/',
      },
      // Orden explícito de las páginas del sitio, igual al que tenían las 7
      // originales via `sidebar_position` en Docusaurus. Cada página
      // también declara `sidebar.order` en su propio frontmatter (ver
      // src/content/docs/*.md), que es el mecanismo oficial documentado
      // para reordenar grupos autogenerados; aquí se listan explícitamente
      // por `slug` para que el orden del único grupo de la barra lateral
      // quede fijado sin depender de coincidencias de directorio.
      //
      // `observabilidad-backup` (order: 8, añadida en el PR #10) faltaba en
      // este array: la página existía y compilaba, pero quedaba
      // inalcanzable desde la navegación — el mismo motivo por el que este
      // array se mantiene explícito en vez de autogenerado.
      sidebar: [
        {
          label: 'Documentación',
          items: [
            { slug: 'introduccion' },
            { slug: 'estado-observado' },
            { slug: 'compuertas-abiertas' },
            { slug: 'agentes-operadores' },
            { slug: 'catalogo-servicios' },
            { slug: 'diagnosticos-conocidos' },
            { slug: 'topologia-red' },
            { slug: 'observabilidad-backup' },
          ],
        },
      ],
    }),
  ],
});
