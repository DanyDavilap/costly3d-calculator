import "../../styles/landing.css";
import rentabilidadImg from "../../assets/img/rentabilidad real.png";
import costosFijosImg from "../../assets/img/costos fijos.png";
import historialImg from "../../assets/img/historial.png";
import cotizacionesImg from "../../assets/img/cotizaciones.png";

type LandingProps = {
  onStart: () => void;
  onOpenProModal: () => void;
};

export default function Landing({ onStart, onOpenProModal }: LandingProps) {
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
            onClick={onOpenProModal}
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
                Calcula costos reales de material, energía y tiempo para poner precios rentables, con márgenes claros y
                fáciles de repetir.
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
              <p>Todo lo esencial para calcular costos de impresión 3D, sin hojas de cálculo ni suposiciones.</p>
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

          <section className="section pro-section">
            <div className="section-title">
              <h2>Lo que Costly3D puede hacer cuando tu negocio crece</h2>
              <p>Diseñado para makers que dejan de improvisar y empiezan a escalar.</p>
              <p>Cuando dejás de improvisar y empezás a escalar, necesitás control real sobre tus costos.</p>
            </div>
            <div className="pro-grid">
              <article className="card pro-card">
                <div className="pro-image">
                  <img src={rentabilidadImg} alt="Captura de desglose de costos y total sugerido" />
                </div>
                <h3>Rentabilidad real</h3>
                <p>Entiende cuánto ganás realmente por cada producto, no solo el precio final.</p>
              </article>
              <article className="card pro-card">
                <div className="pro-image">
                  <img src={costosFijosImg} alt="Vista de inputs de cálculo de costos fijos" />
                </div>
                <h3>Costos fijos distribuidos</h3>
                <p>Costly3D tiene en cuenta gastos invisibles como mantenimiento, desgaste y tiempo improductivo.</p>
              </article>
              <article className="card pro-card">
                <div className="pro-image">
                  <img src={historialImg} alt="Historial con categorías visibles" />
                </div>
                <h3>Historial reutilizable</h3>
                <p>Convierte cada cálculo en una base sólida para futuras cotizaciones.</p>
              </article>
              <article className="card pro-card">
                <div className="pro-image">
                  <img src={cotizacionesImg} alt="Placeholder de exportación PDF y Excel" />
                </div>
                <h3>Cotizaciones profesionales</h3>
                <p>Exporta presupuestos listos para enviar a clientes.</p>
              </article>
            </div>
          </section>

          <section className="section comparison-section">
            <div className="section-title">
              <h2>Free vs Pro – Elegí cómo querés trabajar</h2>
            </div>
            <div className="comparison-grid">
              <article className="card comparison-card">
                <h3>Free</h3>
                <ul>
                  <li>Hasta 3 productos</li>
                  <li>Cálculo básico de costos</li>
                  <li>Historial limitado</li>
                  <li>Exportación básica</li>
                </ul>
              </article>
              <article className="card comparison-card pro">
                <div className="pro-badge">PRO</div>
                <h3>Pro</h3>
                <ul>
                  <li>Productos ilimitados</li>
                  <li>Historial completo de cotizaciones</li>
                  <li>Exportar cotizaciones profesionales</li>
                  <li>Desglose interno avanzado</li>
                  <li>Documentos listos para enviar a clientes</li>
                </ul>
                <button
                  type="button"
                  className="btn primary"
                  onClick={onOpenProModal}
                >
                  Acceso anticipado a PRO
                </button>
              </article>
            </div>
          </section>

          <section className="card cta pro-cta">
            <div>
              <h2>Hoy puedes probar Costly3D gratis. Cuando vendas más, tendrás las herramientas para escalar.</h2>
            </div>
            <div className="cta-actions">
              <button type="button" className="btn primary" onClick={onStart}>
                Probar la calculadora
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={onOpenProModal}
              >
                Acceso anticipado PRO
              </button>
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
              <p>Accede a la calculadora y empezá a validar tus precios con una base profesional desde hoy.</p>
            </div>
            <div className="cta-actions">
              <button type="button" className="btn primary" onClick={onStart}>
                Probar la calculadora
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={onOpenProModal}
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
