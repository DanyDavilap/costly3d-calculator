import "../../styles/landing.css";

type LandingProps = {
  onStart: () => void;
};

export default function Landing({ onStart }: LandingProps) {
  return (
    <div className="landing">
      <div className="app-shell">
        <header className="nav">
          <div className="brand">
            <div className="logo">C3D</div>
            <span>Costly3D</span>
          </div>
          <nav className="nav-links">
            <a href="#features">Funciones</a>
            <a href="#benefits">Beneficios</a>
            <a href="#cta">Empezar</a>
          </nav>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              window.location.href = "./early-access.html";
            }}
          >
            Acceso anticipado
          </button>
        </header>

        <main className="container">
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">Para makers, talleres y negocios de impresión 3D.</p>
              <h1>Deja de adivinar precios en impresión 3D.</h1>
              <p className="lead">
                Calcula costos reales de material, energía y tiempo para poner precios rentables en tus productos 3D,
                con márgenes claros y repetibles.
              </p>
              <div className="hero-actions">
                <button type="button" className="btn primary" onClick={onStart}>
                  Probar la calculadora
                </button>
                <button type="button" className="btn ghost">
                  Ver cómo funciona
                </button>
              </div>
              <div className="hero-meta">
                <span>Multi-categoría</span>
                <span>Historial y stock</span>
                <span>Para makers y talleres</span>
              </div>
            </div>
            <div className="hero-card card">
              <div className="card-header">
                <h3>Resumen de costos</h3>
                <span className="badge">Demo</span>
              </div>
              <div className="card-body">
                <div className="stat">
                  <p>Material</p>
                  <strong>$ 12.450</strong>
                </div>
                <div className="stat">
                  <p>Energía</p>
                  <strong>$ 1.080</strong>
                </div>
                <div className="stat">
                  <p>Armado</p>
                  <strong>$ 2.500</strong>
                </div>
                <div className="total">
                  <span>Total sugerido</span>
                  <strong>$ 22.900</strong>
                </div>
              </div>
            </div>
          </section>

          <section id="features" className="section">
            <div className="section-title">
              <h2>Funciones principales</h2>
              <p>Todo lo esencial para calcular costos de impresión 3D en un solo flujo.</p>
            </div>
            <div className="grid three">
              <article className="card feature">
                <h3>Desglose de costos</h3>
                <p>Calcula materiales, tiempo, energía y margen con totales claros y configurables.</p>
              </article>
              <article className="card feature">
                <h3>Historial de cálculos</h3>
                <p>Guarda, edita y reutiliza cotizaciones para cada producto o variante.</p>
              </article>
              <article className="card feature">
                <h3>Stock y categorías</h3>
                <p>Controla disponibilidad y organiza productos por rubro o tipo.</p>
              </article>
            </div>
          </section>

          <section id="benefits" className="section">
            <div className="section-title">
              <h2>Beneficios para tu negocio</h2>
              <p>Convierte cada impresión en una decisión rentable y repetible.</p>
            </div>
            <div className="grid two">
              <div className="card benefit">
                <h3>Costos reales</h3>
                <p>Deja de subcotizar o perder margen usando una base clara y consistente de costos reales.</p>
              </div>
              <div className="card benefit">
                <h3>Pensado para vender</h3>
                <p>Ideal si cotizas por encargo, vendes por redes o produces en series pequeñas.</p>
              </div>
              <div className="card benefit">
                <h3>Multi-categoría</h3>
                <p>Gestiona juguetes, accesorios, piezas, decoración y productos personalizados.</p>
              </div>
              <div className="card benefit">
                <h3>Historial reutilizable</h3>
                <p>Convierte cada cálculo en una base sólida para nuevas cotizaciones.</p>
              </div>
            </div>
          </section>

          <section id="cta" className="cta card">
            <div>
              <h2>Empieza a calcular tus costos 3D con claridad.</h2>
              <p>Accede a la calculadora y valida tus precios con una base consistente y profesional.</p>
            </div>
            <div className="cta-actions">
              <button type="button" className="btn primary" onClick={onStart}>
                Probar la calculadora
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  window.location.href = "./early-access.html";
                }}
              >
                Acceso anticipado
              </button>
            </div>
          </section>
        </main>

        <footer className="footer">
          <span>Costly3D · Calculadora de costos para impresión 3D</span>
          <span>Contacto · soporte@costly3d.com</span>
        </footer>
      </div>
    </div>
  );
}
