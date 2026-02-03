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
          <button type="button" className="btn primary" onClick={onOpenProModal}>
            Acceso anticipado
          </button>
        </header>

        <main className="container">
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">Para makers, talleres y negocios de impresión 3D.</p>
              <h1>Dejá de adivinar precios en impresión 3D.</h1>
              <p className="lead">
                Calculá costos reales de material, energía y tiempo para poner precios rentables, con márgenes claros y
                repetibles.
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
                <span>Precios claros</span>
                <span>Historial reutilizable</span>
                <span>Control de stock</span>
              </div>
            </div>
            <div className="hero-card card">
              <div className="card-header">
                <div>
                  <p className="card-eyebrow">Preview de cálculo</p>
                  <h3>Resumen de costos</h3>
                </div>
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
              <h2>Calculá precios con criterio profesional</h2>
              <p>Todo lo esencial para costear impresión 3D sin planillas ni suposiciones.</p>
            </div>
            <div className="grid three">
              <article className="card feature">
                <span className="feature-icon" aria-hidden="true">
                  💸
                </span>
                <h3>Precios reales</h3>
                <p className="feature-strong">Sabés cuánto cuesta cada pieza.</p>
                <ul className="feature-points">
                  <li>Material, energía y tiempo</li>
                  <li>Margen configurable por producto</li>
                </ul>
              </article>
              <article className="card feature">
                <span className="feature-icon" aria-hidden="true">
                  🗂️
                </span>
                <h3>Historial reutilizable</h3>
                <p className="feature-strong">Repetí cotizaciones sin empezar de cero.</p>
                <ul className="feature-points">
                  <li>Guardá productos y variantes</li>
                  <li>Editá costos y márgenes</li>
                </ul>
              </article>
              <article className="card feature">
                <span className="feature-icon" aria-hidden="true">
                  📦
                </span>
                <h3>Organización clara</h3>
                <p className="feature-strong">Catálogo ordenado para crecer.</p>
                <ul className="feature-points">
                  <li>Rubro, tipo y stock</li>
                  <li>Productos comparables</li>
                </ul>
              </article>
            </div>
          </section>

          <section id="how-it-works" className="section">
            <div className="section-title">
              <h2>Cómo funciona en 3 pasos</h2>
              <p>En minutos pasás del costo al precio listo para vender.</p>
            </div>
            <div className="grid three">
              <article className="card step-card">
                <div className="step-number">1</div>
                <h3>Cargá los datos base</h3>
                <p>Material, consumo y horas de impresión.</p>
              </article>
              <article className="card step-card">
                <div className="step-number">2</div>
                <h3>Ajustá tu margen</h3>
                <p>Sumá energía y armado para un precio consistente.</p>
              </article>
              <article className="card step-card">
                <div className="step-number">3</div>
                <h3>Guardá y reutilizá</h3>
                <p>Repetí cotizaciones en segundos cuando vuelvas a vender.</p>
              </article>
            </div>
          </section>

          <section className="section pro-section">
            <div className="section-title">
              <h2>Lo que Costly3D habilita cuando tu negocio crece</h2>
              <p>Más control y rentabilidad para makers que ya venden y quieren escalar.</p>
            </div>
            <div className="pro-grid">
              <article className="card pro-card">
                <h3>Rentabilidad real</h3>
                <p>Entendé cuánto ganás realmente por cada producto, no solo el precio final.</p>
                <div className="pro-image">
                  <img src={rentabilidadImg} alt="Captura de desglose de costos y total sugerido" />
                </div>
              </article>
              <article className="card pro-card">
                <h3>Costos fijos distribuidos</h3>
                <p>Costly3D tiene en cuenta gastos invisibles como mantenimiento, desgaste y tiempo improductivo.</p>
                <div className="pro-image">
                  <img src={costosFijosImg} alt="Vista de inputs de cálculo de costos fijos" />
                </div>
              </article>
              <article className="card pro-card">
                <h3>Historial reutilizable</h3>
                <p>Convertí cada cálculo en una base sólida para futuras cotizaciones.</p>
                <div className="pro-image">
                  <img src={historialImg} alt="Historial con categorías visibles" />
                </div>
              </article>
              <article className="card pro-card">
                <h3>Cotizaciones profesionales</h3>
                <p>Exporta presupuestos listos para enviar a clientes.</p>
                <div className="pro-image">
                  <img src={cotizacionesImg} alt="Captura de exportación de cotizaciones" />
                </div>
              </article>
            </div>
            <div className="pro-mini">
              <p className="pro-mini-title">Y además…</p>
              <div className="pro-mini-grid">
                <article className="card pro-mini-card">
                  <span className="pro-mini-icon" aria-hidden="true">
                    📁
                  </span>
                  <h3>Proyectos</h3>
                  <p>Organizá pedidos complejos y seguí su avance sin perder control.</p>
                </article>
                <article className="card pro-mini-card">
                  <span className="pro-mini-icon" aria-hidden="true">
                    ✅
                  </span>
                  <h3>Plan de acción</h3>
                  <p>Checklist inteligente para priorizar tareas y entregar a tiempo.</p>
                </article>
              </div>
            </div>
          </section>

          <section className="section comparison-section">
            <div className="section-title">
              <h2>Free vs Pro — Elegí cómo querés trabajar</h2>
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
                <button type="button" className="btn primary" onClick={onOpenProModal}>
                  Acceso anticipado a PRO
                </button>
              </article>
            </div>
          </section>

          <section className="section">
            <div className="section-title">
              <h2>Costly3D no es solo una calculadora.</h2>
              <p>
                Es un sistema de precios profesional creado por y para makers 3D, para vender con claridad,
                consistencia y confianza.
              </p>
            </div>
          </section>

          <section className="card cta pro-cta">
            <div>
              <h2>Hoy podés probar Costly3D gratis. Cuando vendas más, tendrás las herramientas para escalar.</h2>
            </div>
            <div className="cta-actions">
              <button type="button" className="btn primary" onClick={onStart}>
                Probar la calculadora
              </button>
              <button type="button" className="btn ghost" onClick={onOpenProModal}>
                Acceso anticipado PRO
              </button>
            </div>
          </section>

          <section id="benefits" className="section">
            <div className="section-title">
              <h2>Convertí cada impresión en una decisión rentable</h2>
              <p>Hacé de cada impresión una decisión rentable y repetible.</p>
            </div>
            <div className="grid two">
              <div className="card benefit">
                <h3>Pensado para vender</h3>
                <ul className="card-points">
                  <li>★ Cotizaciones claras</li>
                  <li>★ Ventas por encargo</li>
                  <li>★ Ideal para redes y pedidos directos</li>
                </ul>
                <p className="card-foot">Cotizá con seguridad y transmití profesionalismo en cada venta.</p>
              </div>
              <div className="card benefit">
                <h3>Costos reales y consistentes</h3>
                <ul className="card-points">
                  <li>★ Base de costos real</li>
                  <li>★ Evitá subcotizar</li>
                  <li>★ Margen siempre consistente</li>
                </ul>
                <p className="card-foot">Dejá de perder dinero usando precios claros y coherentes en cada producto.</p>
              </div>
              <div className="card benefit">
                <h3>Multi-categoría</h3>
                <ul className="card-points">
                  <li>★ Juguetes y articulados</li>
                  <li>★ Accesorios y piezas funcionales</li>
                  <li>★ Decoración y personalizados</li>
                </ul>
                <p className="card-foot">Gestioná distintos tipos de productos desde un solo sistema.</p>
              </div>
              <div className="card benefit">
                <h3>Historial reutilizable</h3>
                <ul className="card-points">
                  <li>★ Guardá cada cálculo</li>
                  <li>★ Reutilizá cotizaciones</li>
                  <li>★ Versiones listas para vender</li>
                </ul>
                <p className="card-foot">Cada cotización se convierte en una base sólida para futuras ventas.</p>
              </div>
            </div>
          </section>

          <section id="cta" className="cta card">
            <div>
              <h2>Empieza a calcular tus costos 3D con claridad.</h2>
              <p>Accedé a la calculadora y empezá a validar tus precios con una base profesional desde hoy.</p>
            </div>
            <div className="cta-actions">
              <button type="button" className="btn primary" onClick={onStart}>
                Probar la calculadora
              </button>
              <button type="button" className="btn ghost" onClick={onOpenProModal}>
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
