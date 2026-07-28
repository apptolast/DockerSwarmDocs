// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'DockerSwarm Docs (apptolast)',
  tagline:
    'Documentación viva de la infraestructura Docker Swarm de producción de apptolast',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Este sitio todavía NO está desplegado en ningún dominio: es una decisión
  // pendiente del propietario del repositorio (ver README.md). `url` y
  // `baseUrl` son valores de configuración necesarios para que Docusaurus
  // compile (sitemap, canonical links, etc.), no implican un despliegue real.
  url: 'https://apptolast.github.io',
  baseUrl: '/DockerSwarmDocs/',

  // GitHub pages deployment config.
  // No usado todavía para desplegar (ver README.md), solo para que los
  // enlaces "Editar esta página" apunten al repositorio correcto.
  organizationName: 'apptolast',
  projectName: 'DockerSwarmDocs',

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/apptolast/DockerSwarmDocs/tree/main/',
        },
        // Este sitio no publica blog: es documentación factual, no un diario
        // de novedades. El blog de ejemplo de Docusaurus se elimina.
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/favicon.ico',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'DockerSwarm Docs (apptolast)',
        logo: {
          alt: 'apptolast logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Documentación',
          },
          {
            to: '/docs/tags',
            label: 'Tags',
            position: 'left',
          },
          {
            href: 'https://github.com/apptolast/DockerSwarmInfrastrcture',
            label: 'DockerSwarmInfrastrcture (fuente)',
            position: 'right',
          },
          {
            href: 'https://github.com/apptolast/DockerSwarmDocs',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentación',
            items: [
              {
                label: 'Introducción',
                to: '/docs/introduccion',
              },
              {
                label: 'Estado observado',
                to: '/docs/estado-observado',
              },
              {
                label: 'Compuertas abiertas',
                to: '/docs/compuertas-abiertas',
              },
              {
                label: 'Agentes operadores',
                to: '/docs/agentes-operadores',
              },
            ],
          },
          {
            title: 'Repositorios apptolast',
            items: [
              {
                label: 'DockerSwarmInfrastrcture (fuente de verdad)',
                href: 'https://github.com/apptolast/DockerSwarmInfrastrcture',
              },
              {
                label: 'sistema-central-admin-servidor',
                href: 'https://github.com/apptolast/sistema-central-admin-servidor',
              },
              {
                label: 'DockerSwarmDocs (este repo)',
                href: 'https://github.com/apptolast/DockerSwarmDocs',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} apptolast. Contenido bajo revisión humana; no autogenerado todavía.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
