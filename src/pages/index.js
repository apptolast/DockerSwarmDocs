import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/introduccion">
            Leer la introducción
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Documentación viva de la infraestructura Docker Swarm de apptolast (repo DockerSwarmInfrastrcture)">
      <HomepageHeader />
      <main>
        <div className="container margin-vert--lg">
          <div className="row">
            <div className="col col--8 col--offset-2">
              <p>
                Este sitio documenta la infraestructura Docker Swarm de
                producción de <code>apptolast</code>, cuya fuente de verdad es
                el repositorio{' '}
                <a href="https://github.com/apptolast/DockerSwarmInfrastrcture">
                  apptolast/DockerSwarmInfrastrcture
                </a>
                . El Markdown de este sitio es en sí mismo la fuente de verdad
                de la documentación (no un resumen desechable): cada página
                factual lleva metadatos citables (frontmatter) para que, el
                día de mañana, un sistema de recuperación aumentada (RAG)
                pueda ingerirla sin reescritura.
              </p>
              <p>
                Empieza por la{' '}
                <Link to="/docs/introduccion">introducción</Link>, revisa el{' '}
                <Link to="/docs/estado-observado">estado observado</Link> del
                servidor, las{' '}
                <Link to="/docs/compuertas-abiertas">
                  compuertas externas abiertas
                </Link>{' '}
                y los{' '}
                <Link to="/docs/agentes-operadores">
                  agentes operadores
                </Link>{' '}
                que aplican los cambios con disciplina check-then-apply.
              </p>
              <p>
                Consulta también el{' '}
                <Link to="/docs/tags">índice de etiquetas</Link> para navegar
                por tema.
              </p>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
