/* ==========================================================================
   Círculo Cromático — js/app.js
   Plato RYB de 12 colores: se gira arrastrando (con inercia), con un toque o
   con el teclado; el colgante oscila y suena al pasar cada color, y al elegir
   se resalta la tríada, se dibuja el triángulo y se actualizan las tarjetas.
   JavaScript nativo, sin dependencias.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Datos
     ------------------------------------------------------------------------ */

  /**
   * Los 12 colores del círculo tradicional (RYB) en sentido horario, empezando
   * por el amarillo arriba (0°). Cada paso son 30°: los primarios quedan a 0°,
   * 120° y 240°, los secundarios entre ellos y los terciarios entre cada
   * primario y su secundario vecino.
   */
  const COLORES = [
    { nombre: 'Amarillo',         categoria: 'primario',   hex: '#FFD400' },
    { nombre: 'Amarillo-naranja', categoria: 'terciario',  hex: '#FFA800' },
    { nombre: 'Naranja',          categoria: 'secundario', hex: '#FF7B00' },
    { nombre: 'Rojo-naranja',     categoria: 'terciario',  hex: '#F4471C' },
    { nombre: 'Rojo',             categoria: 'primario',   hex: '#E2231A' },
    { nombre: 'Rojo-violeta',     categoria: 'terciario',  hex: '#C0186D' },
    { nombre: 'Violeta',          categoria: 'secundario', hex: '#7D2BB5' },
    { nombre: 'Azul-violeta',     categoria: 'terciario',  hex: '#4C3CC4' },
    { nombre: 'Azul',             categoria: 'primario',   hex: '#1D5FD1' },
    { nombre: 'Azul-verde',       categoria: 'terciario',  hex: '#0098A6' },
    { nombre: 'Verde',            categoria: 'secundario', hex: '#1FA74A' },
    { nombre: 'Amarillo-verde',   categoria: 'terciario',  hex: '#9BCB1C' },
  ];

  // Los tres colores de una tríada comparten categoría, así que la tríada se nombra por ella
  const NOMBRE_TRIADA = {
    primario: 'Tríada primaria',
    secundario: 'Tríada secundaria',
    terciario: 'Tríada terciaria',
  };

  const TOTAL = COLORES.length;     // 12
  const PASO = 360 / TOTAL;         // 30° por color
  const SALTO_TRIADA = TOTAL / 3;   // 4 colores = 120°

  /** Radios del dibujo, en unidades del viewBox (-200 … 200). */
  const GEO = {
    fileteExterior: 190,  // filete dorado junto al filo
    marcaLarga: 184.5,    // inicio de las marcas en el límite entre colores
    marcaCorta: 187.2,    // inicio de las marcas cada 6°
    nombre: 172.5,        // línea base de los nombres
    fileteInterior: 166,
    exterior: 162,        // borde externo de los colores
    interior: 100,        // borde interno de los colores
    centro: 96,           // disco central
    triangulo: 78,        // vértices del triángulo
  };

  // Física (grados y milisegundos)
  const MUELLE = { w: 0.0115, z: 0.82 };    // asentado en el color: rápido y casi sin rebote
  const COLGANTE = { w: 0.034, z: 0.28 };   // el colgante oscila un par de veces y se calma
  const PROYECCION = 260;                   // ms de giro libre que se suman al lanzar la rueda
  const UMBRAL_ARRASTRE = 6;                // px para distinguir arrastre de toque

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';
  const preferenciaMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------------
     2. Referencias al DOM
     ------------------------------------------------------------------------ */
  const pagina = document.querySelector('.pagina');
  const marco = document.getElementById('rueda-marco');
  const rueda = document.getElementById('rueda');
  const rotor = document.getElementById('rueda-rotor');
  const colganteSvg = document.getElementById('colgante');
  const colganteColor = document.getElementById('colgante-color');
  const bloqueTriada = document.querySelector('.lectura__triada');
  const tituloTriada = document.getElementById('triada-titulo');
  const coloresTriada = document.getElementById('triada-colores');
  const consejoTriada = document.getElementById('triada-consejo');
  const contenedorTarjetas = document.getElementById('tarjetas');
  const botonPaleta = document.getElementById('copiar-paleta');
  const botonSonido = document.getElementById('sonido');
  const aviso = document.getElementById('aviso');
  const anunciador = document.getElementById('anunciador');

  /* ------------------------------------------------------------------------
     3. Estado
     ------------------------------------------------------------------------ */
  const estado = {
    seleccionado: -1,     // color elegido (-1 = ninguno todavía)
    candidato: -1,        // color bajo el colgante
    anguloTriangulo: 0,   // giro del triángulo dentro del plato
    anguloFantasma: 0,    // giro del triángulo punteado
    tactil: false,        // el último gesto fue con el dedo (para vibrar)
    interactuado: false,  // el usuario ya tocó la rueda (cancela la entrada automática)
  };

  // Giro del plato: "reposo", "arrastre", "muelle" o "entrada"
  const giro = { modo: 'reposo', x: 0, v: 0, objetivo: 0, entrada: null, tramo: 0 };
  const colgante = { x: 0, v: 0 };

  const segmentos = [];
  const realces = [];
  const rotulos = [];
  const vertices = [];
  const tarjetas = [];
  let triangulo, trazoTriangulo, fantasma;

  /* ------------------------------------------------------------------------
     4. Utilidades
     ------------------------------------------------------------------------ */
  const mod = (n, m) => ((n % m) + m) % m;
  const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
  const redondear = (n) => Math.round(n * 100) / 100;
  const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
  const sinMovimiento = () => preferenciaMovimiento.matches;

  /** Lleva un ángulo a (-180, 180] para girar siempre por el camino corto. */
  function normalizar(angulo) {
    const a = mod(angulo, 360);
    return a > 180 ? a - 360 : a;
  }

  /** Punto del SVG a partir de radio y ángulo (0° arriba, sentido horario). */
  function polar(radio, grados) {
    const rad = (grados * Math.PI) / 180;
    return [redondear(radio * Math.sin(rad)), redondear(-radio * Math.cos(rad))];
  }

  function crearSVG(etiqueta, atributos) {
    const el = document.createElementNS(SVG_NS, etiqueta);
    Object.keys(atributos || {}).forEach((clave) => el.setAttribute(clave, atributos[clave]));
    return el;
  }

  function hexARgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /** La tríada de un color: él mismo y los que están a 120° y 240°. */
  const triadaDe = (i) => [i, mod(i + SALTO_TRIADA, TOTAL), mod(i + 2 * SALTO_TRIADA, TOTAL)];

  /** Color que queda bajo el colgante con un giro dado. */
  const indiceEnColgante = (angulo) => mod(Math.round(-angulo / PASO), TOTAL);

  /** "a, b y c" */
  const enumerar = (lista) => `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;

  function leerPreferencia(clave, porDefecto) {
    try {
      const valor = localStorage.getItem(clave);
      return valor === null ? porDefecto : valor === '1';
    } catch (_) {
      return porDefecto;
    }
  }

  function guardarPreferencia(clave, valor) {
    try { localStorage.setItem(clave, valor ? '1' : '0'); } catch (_) { /* sin almacenamiento */ }
  }

  /* ------------------------------------------------------------------------
     5. Sonido (Web Audio, sin archivos): un clic por color y una nota al elegir
     ------------------------------------------------------------------------ */
  const sonido = {
    activo: leerPreferencia('circulo-cromatico:sonido', true),
    ctx: null,
    salida: null,
    ruido: null,
    ultimoClic: 0,

    /** El navegador solo deja crear audio después de un gesto del usuario. */
    desbloquear() {
      if (!this.activo) return;
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (!Contexto) return;
      if (!this.ctx) {
        this.ctx = new Contexto();
        this.salida = this.ctx.createGain();
        this.salida.gain.value = 0.5;
        this.salida.connect(this.ctx.destination);
        // Ráfaga corta de ruido: la base del clic
        const muestras = Math.floor(this.ctx.sampleRate * 0.03);
        this.ruido = this.ctx.createBuffer(1, muestras, this.ctx.sampleRate);
        const datos = this.ruido.getChannelData(0);
        for (let i = 0; i < muestras; i++) datos[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / muestras, 4);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    listo() {
      return this.activo && this.ctx && this.ctx.state === 'running';
    },

    /** Clic seco, como el trinquete de un dial de latón. */
    clic(fuerza) {
      if (!this.listo()) return;
      const t = this.ctx.currentTime;
      if (t - this.ultimoClic < 0.03) return;
      this.ultimoClic = t;
      const fuente = this.ctx.createBufferSource();
      fuente.buffer = this.ruido;
      fuente.playbackRate.value = 0.85 + Math.random() * 0.2;
      const filtro = this.ctx.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.frequency.value = 2600 + Math.random() * 400;
      filtro.Q.value = 3;
      const volumen = this.ctx.createGain();
      volumen.gain.value = 0.5 * fuerza;
      fuente.connect(filtro).connect(volumen).connect(this.salida);
      fuente.start(t);
    },

    /** Nota suave, como una campanilla pequeña. */
    nota(frecuencia, cuando, volumen) {
      if (!this.listo()) return;
      const t = this.ctx.currentTime + (cuando || 0);
      [[1, volumen, 1.4], [2.01, volumen * 0.18, 0.5]].forEach(([multiplo, v, duracion]) => {
        const osc = this.ctx.createOscillator();
        osc.frequency.value = frecuencia * multiplo;
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(v, t + 0.005);
        env.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
        osc.connect(env).connect(this.salida);
        osc.start(t);
        osc.stop(t + duracion + 0.05);
      });
    },

    /** Cada color es un semitono: la tríada suena como tres notas a cuatro semitonos. */
    triada(indice) {
      [0, 4, 8].forEach((semitonos, k) => {
        this.nota(440 * Math.pow(2, (indice + semitonos) / 12), 0.02 + k * 0.11, 0.11);
      });
    },
  };

  /* ------------------------------------------------------------------------
     6. Dibujo del plato (SVG)
     ------------------------------------------------------------------------ */

  /** Sector anular: un color de la rueda. */
  function rutaSector(indice, ri, re) {
    const a0 = indice * PASO - PASO / 2;
    const a1 = indice * PASO + PASO / 2;
    const [x0, y0] = polar(re, a0);
    const [x1, y1] = polar(re, a1);
    const [x2, y2] = polar(ri, a1);
    const [x3, y3] = polar(ri, a0);
    return `M${x0} ${y0}A${re} ${re} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${ri} ${ri} 0 0 0 ${x3} ${y3}Z`;
  }

  /** Anillo completo (para el grano y los filetes). */
  function rutaAnillo(ri, re) {
    return `M0 ${-re}A${re} ${re} 0 1 1 0 ${re}A${re} ${re} 0 1 1 0 ${-re}Z` +
           `M0 ${-ri}A${ri} ${ri} 0 1 0 0 ${ri}A${ri} ${ri} 0 1 0 0 ${-ri}Z`;
  }

  /** Centroide del sector: punto sobre el que crece cada color resaltado. */
  function centroSector(indice) {
    const ri = GEO.interior;
    const re = GEO.exterior;
    const mitad = ((PASO / 2) * Math.PI) / 180;
    const radio = (2 / 3) * ((re ** 3 - ri ** 3) / (re ** 2 - ri ** 2)) * (Math.sin(mitad) / mitad);
    return polar(radio, indice * PASO);
  }

  function construirRueda() {
    const svg = crearSVG('svg', { viewBox: '-200 -200 400 400', role: 'none', focusable: 'false' });

    const defs = crearSVG('defs');
    defs.innerHTML =
      // Sombra suave sin desplazamiento (se ve igual con el plato girado)
      '<filter id="sombra-realce" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">' +
        '<feDropShadow dx="0" dy="0" stdDeviation="4.5" flood-color="#3B2A20" flood-opacity="0.35"/>' +
      '</filter>' +
      // Grano de pigmento: motas irregulares, como un esmalte pintado a mano
      '<filter id="filtro-grano" x="0" y="0" width="100%" height="100%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" result="ruido"/>' +
        '<feColorMatrix in="ruido" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.17  0 0 0 0 0.1  1.4 0 0 0 -0.62" result="motas"/>' +
        '<feComposite in="motas" in2="SourceGraphic" operator="in"/>' +
      '</filter>';
    svg.append(defs);

    // Arcos sobre los que se escriben los nombres
    COLORES.forEach((_, i) => {
      const [x0, y0] = polar(GEO.nombre, i * PASO - PASO / 2);
      const [x1, y1] = polar(GEO.nombre, i * PASO + PASO / 2);
      defs.append(crearSVG('path', {
        id: `arco-${i}`,
        d: `M${x0} ${y0}A${GEO.nombre} ${GEO.nombre} 0 0 1 ${x1} ${y1}`,
      }));
    });

    // ---- Grabados del ala del plato: filetes, graduación cada 6° y nombres ----
    const grabados = crearSVG('g', { class: 'grabados', 'aria-hidden': 'true' });
    grabados.append(
      crearSVG('circle', { class: 'filete', r: GEO.fileteExterior, 'stroke-width': 0.8 }),
      crearSVG('circle', { class: 'filete', r: GEO.fileteInterior, 'stroke-width': 0.5 })
    );
    for (let g = 0; g < 360; g += 6) {
      const limite = mod(g - PASO / 2, PASO) === 0;
      const [x0, y0] = polar(limite ? GEO.marcaLarga : GEO.marcaCorta, g);
      const [x1, y1] = polar(GEO.fileteExterior, g);
      grabados.append(crearSVG('line', { class: limite ? 'marca marca--larga' : 'marca', x1: x0, y1: y0, x2: x1, y2: y1 }));
    }
    COLORES.forEach((color, i) => {
      const texto = crearSVG('text', { class: 'rotulo' });
      const camino = crearSVG('textPath', { href: `#arco-${i}`, startOffset: '50%', 'text-anchor': 'middle' });
      camino.setAttributeNS(XLINK_NS, 'xlink:href', `#arco-${i}`);
      camino.textContent = color.nombre;
      texto.append(camino);
      grabados.append(texto);
      rotulos.push(texto);
    });
    svg.append(grabados);

    // ---- Colores (opciones accesibles del listbox) ----
    const grupoSegmentos = crearSVG('g', { class: 'segmentos', role: 'none' });
    COLORES.forEach((color, i) => {
      const segmento = crearSVG('path', {
        d: rutaSector(i, GEO.interior, GEO.exterior),
        fill: color.hex,
        class: 'segmento',
        id: `color-${i}`,
        role: 'option',
        'aria-selected': 'false',
        'aria-label': `${color.nombre}, ${color.categoria}`,
        'data-indice': i,
      });
      const titulo = crearSVG('title');
      titulo.textContent = `${color.nombre} (${color.categoria})`;
      segmento.append(titulo);
      grupoSegmentos.append(segmento);
      segmentos.push(segmento);
    });
    svg.append(grupoSegmentos);

    // Grano del esmalte sobre todos los colores
    svg.append(crearSVG('path', {
      class: 'grano', d: rutaAnillo(GEO.interior, GEO.exterior), 'fill-rule': 'evenodd', filter: 'url(#filtro-grano)',
    }));

    // ---- Filetes dorados finos entre colores y en los bordes del anillo ----
    const lineas = [];
    for (let i = 0; i < TOTAL; i++) {
      const [x0, y0] = polar(GEO.interior, i * PASO + PASO / 2);
      const [x1, y1] = polar(GEO.exterior, i * PASO + PASO / 2);
      lineas.push(`M${x0} ${y0}L${x1} ${y1}`);
    }
    svg.append(crearSVG('path', {
      class: 'filetes filete', d: lineas.join('') + rutaAnillo(GEO.interior, GEO.exterior), 'stroke-width': 1,
    }));

    // ---- Disco central con doble filete ----
    const centro = crearSVG('g', { class: 'centro', 'aria-hidden': 'true' });
    centro.append(
      crearSVG('circle', { class: 'centro__disco', r: GEO.centro }),
      crearSVG('circle', { class: 'filete', r: GEO.centro, 'stroke-width': 1 }),
      crearSVG('circle', { class: 'filete', r: GEO.centro - 4, 'stroke-width': 0.5 })
    );
    svg.append(centro);

    // ---- Copias elevadas de la tríada ----
    const grupoRealces = crearSVG('g', { class: 'realces', filter: 'url(#sombra-realce)', 'aria-hidden': 'true' });
    COLORES.forEach((color, i) => {
      const d = rutaSector(i, GEO.interior, GEO.exterior);
      const realce = crearSVG('g', { class: 'realce' });
      const [cx, cy] = centroSector(i);
      realce.style.transformOrigin = `${cx}px ${cy}px`;
      realce.append(
        crearSVG('path', { d, fill: color.hex }),
        crearSVG('path', { d, 'fill-rule': 'evenodd', filter: 'url(#filtro-grano)', class: 'grano' }),
        crearSVG('path', { d, class: 'realce__borde' })
      );
      grupoRealces.append(realce);
      realces.push(realce);
    });
    svg.append(grupoRealces);

    // ---- Triángulos: punteado (vista previa) y dorado (tríada elegida) ----
    const puntos = [0, 120, 240].map((a) => polar(GEO.triangulo, a));
    const dTriangulo = `M${puntos[0].join(' ')}L${puntos[1].join(' ')}L${puntos[2].join(' ')}Z`;

    fantasma = crearSVG('g', { class: 'fantasma', 'aria-hidden': 'true' });
    fantasma.append(crearSVG('path', { d: dTriangulo }));
    svg.append(fantasma);

    triangulo = crearSVG('g', { class: 'triangulo', 'aria-hidden': 'true' });
    trazoTriangulo = crearSVG('path', { class: 'triangulo__trazo', d: dTriangulo, pathLength: 1 });
    triangulo.append(trazoTriangulo);
    puntos.forEach(([x, y]) => {
      const vertice = crearSVG('circle', { class: 'triangulo__vertice', cx: x, cy: y, r: 5 });
      triangulo.append(vertice);
      vertices.push(vertice);
    });
    svg.append(triangulo);

    rotor.append(svg);
  }

  /* ------------------------------------------------------------------------
     7. Bucle de animación: giro con física y oscilación del colgante
     ------------------------------------------------------------------------ */
  let idCuadro = 0;
  let ultimoCuadro = 0;

  function despertar() {
    if (idCuadro) return;
    ultimoCuadro = performance.now();
    idCuadro = requestAnimationFrame(bucle);
  }

  function bucle(ahora) {
    const dt = Math.min(48, Math.max(0, ahora - ultimoCuadro));
    ultimoCuadro = ahora;
    const girando = pasoGiro(dt, ahora);
    const oscilando = pasoColgante(dt);
    idCuadro = girando || oscilando ? requestAnimationFrame(bucle) : 0;
  }

  function pasoGiro(dt, ahora) {
    if (giro.modo === 'muelle') {
      // Muelle amortiguado hacia el color objetivo, en subpasos de 8 ms
      let resto = dt;
      while (resto > 0) {
        const h = Math.min(8, resto);
        resto -= h;
        const a = MUELLE.w * MUELLE.w * (giro.objetivo - giro.x) - 2 * MUELLE.z * MUELLE.w * giro.v;
        giro.v += a * h;
        giro.x += giro.v * h;
      }
      if (Math.abs(giro.objetivo - giro.x) < 0.02 && Math.abs(giro.v) < 0.0008) {
        giro.x = giro.objetivo;
        giro.v = 0;
        giro.modo = 'reposo';
      }
      pintarGiro();
      return giro.modo !== 'reposo';
    }

    if (giro.modo === 'entrada') {
      // Giro de presentación al cargar la página (frena en cuartica)
      const e = giro.entrada;
      const t = limitar((ahora - e.inicio) / e.duracion, 0, 1);
      const anterior = giro.x;
      giro.x = e.desde + (e.hasta - e.desde) * (1 - Math.pow(1 - t, 4));
      giro.v = dt > 0 ? (giro.x - anterior) / dt : 0;
      if (t >= 1) {
        giro.modo = 'reposo';
        giro.v = 0;
        giro.objetivo = e.hasta;
        e.alTerminar();
      }
      pintarGiro();
      return giro.modo !== 'reposo';
    }

    return false;   // en reposo o arrastrando (el arrastre pinta en pointermove)
  }

  /** Aplica el giro y detecta cada filete que pasa bajo el colgante. */
  function pintarGiro() {
    rotor.style.transform = `rotate(${giro.x}deg)`;
    const tramo = Math.floor((giro.x + PASO / 2) / PASO);
    if (tramo !== giro.tramo) {
      const sentido = Math.sign(tramo - giro.tramo);
      giro.tramo = tramo;
      alPasarColor(sentido);
    }
    actualizarCandidato();
  }

  function alPasarColor(sentido) {
    if (sinMovimiento()) return;
    const rapidez = Math.abs(giro.v);
    // El filete empuja la punta del colgante en el sentido del giro
    colgante.v += -sentido * limitar(0.18 + rapidez * 0.3, 0.18, 0.5);
    sonido.clic(limitar(0.35 + rapidez * 0.45, 0.35, 1));
    if (estado.tactil && navigator.vibrate) {
      try { navigator.vibrate(4); } catch (_) { /* sin vibración */ }
    }
    despertar();
  }

  function pasoColgante(dt) {
    if (colgante.x === 0 && colgante.v === 0) return false;
    let resto = dt;
    while (resto > 0) {
      const h = Math.min(8, resto);
      resto -= h;
      const a = -COLGANTE.w * COLGANTE.w * colgante.x - 2 * COLGANTE.z * COLGANTE.w * colgante.v;
      colgante.v += a * h;
      colgante.x = limitar(colgante.x + colgante.v * h, -20, 20);
    }
    if (Math.abs(colgante.x) < 0.03 && Math.abs(colgante.v) < 0.001) {
      colgante.x = 0;
      colgante.v = 0;
    }
    colganteSvg.style.transform = `rotate(${colgante.x.toFixed(2)}deg)`;
    return colgante.x !== 0 || colgante.v !== 0;
  }

  /** Lleva el plato a "destino" con el muelle, partiendo de "velocidad". */
  function moverConMuelle(destino, velocidad) {
    giro.objetivo = destino;
    if (sinMovimiento()) {
      giro.x = destino;
      giro.v = 0;
      giro.modo = 'reposo';
      pintarGiro();
      return;
    }
    giro.v = velocidad;
    giro.modo = 'muelle';
    despertar();
  }

  /** Ángulo en el que acabará el plato (para el teclado durante un giro). */
  function destinoActual() {
    if (giro.modo === 'muelle') return giro.objetivo;
    if (giro.modo === 'entrada') return giro.entrada.hasta;
    return Math.round(giro.x / PASO) * PASO;
  }

  /** Color bajo el colgante: gema del colgante, foco accesible y vista previa al arrastrar. */
  function actualizarCandidato() {
    const indice = indiceEnColgante(giro.x);
    if (indice === estado.candidato) return;
    estado.candidato = indice;
    colganteColor.setAttribute('fill', COLORES[indice].hex);
    rueda.setAttribute('aria-activedescendant', `color-${indice}`);
    if (arrastre && arrastre.movido) mostrarFantasma(indice);
  }

  /* ------------------------------------------------------------------------
     8. Selección y tríada
     ------------------------------------------------------------------------ */
  function seleccionar(indice, opciones) {
    const { animar = true, anunciar = true } = opciones || {};
    if (indice === estado.seleccionado) return;
    estado.seleccionado = indice;

    const triada = triadaDe(indice);
    pagina.classList.add('con-seleccion');

    segmentos.forEach((segmento, i) => {
      const enTriada = triada.includes(i);
      segmento.classList.toggle('en-triada', enTriada);
      segmento.setAttribute('aria-selected', String(i === indice));
      realces[i].classList.toggle('activo', enTriada);
      realces[i].classList.toggle('principal', i === indice);
      rotulos[i].classList.toggle('en-triada', enTriada);
    });

    girarTriangulo(indice);
    ocultarFantasma();
    if (animar && !sinMovimiento() && typeof trazoTriangulo.animate === 'function') {
      // El triángulo se dibuja de nuevo: muestra qué ha cambiado
      trazoTriangulo.animate(
        [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
        { duration: 650, easing: 'cubic-bezier(.65, 0, .35, 1)' }
      );
    }

    escribirLectura(triada, animar);
    actualizarTarjetas(triada, animar);

    if (animar) sonido.triada(indice);
    if (anunciar) {
      const nombres = triada.map((i) => COLORES[i].nombre.toLowerCase());
      anunciador.textContent =
        `${COLORES[indice].nombre} seleccionado. ${NOMBRE_TRIADA[COLORES[indice].categoria]}: ${enumerar(nombres)}.`;
    }
  }

  /** Ángulo equivalente más cercano: el triángulo se repite cada 120°. */
  function anguloCercano(actual, indice) {
    return actual + mod(indice * PASO - actual + 60, 120) - 60;
  }

  function girarTriangulo(indice) {
    estado.anguloTriangulo = anguloCercano(estado.anguloTriangulo, indice);
    triangulo.style.transform = `rotate(${estado.anguloTriangulo}deg)`;
    // Cada vértice toma el color al que apunta
    vertices.forEach((vertice, k) => {
      const i = mod(Math.round((estado.anguloTriangulo + k * 120) / PASO), TOTAL);
      vertice.style.fill = COLORES[i].hex;
    });
  }

  function mostrarFantasma(indice) {
    if (estado.seleccionado >= 0 && triadaDe(estado.seleccionado).includes(indice)) {
      ocultarFantasma();
      return;
    }
    estado.anguloFantasma = anguloCercano(estado.anguloFantasma, indice);
    fantasma.style.transform = `rotate(${estado.anguloFantasma}deg)`;
    fantasma.classList.add('visible');
  }

  function ocultarFantasma() {
    if (fantasma) fantasma.classList.remove('visible');
  }

  /** Toque en un color: se elige y el plato lo lleva bajo el colgante. */
  function elegirSegmento(indice) {
    moverConMuelle(giro.x + normalizar(-indice * PASO - giro.x), 0);
    seleccionar(indice);
  }

  /** Texto de la lámina: nombre de la tríada, sus colores y cómo usarla. */
  function escribirLectura(triada, animar) {
    const [a, b, c] = triada.map((i) => COLORES[i].nombre.toLowerCase());
    tituloTriada.textContent = NOMBRE_TRIADA[COLORES[triada[0]].categoria];
    coloresTriada.textContent = capitalizar(enumerar([a, b, c]));
    consejoTriada.textContent =
      `Tres colores a 120° entre sí. En una cocina funcionan si uno manda y los otros acompañan: ` +
      `${a} en lo grande, ${b} en los textiles y ${c} en los detalles.`;

    if (animar && !sinMovimiento()) {
      bloqueTriada.classList.remove('renovando');
      void bloqueTriada.offsetWidth;   // reinicia la animación
      bloqueTriada.classList.add('renovando');
    }
  }

  /* ------------------------------------------------------------------------
     9. Tarjetas y portapapeles
     ------------------------------------------------------------------------ */
  let turnoTarjetas = 0;   // evita que un cambio viejo pise a uno nuevo
  const POSICION = ['Tu color', 'A 120°', 'A 240°'];

  function crearTarjetas() {
    const plantilla = document.getElementById('plantilla-tarjeta');
    for (let p = 0; p < 3; p++) {
      const tarjeta = plantilla.content.firstElementChild.cloneNode(true);
      tarjeta.dataset.posicion = p;
      if (p === 0) tarjeta.classList.add('tarjeta--principal');
      tarjeta.addEventListener('click', () => copiarTarjeta(tarjeta));
      contenedorTarjetas.append(tarjeta);
      tarjetas.push(tarjeta);
    }
  }

  function rellenarTarjeta(tarjeta, indice, posicion) {
    const color = COLORES[indice];
    const [r, g, b] = hexARgb(color.hex);
    tarjeta.dataset.hex = color.hex;
    tarjeta.style.setProperty('--muestra', color.hex);
    tarjeta.querySelector('.tarjeta__nombre').textContent = color.nombre;
    tarjeta.querySelector('.tarjeta__categoria').textContent = capitalizar(color.categoria);
    tarjeta.querySelector('.tarjeta__hex').textContent = color.hex;
    tarjeta.querySelector('.tarjeta__rgb').textContent = `RGB ${r} ${g} ${b}`;
    tarjeta.querySelector('.tarjeta__grados').textContent = `${indice * PASO}°`;
    tarjeta.querySelector('.tarjeta__accion').textContent = 'Copiar';
    tarjeta.classList.remove('copiada');
    tarjeta.setAttribute(
      'aria-label',
      `${POSICION[posicion]}: ${color.nombre}, ${color.categoria}, ${color.hex}. Copiar código HEX`
    );
  }

  function actualizarTarjetas(triada, animar) {
    const turno = ++turnoTarjetas;
    tarjetas.forEach((tarjeta, posicion) => {
      const texto = tarjeta.querySelector('.tarjeta__texto');
      if (texto.getAnimations) texto.getAnimations().forEach((a) => a.cancel());

      if (!animar || sinMovimiento() || typeof texto.animate !== 'function') {
        rellenarTarjeta(tarjeta, triada[posicion], posicion);
        return;
      }
      // La muestra cambia de color con su transición CSS; el texto se funde
      tarjeta.style.setProperty('--muestra', COLORES[triada[posicion]].hex);
      const salida = texto.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' });
      salida.finished
        .then(() => {
          if (turno !== turnoTarjetas) return;
          rellenarTarjeta(tarjeta, triada[posicion], posicion);
          texto.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
          salida.cancel();
        })
        .catch(() => { /* cancelada por un cambio más reciente */ });
    });
  }

  /** Copia al portapapeles (con alternativa para navegadores antiguos o file://). */
  async function copiarTexto(texto) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        return true;
      }
    } catch (_) { /* se intenta el método alternativo */ }
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    area.remove();
    return ok;
  }

  let temporizadorAviso = 0;
  function mostrarAviso(texto, colores) {
    const nodos = colores.map((hex) => {
      const muestra = document.createElement('span');
      muestra.className = 'aviso__muestra';
      muestra.style.backgroundColor = hex;
      return muestra;
    });
    const mensaje = document.createElement('span');
    mensaje.textContent = texto;
    aviso.replaceChildren(...nodos, mensaje);
    aviso.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.remove('visible'), 1900);
  }

  const temporizadoresCopia = new WeakMap();
  async function copiarTarjeta(tarjeta) {
    sonido.desbloquear();
    const hex = tarjeta.dataset.hex;
    const ok = await copiarTexto(hex);
    tarjeta.focus({ preventScroll: true });   // el método alternativo mueve el foco
    if (!ok) {
      mostrarAviso(`No se pudo copiar. El código es ${hex}`, [hex]);
      return;
    }
    mostrarAviso(`${hex} copiado`, [hex]);
    sonido.nota(1318.5, 0.01, 0.07);
    const accion = tarjeta.querySelector('.tarjeta__accion');
    accion.textContent = 'Copiado';
    tarjeta.classList.add('copiada');
    clearTimeout(temporizadoresCopia.get(tarjeta));
    temporizadoresCopia.set(tarjeta, setTimeout(() => {
      tarjeta.classList.remove('copiada');
      accion.textContent = 'Copiar';
    }, 1600));
  }

  botonPaleta.addEventListener('click', async () => {
    sonido.desbloquear();
    if (estado.seleccionado < 0) return;
    const hexes = triadaDe(estado.seleccionado).map((i) => COLORES[i].hex);
    const ok = await copiarTexto(hexes.join(', '));
    botonPaleta.focus({ preventScroll: true });
    mostrarAviso(ok ? `${hexes.join(', ')} copiados` : `No se pudo copiar: ${hexes.join(', ')}`, hexes);
  });

  /* ------------------------------------------------------------------------
     10. Arrastre con ratón o dedo (Pointer Events)
     ------------------------------------------------------------------------ */
  let arrastre = null;

  function centroDeRueda() {
    const r = marco.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, radio: r.width / 2 };
  }

  /** Ángulo del puntero respecto al centro (0° arriba, sentido horario). */
  function anguloPuntero(e, centro) {
    return (Math.atan2(e.clientX - centro.x, -(e.clientY - centro.y)) * 180) / Math.PI;
  }

  /** El disco central queda libre en pantallas táctiles para poder desplazar la página. */
  function enDiscoCentral(x, y, centro) {
    return Math.hypot(x - centro.x, y - centro.y) < centro.radio * (GEO.centro / 200);
  }

  rueda.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    sonido.desbloquear();
    const centro = centroDeRueda();
    if (e.pointerType !== 'mouse' && enDiscoCentral(e.clientX, e.clientY, centro)) return;
    estado.tactil = e.pointerType !== 'mouse';
    estado.interactuado = true;
    arrastre = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
      centro,
      angulo: anguloPuntero(e, centro),
      movido: false,
      segmento: e.target.closest ? e.target.closest('[data-indice]') : null,
      muestras: [{ t: e.timeStamp, a: giro.x }],
    };
    giro.modo = 'arrastre';   // la mano detiene el plato
    giro.v = 0;
    ocultarFantasma();
    try { rueda.setPointerCapture(e.pointerId); } catch (_) { /* sin captura también funciona */ }
  });

  rueda.addEventListener('pointermove', (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const { centro } = arrastre;

    if (!arrastre.movido) {
      if (Math.hypot(e.clientX - arrastre.x, e.clientY - arrastre.y) < UMBRAL_ARRASTRE) return;
      arrastre.movido = true;
      rueda.classList.add('arrastrando');
    }

    const angulo = anguloPuntero(e, centro);
    const dt = Math.max(1, e.timeStamp - arrastre.t);
    // Muy cerca del eje el ángulo es inestable: solo se actualiza la referencia
    if (Math.hypot(e.clientX - centro.x, e.clientY - centro.y) > centro.radio * 0.12) {
      const delta = normalizar(angulo - arrastre.angulo);
      giro.v = 0.6 * (delta / dt) + 0.4 * giro.v;
      giro.x += delta;
      pintarGiro();
    }
    arrastre.angulo = angulo;
    arrastre.t = e.timeStamp;
    arrastre.muestras.push({ t: e.timeStamp, a: giro.x });
    if (arrastre.muestras.length > 24) arrastre.muestras.shift();
  });

  function terminarArrastre(e, cancelado) {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const datos = arrastre;
    arrastre = null;
    rueda.classList.remove('arrastrando');

    // Toque o clic sin arrastrar
    if (!datos.movido) {
      if (datos.segmento && !cancelado) {
        elegirSegmento(Number(datos.segmento.dataset.indice));
      } else {
        const destino = Math.round(giro.x / PASO) * PASO;
        moverConMuelle(destino, 0);
        if (estado.seleccionado === -1) seleccionar(indiceEnColgante(destino));
      }
      return;
    }

    // Arrastre: velocidad de los últimos 90 ms → giro libre proyectado → muelle al color
    const ahora = e.timeStamp;
    const recientes = datos.muestras.filter((m) => ahora - m.t <= 90);
    recientes.push({ t: ahora, a: giro.x });
    let velocidad = 0;
    if (recientes.length >= 2 && !cancelado && !sinMovimiento()) {
      const primera = recientes[0];
      const ultima = recientes[recientes.length - 1];
      velocidad = (ultima.a - primera.a) / Math.max(16, ultima.t - primera.t);
    }
    const destino = Math.round((giro.x + limitar(velocidad * PROYECCION, -720, 720)) / PASO) * PASO;
    moverConMuelle(destino, velocidad);
    seleccionar(indiceEnColgante(destino));
  }

  rueda.addEventListener('pointerup', (e) => terminarArrastre(e, false));
  rueda.addEventListener('pointercancel', (e) => terminarArrastre(e, true));
  rueda.addEventListener('lostpointercapture', (e) => terminarArrastre(e, true));
  rueda.addEventListener('contextmenu', (e) => e.preventDefault());

  // Móvil: el dedo sobre el anillo de colores gira la rueda y no mueve la página;
  // sobre el disco central, la página se desplaza con normalidad (touch-action: pan-y en CSS)
  rueda.addEventListener('touchstart', (e) => {
    const toque = e.touches[0];
    if (!toque || e.touches.length > 1) return;
    if (!enDiscoCentral(toque.clientX, toque.clientY, centroDeRueda())) e.preventDefault();
  }, { passive: false });

  // iOS solo activa el audio al terminar un toque o con un clic
  document.addEventListener('touchend', () => sonido.desbloquear(), { passive: true });
  document.addEventListener('click', () => sonido.desbloquear());

  // Ratón: el triángulo punteado anticipa la tríada del color señalado
  rueda.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || arrastre) return;
    const segmento = e.target.closest ? e.target.closest('[data-indice]') : null;
    if (segmento) mostrarFantasma(Number(segmento.dataset.indice));
    else ocultarFantasma();
  });
  rueda.addEventListener('pointerleave', () => { if (!arrastre) ocultarFantasma(); });

  /* ------------------------------------------------------------------------
     11. Teclado: flechas para girar, Enter o Espacio para elegir
     ------------------------------------------------------------------------ */
  rueda.addEventListener('keydown', (e) => {
    let pasos = 0;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        pasos = 1;    // trae al colgante el siguiente color en sentido horario
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        pasos = -1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        estado.interactuado = true;
        sonido.desbloquear();
        seleccionar(indiceEnColgante(destinoActual()));
        return;
      default:
        return;
    }
    e.preventDefault();
    estado.interactuado = true;
    estado.tactil = false;
    sonido.desbloquear();
    const base = Math.round(destinoActual() / PASO) * PASO;
    moverConMuelle(base - pasos * PASO, giro.modo === 'muelle' ? giro.v : 0);
  });

  /* ------------------------------------------------------------------------
     12. Sonido sí / no
     ------------------------------------------------------------------------ */
  function pintarBotonSonido() {
    botonSonido.setAttribute('aria-pressed', String(sonido.activo));
    botonSonido.querySelector('.sonido__texto').textContent = sonido.activo ? 'Con sonido' : 'Sin sonido';
  }

  botonSonido.addEventListener('click', () => {
    sonido.activo = !sonido.activo;
    guardarPreferencia('circulo-cromatico:sonido', sonido.activo);
    pintarBotonSonido();
    if (sonido.activo) {
      sonido.desbloquear();
      setTimeout(() => sonido.nota(880, 0.01, 0.08), 40);
    }
  });

  /* ------------------------------------------------------------------------
     13. Inicio: el plato llega girando y se detiene con el amarillo arriba
     ------------------------------------------------------------------------ */
  function iniciar() {
    construirRueda();
    girarTriangulo(0);
    crearTarjetas();
    pintarBotonSonido();
    actualizarTarjetas(triadaDe(0), false);

    const elegirInicial = () => {
      if (estado.seleccionado === -1) seleccionar(0, { animar: false, anunciar: false });
    };

    if (sinMovimiento()) {
      giro.x = 0;
      pintarGiro();
      elegirInicial();
      return;
    }

    giro.x = -150;
    giro.tramo = Math.floor((giro.x + PASO / 2) / PASO);
    pintarGiro();
    setTimeout(() => {
      if (estado.interactuado) return;
      giro.entrada = { desde: giro.x, hasta: 0, inicio: performance.now(), duracion: 1700, alTerminar: elegirInicial };
      giro.modo = 'entrada';
      despertar();
    }, 250);
  }

  iniciar();
})();
