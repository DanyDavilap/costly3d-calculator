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
              <h2>Calculá precios como un profesional</h2>
              <p>Todo lo esencial para calcular costos de impresión 3D, sin hojas de cálculo ni suposiciones.</p>
            </div>
            <div className="grid three">
              <article className="card feature">
                <h3>Precios reales y claros</h3>
                <ul className="card-points">
                  <li>★ Materiales y consumos exactos</li>
                  <li>★ Tiempo de impresión y energía</li>
                  <li>★ Margen configurable por producto</li>
                  <li>★ Total final claro, sin sorpresas</li>
                </ul>
                <p className="card-foot">
                  Sabés exactamente cuánto cuesta producir cada pieza y cuánto margen real estás ganando.
                </p>
              </article>
              <article className="card feature">
                <h3>Historial reutilizable</h3>
                <ul className="card-points">
                  <li>★ Guardá cotizaciones por producto</li>
                  <li>★ Editá costos y márgenes</li>
                  <li>★ Reutilizá variantes en segundos</li>
                </ul>
                <p className="card-foot">
                  Cada cálculo se convierte en una base de venta para productos recurrentes o variantes similares.
                </p>
              </article>
              <article className="card feature">
                <h3>Organización para crecer</h3>
                <ul className="card-points">
                  <li>★ Control de stock</li>
                  <li>★ Organización por rubro o tipo</li>
                  <li>★ Productos claros y comparables</li>
                </ul>
                <p className="card-foot">Dejá de tener precios en la cabeza y pasá a un sistema ordenado y escalable.</p>
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

          <section className="section">
            <div className="section-title">
              <h2>Costly3D no es solo una calculadora.</h2>
              <p>Es un sistema de precios profesional creado por y para makers 3D.</p>
              <p>Cuando tus precios son claros, tu marca se percibe más fuerte, más seria y más confiable.</p>
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
              <h2>Convertí cada impresión en una decisión rentable</h2>
              <p>Convierte cada impresión en una decisión rentable y repetible.</p>
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
