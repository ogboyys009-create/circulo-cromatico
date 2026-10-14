/* ==========================================================================
   Círculo Cromático — js/app.js
   Rueda RYB de 12 colores con física de giro (inercia y muelle), colgante
   que oscila al pasar cada segmento, sonido sintetizado, inclinación 3D,
   tríadas resaltadas y tarjetas que copian el código HEX.
   JavaScript nativo, sin dependencias.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Datos
     ------------------------------------------------------------------------ */

  /**
   * Los 12 colores del círculo cromático tradicional (RYB), en sentido horario
   * empezando por el amarillo arriba (0°). Cada paso son 30°: los primarios
   * quedan a 0°, 120° y 240°, los secundarios entre ellos y los terciarios
   * entre cada primario y su secundario vecino.
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

  // Nivel de cada categoría (1, 2 o 3 perlas) y nombre de la tríada que forma
  const CATEGORIAS = {
    primario:   { nivel: 1, triada: 'Tríada primaria' },
    secundario: { nivel: 2, triada: 'Tríada secundaria' },
    terciario:  { nivel: 3, triada: 'Tríada terciaria' },
  };

  const TOTAL = COLORES.length;     // 12 segmentos
  const PASO = 360 / TOTAL;         // 30° por segmento
  const SALTO_TRIADA = TOTAL / 3;   // 4 segmentos = 120°
  const ETIQUETA_POSICION = ['Tu color', '+120°', '+240°'];

  /** Radios del dibujo, en unidades del viewBox (-200 … 200). */
  const GEO = {
    fileteExterior: 189.5,  // filete dorado junto al latón
    marcaLarga: 183,        // inicio de las marcas largas de graduación
    marcaCorta: 186.3,      // inicio de las marcas cortas
    nombre: 175.5,          // línea base de los nombres grabados
    perlas: 169.5,          // perlas de categoría
    fileteInterior: 165.5,
    exterior: 162,          // borde externo de los esmaltes
    interior: 99,           // borde interno de los esmaltes
    centro: 96,             // disco crema central
    collar: 89.5,           // collar de perlas doradas
    triangulo: 74,          // vértices del triángulo dorado
  };

  // Física del giro y del colgante (unidades: grados y milisegundos)
  const MUELLE = { w: 0.0115, z: 0.8 };      // asentado en el segmento: rápido y con un levísimo rebote
  const COLGANTE = { w: 0.034, z: 0.26 };    // el colgante oscila varias veces antes de pararse
  const PROYECCION = 280;                    // ms de "vuelo libre" que se suman al lanzar la rueda
  const UMBRAL_ARRASTRE = 6;                 // px para distinguir arrastre de toque
  const INCLINACION_MAX = 7;                 // grados de inclinación 3D al pasar el ratón

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';
  const preferenciaMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------------
     2. Referencias al DOM
     ------------------------------------------------------------------------ */
  const escena = document.getElementById('escena');
  const marco = document.getElementById('rueda-marco');
  const rueda = document.getElementById('rueda');
  const rotor = document.getElementById('rueda-rotor');
  const luz = document.getElementById('rueda-luz');
  const manchasLuz = Array.from(luz.children);
  const indicador = document.getElementById('indicador');
  const gemaIndicador = document.getElementById('indicador-gema');
  const etiquetaPunto = document.querySelector('.etiqueta__punto');
  const etiquetaNombre = document.querySelector('.etiqueta__nombre');
  const etiquetaPuntos = document.querySelector('.etiqueta__puntos');
  const tituloTriada = document.getElementById('triada-titulo');
  const coloresTriada = document.getElementById('triada-colores');
  const contenedorTarjetas = document.getElementById('tarjetas');
  const botonPaleta = document.getElementById('copiar-paleta');
  const botonSonido = document.getElementById('sonido');
  const aviso = document.getElementById('aviso');
  const anunciador = document.getElementById('anunciador');

  /* ------------------------------------------------------------------------
     3. Estado
     ------------------------------------------------------------------------ */
  const estado = {
    seleccionado: -1,    // índice del color elegido (-1 = ninguno todavía)
    candidato: -1,       // índice del color bajo el colgante
    anguloTriangulo: 0,  // giro del triángulo dentro de la rueda
    anguloFantasma: 0,   // giro del triángulo fantasma (vista previa al pasar el ratón)
    tactil: false,       // el último gesto fue con el dedo (para la vibración)
    interactuado: false, // el usuario ya tocó la rueda (cancela la entrada automática)
  };

  // Giro de la rueda: "reposo", "arrastre", "muelle" o "tween" (entrada inicial)
  const giro = { modo: 'reposo', x: 0, v: 0, objetivo: 0, tween: null, tramo: 0 };
  const colgante = { x: 0, v: 0 };
  const inclinacion = { x: 0, y: 0, objetivoX: 0, objetivoY: 0 };

  // Elementos del SVG creados en construirRueda()
  const segmentos = [];
  const realces = [];
  const rotulos = [];
  const perlasCategoria = [];
  const joyas = [];
  const paradasVeladura = [];
  let triangulo, trazoTriangulo, fantasma, onda;

  const tarjetas = [];

  /* ------------------------------------------------------------------------
     4. Utilidades
     ------------------------------------------------------------------------ */
  const mod = (n, m) => ((n % m) + m) % m;
  const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
  const redondear = (n) => Math.round(n * 100) / 100;
  const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
  const sinMovimiento = () => preferenciaMovimiento.matches;

  /** Lleva un ángulo al rango (-180, 180] para girar siempre por el camino corto. */
  function normalizar(angulo) {
    const a = mod(angulo, 360);
    return a > 180 ? a - 360 : a;
  }

  /** Punto en el SVG a partir de radio y ángulo (0° arriba, sentido horario). */
  function polar(radio, grados) {
    const rad = (grados * Math.PI) / 180;
    return [redondear(radio * Math.sin(rad)), redondear(-radio * Math.cos(rad))];
  }

  /** Crea un elemento SVG con sus atributos. */
  function crearSVG(etiqueta, atributos) {
    const el = document.createElementNS(SVG_NS, etiqueta);
    Object.keys(atributos || {}).forEach((clave) => el.setAttribute(clave, atributos[clave]));
    return el;
  }

  function hexARgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /** Índices de la tríada de un color: él mismo y los que están a 120° y 240°. */
  const triadaDe = (i) => [i, mod(i + SALTO_TRIADA, TOTAL), mod(i + 2 * SALTO_TRIADA, TOTAL)];

  /** Índice del color que queda bajo el colgante (arriba) con un giro dado. */
  const indiceEnIndicador = (angulo) => mod(Math.round(-angulo / PASO), TOTAL);

  /** "a, b y c" */
  const enumerar = (lista) => `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;

  /** HTML de 1, 2 o 3 perlas de categoría. */
  const perlasHTML = (nivel) => '<i></i>'.repeat(nivel);

  /** Preferencias guardadas en el navegador (puede fallar en modo privado). */
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
     5. Sonido sintetizado (Web Audio): trinquete al girar, caja de música al elegir
     ------------------------------------------------------------------------ */
  const sonido = {
    activo: leerPreferencia('circulo-cromatico:sonido', true),
    ctx: null,
    salida: null,
    ruido: null,
    ultimoTic: 0,

    /** El navegador solo permite crear audio tras un gesto del usuario. */
    desbloquear() {
      if (!this.activo) return;
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (!Contexto) return;
      if (!this.ctx) {
        this.ctx = new Contexto();
        const compresor = this.ctx.createDynamicsCompressor();
        compresor.threshold.value = -16;
        compresor.ratio.value = 3;
        this.salida = this.ctx.createGain();
        this.salida.gain.value = 0.6;
        this.salida.connect(compresor).connect(this.ctx.destination);

        // Ráfaga de ruido que decae: la base del "clic" metálico
        const muestras = Math.floor(this.ctx.sampleRate * 0.04);
        this.ruido = this.ctx.createBuffer(1, muestras, this.ctx.sampleRate);
        const datos = this.ruido.getChannelData(0);
        for (let i = 0; i < muestras; i++) datos[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / muestras, 4);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    listo() {
      return this.activo && this.ctx && this.ctx.state === 'running';
    },

    /** Clic del trinquete cuando un segmento pasa bajo el colgante. */
    tic(fuerza) {
      if (!this.listo()) return;
      const t = this.ctx.currentTime;
      if (t - this.ultimoTic < 0.028) return;
      this.ultimoTic = t;

      const fuente = this.ctx.createBufferSource();
      fuente.buffer = this.ruido;
      fuente.playbackRate.value = 0.9 + Math.random() * 0.2;
      const filtro = this.ctx.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.frequency.value = 3000 + Math.random() * 500;
      filtro.Q.value = 2.2;
      const volumen = this.ctx.createGain();
      volumen.gain.value = 0.55 * fuerza;
      fuente.connect(filtro).connect(volumen).connect(this.salida);
      fuente.start(t);

      // Pequeño golpe tonal que le da cuerpo, como un trinquete de latón
      const golpe = this.ctx.createOscillator();
      golpe.frequency.setValueAtTime(1700, t);
      golpe.frequency.exponentialRampToValueAtTime(700, t + 0.025);
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.16 * fuerza, t + 0.002);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      golpe.connect(env).connect(this.salida);
      golpe.start(t);
      golpe.stop(t + 0.05);
    },

    /** Nota de caja de música: fundamental y dos parciales que se apagan antes. */
    nota(frecuencia, t, volumen) {
      [[1, volumen, 1.8], [2, volumen * 0.2, 0.9], [4.01, volumen * 0.22, 0.32]].forEach(([multiplo, v, duracion]) => {
        const osc = this.ctx.createOscillator();
        osc.frequency.value = frecuencia * multiplo;
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(v, t + 0.004);
        env.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
        osc.connect(env).connect(this.salida);
        osc.start(t);
        osc.stop(t + duracion + 0.05);
      });
    },

    /**
     * Cada color es un semitono (12 colores = 12 notas). Una tríada cromática
     * suena como un acorde aumentado, arpegiado desde el color elegido.
     */
    acorde(indice) {
      if (!this.listo()) return;
      const t = this.ctx.currentTime + 0.03;
      [0, 4, 8].forEach((semitonos, k) => {
        this.nota(523.25 * Math.pow(2, (indice + semitonos) / 12), t + k * 0.09, 0.15);
      });
    },
  };

  /* ------------------------------------------------------------------------
     6. Dibujo de la rueda (SVG)
     ------------------------------------------------------------------------ */

  /** Trazado de un sector anular (un segmento de esmalte). */
  function rutaSector(indice, ri, re) {
    const a0 = indice * PASO - PASO / 2;
    const a1 = indice * PASO + PASO / 2;
    const [x0, y0] = polar(re, a0);
    const [x1, y1] = polar(re, a1);
    const [x2, y2] = polar(ri, a1);
    const [x3, y3] = polar(ri, a0);
    return `M${x0} ${y0}A${re} ${re} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${ri} ${ri} 0 0 0 ${x3} ${y3}Z`;
  }

  /** Anillo completo (para la capa de esmalte). */
  function rutaAnillo(ri, re) {
    return `M0 ${-re}A${re} ${re} 0 1 1 0 ${re}A${re} ${re} 0 1 1 0 ${-re}Z` +
           `M0 ${-ri}A${ri} ${ri} 0 1 0 0 ${ri}A${ri} ${ri} 0 1 0 0 ${-ri}Z`;
  }

  /** Centroide del sector: punto sobre el que crece cada segmento resaltado. */
  function centroSector(indice) {
    const ri = GEO.interior;
    const re = GEO.exterior;
    const mitad = ((PASO / 2) * Math.PI) / 180;
    const radio = (2 / 3) * ((re ** 3 - ri ** 3) / (re ** 2 - ri ** 2)) * (Math.sin(mitad) / mitad);
    return polar(radio, indice * PASO);
  }

  function construirRueda() {
    const svg = crearSVG('svg', { viewBox: '-200 -200 400 400', role: 'none', focusable: 'false' });

    // ---- Definiciones: sombra, esmalte, centro y veladuras del triángulo ----
    const defs = crearSVG('defs');
    defs.innerHTML =
      // Sombra sin desplazamiento: se ve igual con la rueda girada
      '<filter id="sombra-realce" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">' +
        '<feDropShadow dx="0" dy="0" stdDeviation="5.5" flood-color="#3B2A20" flood-opacity="0.42"/>' +
      '</filter>' +
      // Esmalte abombado: brillo en el borde interno y sombra en el externo
      `<radialGradient id="esmalte" cx="0" cy="0" r="${GEO.exterior}" gradientUnits="userSpaceOnUse">` +
        `<stop offset="${(GEO.interior / GEO.exterior).toFixed(3)}" stop-color="#FFFFFF" stop-opacity="0.34"/>` +
        '<stop offset="0.7" stop-color="#FFFFFF" stop-opacity="0.08"/>' +
        '<stop offset="0.86" stop-color="#FFFFFF" stop-opacity="0"/>' +
        '<stop offset="0.95" stop-color="#2A1A0A" stop-opacity="0.07"/>' +
        '<stop offset="1" stop-color="#2A1A0A" stop-opacity="0.2"/>' +
      '</radialGradient>' +
      `<radialGradient id="degradado-centro" cx="0" cy="0" r="${GEO.centro}" gradientUnits="userSpaceOnUse">` +
        '<stop offset="0" stop-color="#FFFEF8"/>' +
        '<stop offset="0.68" stop-color="#FBF3E2"/>' +
        '<stop offset="1" stop-color="#EEDDBD"/>' +
      '</radialGradient>' +
      '<linearGradient id="oro-borde" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#F6E7BF"/>' +
        '<stop offset="0.5" stop-color="#C29B52"/>' +
        '<stop offset="1" stop-color="#8A6A2E"/>' +
      '</linearGradient>';
    svg.append(defs);

    // ---- Arcos para los nombres grabados en el borde ----
    COLORES.forEach((_, i) => {
      const [x0, y0] = polar(GEO.nombre, i * PASO - PASO / 2);
      const [x1, y1] = polar(GEO.nombre, i * PASO + PASO / 2);
      defs.append(crearSVG('path', {
        id: `arco-${i}`,
        d: `M${x0} ${y0}A${GEO.nombre} ${GEO.nombre} 0 0 1 ${x1} ${y1}`,
      }));
    });

    // ---- Grabados del borde: filetes, graduación, nombres y perlas de categoría ----
    const grabados = crearSVG('g', { class: 'grabados', 'aria-hidden': 'true' });
    grabados.append(
      crearSVG('circle', { class: 'filete', r: GEO.fileteExterior, 'stroke-width': 0.9 }),
      crearSVG('circle', { class: 'filete', r: GEO.fileteInterior, 'stroke-width': 0.6, opacity: 0.7 })
    );
    for (let g = 0; g < 360; g += 6) {
      const larga = mod(g - PASO / 2, PASO) === 0;
      const [x0, y0] = polar(larga ? GEO.marcaLarga : GEO.marcaCorta, g);
      const [x1, y1] = polar(GEO.fileteExterior, g);
      grabados.append(crearSVG('line', {
        class: larga ? 'graduacion graduacion--larga' : 'graduacion', x1: x0, y1: y0, x2: x1, y2: y1,
      }));
    }
    COLORES.forEach((color, i) => {
      const texto = crearSVG('text', { class: 'rotulo' });
      const camino = crearSVG('textPath', { href: `#arco-${i}`, startOffset: '50%', 'text-anchor': 'middle' });
      camino.setAttributeNS(XLINK_NS, 'xlink:href', `#arco-${i}`);
      camino.textContent = color.nombre;
      texto.append(camino);
      grabados.append(texto);
      rotulos.push(texto);

      // 1, 2 o 3 perlas según la categoría, centradas bajo el nombre
      const nivel = CATEGORIAS[color.categoria].nivel;
      const grupo = crearSVG('g', { class: 'perla-categoria' });
      for (let k = 0; k < nivel; k++) {
        const [x, y] = polar(GEO.perlas, i * PASO + (k - (nivel - 1) / 2) * 2.6);
        grupo.append(crearSVG('circle', { cx: x, cy: y, r: 1.35 }));
      }
      grabados.append(grupo);
      perlasCategoria.push(grupo);
    });
    svg.append(grabados);

    // ---- Segmentos de esmalte (opciones accesibles del listbox) ----
    const grupoSegmentos = crearSVG('g', { class: 'segmentos', role: 'none' });
    COLORES.forEach((color, i) => {
      const pieza = crearSVG('g', { class: 'pieza', role: 'none', style: `--i:${i}` });
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
      pieza.append(segmento);
      grupoSegmentos.append(pieza);
      segmentos.push(segmento);
    });
    svg.append(grupoSegmentos);

    // Capa de esmalte común (brillo interno y sombra externa) sobre todos los segmentos
    svg.append(crearSVG('path', {
      class: 'esmalte', d: rutaAnillo(GEO.interior, GEO.exterior), fill: 'url(#esmalte)', 'fill-rule': 'evenodd',
    }));

    // ---- Filetes de oro entre esmaltes (cloisonné) ----
    const alambres = crearSVG('g', { class: 'alambres', 'aria-hidden': 'true' });
    const trazoAlambres = [];
    for (let i = 0; i < TOTAL; i++) {
      const [x0, y0] = polar(GEO.interior, i * PASO + PASO / 2);
      const [x1, y1] = polar(GEO.exterior, i * PASO + PASO / 2);
      trazoAlambres.push(`M${x0} ${y0}L${x1} ${y1}`);
    }
    const dAlambres = trazoAlambres.join('') + rutaAnillo(GEO.interior, GEO.exterior);
    alambres.append(
      crearSVG('path', { class: 'alambre', d: dAlambres }),
      crearSVG('path', { class: 'alambre alambre--luz', d: dAlambres })
    );
    svg.append(alambres);

    // ---- Disco central: crema, filetes y collar de perlas ----
    const centro = crearSVG('g', { class: 'centro', 'aria-hidden': 'true' });
    centro.append(
      crearSVG('circle', { class: 'centro__disco', r: GEO.centro }),
      crearSVG('circle', { class: 'filete', r: GEO.centro, 'stroke-width': 1.3 }),
      crearSVG('circle', { class: 'filete', r: GEO.collar - 5.5, 'stroke-width': 0.5, opacity: 0.6 })
    );
    for (let g = 0; g < 360; g += 6) {
      const [x, y] = polar(GEO.collar, g);
      centro.append(crearSVG('circle', { class: 'centro__perla', cx: x, cy: y, r: 1.15 }));
    }
    svg.append(centro);

    // ---- Onda dorada que se expande al elegir ----
    onda = crearSVG('circle', { class: 'onda', r: GEO.centro });
    svg.append(onda);

    // ---- Copias elevadas de la tríada (esmalte + bisel de oro + sombra) ----
    const grupoRealces = crearSVG('g', { class: 'realces', filter: 'url(#sombra-realce)', 'aria-hidden': 'true' });
    COLORES.forEach((color, i) => {
      const d = rutaSector(i, GEO.interior, GEO.exterior);
      const realce = crearSVG('g', { class: 'realce' });
      const [cx, cy] = centroSector(i);
      realce.style.transformOrigin = `${cx}px ${cy}px`;
      realce.append(
        crearSVG('path', { d, fill: color.hex }),
        crearSVG('path', { d, fill: 'url(#esmalte)' }),
        crearSVG('path', { d, class: 'realce__borde', stroke: 'url(#oro-borde)' }),
        crearSVG('path', { d, class: 'realce__bisel' })
      );
      grupoRealces.append(realce);
      realces.push(realce);
    });
    svg.append(grupoRealces);

    // ---- Triángulo fantasma (vista previa al pasar el ratón) ----
    const vertices = [0, 120, 240].map((a) => polar(GEO.triangulo, a));
    const dTriangulo = `M${vertices[0].join(' ')}L${vertices[1].join(' ')}L${vertices[2].join(' ')}Z`;
    fantasma = crearSVG('g', { class: 'fantasma', 'aria-hidden': 'true' });
    fantasma.append(crearSVG('path', { d: dTriangulo }));
    svg.append(fantasma);

    // ---- Triángulo dorado con veladura de los tres colores y joyas en los vértices ----
    triangulo = crearSVG('g', { class: 'triangulo', 'aria-hidden': 'true' });
    const defsTriangulo = crearSVG('defs');
    vertices.forEach(([x, y], k) => {
      const gradiente = crearSVG('radialGradient', {
        id: `veladura-${k}`, class: 'triangulo__veladura', cx: x, cy: y, r: GEO.triangulo * 1.45, gradientUnits: 'userSpaceOnUse',
      });
      const p0 = crearSVG('stop', { offset: 0, 'stop-opacity': 0.38 });
      const p1 = crearSVG('stop', { offset: 1, 'stop-opacity': 0 });
      gradiente.append(p0, p1);
      defsTriangulo.append(gradiente);
      paradasVeladura.push([p0, p1]);
    });
    triangulo.append(defsTriangulo);
    vertices.forEach((_, k) => triangulo.append(crearSVG('path', { d: dTriangulo, fill: `url(#veladura-${k})` })));
    trazoTriangulo = crearSVG('path', { class: 'triangulo__trazo', d: dTriangulo, pathLength: 1 });
    triangulo.append(trazoTriangulo);
    vertices.forEach(([x, y]) => {
      const joya = crearSVG('g', { class: 'joya' });
      joya.append(
        crearSVG('circle', { cx: x, cy: y, r: 7.2, fill: 'url(#oro-borde)' }),
        crearSVG('circle', { class: 'joya__color', cx: x, cy: y, r: 5.4 }),
        crearSVG('ellipse', { cx: x - 1.7, cy: y - 1.9, rx: 2, ry: 1.3, fill: '#FFFFFF', opacity: 0.75 })
      );
      triangulo.append(joya);
      joyas.push(joya);
    });
    svg.append(triangulo);

    rotor.append(svg);
  }

  /* ------------------------------------------------------------------------
     7. Bucle de animación: giro con física, colgante e inclinación 3D
     ------------------------------------------------------------------------ */
  const curvas = {
    salidaCuarta: (t) => 1 - Math.pow(1 - t, 4),
  };

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
    const inclinando = pasoInclinacion(dt);
    idCuadro = girando || oscilando || inclinando ? requestAnimationFrame(bucle) : 0;
  }

  /** Avanza el giro según el modo actual. Devuelve true si sigue en movimiento. */
  function pasoGiro(dt, ahora) {
    if (giro.modo === 'muelle') {
      // Muelle amortiguado hacia el segmento objetivo (integración en subpasos de 8 ms)
      let resto = dt;
      while (resto > 0) {
        const h = Math.min(8, resto);
        resto -= h;
        const aceleracion = MUELLE.w * MUELLE.w * (giro.objetivo - giro.x) - 2 * MUELLE.z * MUELLE.w * giro.v;
        giro.v += aceleracion * h;
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

    if (giro.modo === 'tween') {
      const tw = giro.tween;
      const t = Math.min(1, Math.max(0, (ahora - tw.inicio) / tw.duracion));
      const anterior = giro.x;
      giro.x = tw.desde + (tw.hasta - tw.desde) * tw.curva(t);
      giro.v = dt > 0 ? (giro.x - anterior) / dt : 0;
      if (t >= 1) {
        giro.modo = 'reposo';
        giro.v = 0;
        giro.objetivo = tw.hasta;
        if (tw.alTerminar) tw.alTerminar();
      }
      pintarGiro();
      return giro.modo !== 'reposo';
    }

    return false;   // en reposo o en arrastre (el arrastre pinta en pointermove)
  }

  /** Aplica el giro a la rueda y a la luz reflejada; detecta el paso de segmentos. */
  function pintarGiro() {
    const transformacion = `rotate(${giro.x}deg)`;
    rotor.style.transform = transformacion;
    luz.style.transform = transformacion;

    // Cada vez que un filete de oro pasa bajo el colgante: clic, vibración y oscilación
    const tramo = Math.floor((giro.x + PASO / 2) / PASO);
    if (tramo !== giro.tramo) {
      const sentido = Math.sign(tramo - giro.tramo);
      giro.tramo = tramo;
      alPasarSegmento(sentido);
    }
    actualizarCandidato();
  }

  function alPasarSegmento(sentido) {
    if (sinMovimiento()) return;
    const rapidez = Math.abs(giro.v);
    // El filete empuja la punta del colgante en el sentido del giro
    colgante.v += -sentido * limitar(0.2 + rapidez * 0.3, 0.2, 0.55);
    sonido.tic(limitar(0.35 + rapidez * 0.45, 0.35, 1));
    if (estado.tactil && navigator.vibrate) {
      try { navigator.vibrate(4); } catch (_) { /* sin vibración */ }
    }
    despertar();
  }

  /** Oscilación amortiguada del colgante. */
  function pasoColgante(dt) {
    if (colgante.x === 0 && colgante.v === 0) return false;
    let resto = dt;
    while (resto > 0) {
      const h = Math.min(8, resto);
      resto -= h;
      const aceleracion = -COLGANTE.w * COLGANTE.w * colgante.x - 2 * COLGANTE.z * COLGANTE.w * colgante.v;
      colgante.v += aceleracion * h;
      colgante.x = limitar(colgante.x + colgante.v * h, -24, 24);
    }
    if (Math.abs(colgante.x) < 0.03 && Math.abs(colgante.v) < 0.001) {
      colgante.x = 0;
      colgante.v = 0;
    }
    indicador.style.transform = `rotate(${colgante.x.toFixed(2)}deg)`;
    return colgante.x !== 0 || colgante.v !== 0;
  }

  /** Inclinación 3D suavizada hacia el objetivo marcado por el ratón. */
  function pasoInclinacion(dt) {
    const k = 1 - Math.exp(-dt / 120);
    inclinacion.x += (inclinacion.objetivoX - inclinacion.x) * k;
    inclinacion.y += (inclinacion.objetivoY - inclinacion.y) * k;
    const quieto =
      Math.abs(inclinacion.objetivoX - inclinacion.x) < 0.01 &&
      Math.abs(inclinacion.objetivoY - inclinacion.y) < 0.01;
    if (quieto) {
      inclinacion.x = inclinacion.objetivoX;
      inclinacion.y = inclinacion.objetivoY;
    }
    marco.style.setProperty('--rx', `${inclinacion.x.toFixed(3)}deg`);
    marco.style.setProperty('--ry', `${inclinacion.y.toFixed(3)}deg`);
    // valores sin unidad (-1 … 1) para desplazar brillo y sombra
    marco.style.setProperty('--ix', (inclinacion.y / INCLINACION_MAX).toFixed(3));
    marco.style.setProperty('--iy', (-inclinacion.x / INCLINACION_MAX).toFixed(3));
    return !quieto;
  }

  /** Lleva la rueda a "destino" con el muelle, partiendo de la velocidad dada. */
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

  /** Ángulo en el que terminará la rueda (sirve al teclado durante un giro). */
  function destinoActual() {
    if (giro.modo === 'muelle') return giro.objetivo;
    if (giro.modo === 'tween') return giro.tween.hasta;
    return Math.round(giro.x / PASO) * PASO;
  }

  /** Muestra en la etiqueta y en la gema del colgante el color bajo el colgante. */
  function actualizarCandidato() {
    const indice = indiceEnIndicador(giro.x);
    if (indice === estado.candidato) return;
    estado.candidato = indice;
    const color = COLORES[indice];
    etiquetaPunto.style.backgroundColor = color.hex;
    etiquetaNombre.textContent = color.nombre;
    etiquetaPuntos.innerHTML = perlasHTML(CATEGORIAS[color.categoria].nivel);
    gemaIndicador.setAttribute('fill', color.hex);
    rueda.setAttribute('aria-activedescendant', `color-${indice}`);
    // Mientras se arrastra, el triángulo punteado anticipa la tríada que va a quedar
    if (arrastre && arrastre.movido) mostrarFantasma(indice);
  }

  /* ------------------------------------------------------------------------
     8. Selección y tríada
     ------------------------------------------------------------------------ */
  function seleccionar(indice, opciones) {
    const { animarTarjetas = true, anunciar = true, sonar = true } = opciones || {};
    if (indice === estado.seleccionado) return;
    estado.seleccionado = indice;

    const triada = triadaDe(indice);
    escena.classList.add('con-seleccion');

    segmentos.forEach((segmento, i) => {
      const enTriada = triada.includes(i);
      segmento.classList.toggle('en-triada', enTriada);
      segmento.setAttribute('aria-selected', String(i === indice));
      realces[i].classList.toggle('activo', enTriada);
      realces[i].classList.toggle('principal', i === indice);
      rotulos[i].classList.toggle('en-triada', enTriada);
      perlasCategoria[i].classList.toggle('en-triada', enTriada);
    });

    girarTriangulo(indice);
    ocultarFantasma();
    animarSeleccion();
    actualizarTarjetas(triada, animarTarjetas);

    const nombreTriada = CATEGORIAS[COLORES[indice].categoria].triada;
    const nombres = triada.map((i) => COLORES[i].nombre.toLowerCase());
    tituloTriada.textContent = nombreTriada;
    coloresTriada.textContent = capitalizar(enumerar(nombres));

    if (sonar) sonido.acorde(indice);
    if (anunciar) {
      anunciador.textContent = `${COLORES[indice].nombre} seleccionado. ${nombreTriada}: ${enumerar(nombres)}.`;
    }
  }

  /** Ángulo equivalente más cercano, sabiendo que el triángulo se repite cada 120°. */
  function anguloTrianguloCercano(actual, indice) {
    return actual + mod(indice * PASO - actual + 60, 120) - 60;
  }

  /** Gira el triángulo, sus joyas, sus veladuras y la luz reflejada hacia la nueva tríada. */
  function girarTriangulo(indice) {
    estado.anguloTriangulo = anguloTrianguloCercano(estado.anguloTriangulo, indice);
    triangulo.style.transform = `rotate(${estado.anguloTriangulo}deg)`;

    [0, 1, 2].forEach((k) => {
      const anguloVertice = estado.anguloTriangulo + k * 120;
      const color = COLORES[mod(Math.round(anguloVertice / PASO), TOTAL)].hex;
      joyas[k].querySelector('.joya__color').style.fill = color;
      paradasVeladura[k].forEach((parada) => { parada.style.stopColor = color; });
      manchasLuz[k].style.setProperty('--c', color);
      manchasLuz[k].style.setProperty('--a', `${anguloVertice}deg`);
    });
  }

  /** Coreografía al elegir: el triángulo se dibuja, las joyas brotan y una onda recorre la rueda. */
  function animarSeleccion() {
    if (sinMovimiento() || typeof trazoTriangulo.animate !== 'function') return;
    trazoTriangulo.animate(
      [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
      { duration: 700, easing: 'cubic-bezier(.65, 0, .35, 1)' }
    );
    joyas.forEach((joya, k) => {
      joya.animate(
        [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
        { duration: 520, delay: 120 + k * 90, easing: 'cubic-bezier(.34, 1.56, .64, 1)', fill: 'backwards' }
      );
    });
    onda.animate(
      [
        { transform: 'scale(1)', opacity: 0.85, strokeWidth: 1.6 },
        { transform: 'scale(1.72)', opacity: 0, strokeWidth: 0.6 },
      ],
      { duration: 900, easing: 'cubic-bezier(.22, .8, .24, 1)' }
    );
  }

  /** Vista previa: triángulo punteado hacia la tríada del color bajo el ratón. */
  function mostrarFantasma(indice) {
    if (estado.seleccionado >= 0 && triadaDe(estado.seleccionado).includes(indice)) {
      ocultarFantasma();
      return;
    }
    estado.anguloFantasma = anguloTrianguloCercano(estado.anguloFantasma, indice);
    fantasma.style.transform = `rotate(${estado.anguloFantasma}deg)`;
    fantasma.classList.add('visible');
  }

  function ocultarFantasma() {
    if (fantasma) fantasma.classList.remove('visible');
  }

  /** Clic o toque en un segmento: se elige y la rueda lo lleva bajo el colgante. */
  function elegirSegmento(indice) {
    const destino = giro.x + normalizar(-indice * PASO - giro.x);
    moverConMuelle(destino, 0);
    seleccionar(indice);
  }

  /* ------------------------------------------------------------------------
     9. Tarjetas
     ------------------------------------------------------------------------ */
  let turnoTarjetas = 0;   // evita que una animación vieja pise a una más reciente

  function crearTarjetas() {
    const plantilla = document.getElementById('plantilla-tarjeta');
    for (let p = 0; p < 3; p++) {
      const tarjeta = plantilla.content.firstElementChild.cloneNode(true);
      tarjeta.dataset.posicion = p;
      tarjeta.style.setProperty('--p', p);
      tarjeta.querySelector('.tarjeta__posicion').textContent = ETIQUETA_POSICION[p];
      tarjeta.addEventListener('click', () => copiarTarjeta(tarjeta));
      contenedorTarjetas.append(tarjeta);
      tarjetas.push(tarjeta);
    }
  }

  function rellenarTarjeta(tarjeta, color, posicion) {
    const [r, g, b] = hexARgb(color.hex);
    const nivel = CATEGORIAS[color.categoria].nivel;
    tarjeta.dataset.hex = color.hex;
    tarjeta.querySelector('.tarjeta__nombre').textContent = color.nombre;
    tarjeta.querySelector('.tarjeta__categoria .puntos').innerHTML = perlasHTML(nivel);
    tarjeta.querySelector('.tarjeta__categoria-texto').textContent = capitalizar(color.categoria);
    tarjeta.querySelector('.tarjeta__hex').textContent = color.hex;
    tarjeta.querySelector('.tarjeta__rgb').textContent = `RGB ${r}, ${g}, ${b}`;
    tarjeta.setAttribute(
      'aria-label',
      `${ETIQUETA_POSICION[posicion]}: ${color.nombre}, ${color.categoria}, ${color.hex}. Copiar código HEX`
    );
    tarjeta.classList.remove('copiada');
  }

  function actualizarTarjetas(triada, animar) {
    const turno = ++turnoTarjetas;

    tarjetas.forEach((tarjeta, posicion) => {
      const color = COLORES[triada[posicion]];
      const datos = tarjeta.querySelector('.tarjeta__datos');
      const muestra = tarjeta.querySelector('.tarjeta__muestra');
      const tinta = tarjeta.querySelector('.tarjeta__tinta');
      const puedeAnimar = animar && !sinMovimiento() && typeof datos.animate === 'function';

      [datos, tinta].forEach((el) => el.getAnimations && el.getAnimations().forEach((a) => a.cancel()));
      if (!puedeAnimar) {
        rellenarTarjeta(tarjeta, color, posicion);
        muestra.style.setProperty('--muestra', color.hex);
        return;
      }

      const retraso = posicion * 80;

      // 1) La tinta del nuevo color brota desde el centro de la muestra
      tinta.style.backgroundColor = color.hex;
      const gota = tinta.animate(
        [{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
        { duration: 560, delay: retraso, easing: 'cubic-bezier(.22, .8, .24, 1)', fill: 'forwards' }
      );
      gota.finished
        .then(() => {
          if (turno !== turnoTarjetas) return;
          muestra.style.setProperty('--muestra', color.hex);
          gota.cancel();
        })
        .catch(() => { /* cancelada por un cambio más reciente */ });

      // 2) El texto se desvanece con un leve desenfoque y vuelve con el nuevo color
      const salida = datos.animate(
        [
          { opacity: 1, filter: 'blur(0px)', transform: 'none' },
          { opacity: 0, filter: 'blur(5px)', transform: 'translateY(5px)' },
        ],
        { duration: 180, delay: retraso, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' }
      );
      salida.finished
        .then(() => {
          if (turno !== turnoTarjetas) return;
          rellenarTarjeta(tarjeta, color, posicion);
          const entrada = datos.animate(
            [
              { opacity: 0, filter: 'blur(5px)', transform: 'translateY(-5px)' },
              { opacity: 1, filter: 'blur(0px)', transform: 'none' },
            ],
            { duration: 380, easing: 'cubic-bezier(.22, .8, .24, 1)', fill: 'forwards' }
          );
          salida.cancel();
          return entrada.finished.then(() => entrada.cancel());
        })
        .catch(() => { /* cancelada por un cambio más reciente */ });
    });
  }

  /** Copia texto al portapapeles (con alternativa para navegadores antiguos o file://). */
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
    const puntos = document.createElement('span');
    puntos.className = 'aviso__puntos';
    colores.forEach((hex) => {
      const punto = document.createElement('span');
      punto.className = 'aviso__punto';
      punto.style.backgroundColor = hex;
      puntos.append(punto);
    });
    const mensaje = document.createElement('span');
    mensaje.textContent = texto;
    aviso.replaceChildren(puntos, mensaje);
    aviso.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.remove('visible'), 2000);
  }

  const temporizadoresCopia = new WeakMap();
  async function copiarTarjeta(tarjeta) {
    sonido.desbloquear();
    const hex = tarjeta.dataset.hex;
    const ok = await copiarTexto(hex);
    tarjeta.focus({ preventScroll: true });   // el método alternativo mueve el foco

    if (!ok) {
      mostrarAviso(`No se pudo copiar. Código: ${hex}`, [hex]);
      return;
    }
    mostrarAviso(`${hex} copiado`, [hex]);
    if (sonido.listo()) sonido.nota(1046.5, sonido.ctx.currentTime + 0.01, 0.1);
    const texto = tarjeta.querySelector('.tarjeta__accion-texto');
    texto.textContent = 'Copiado';
    tarjeta.classList.add('copiada');
    clearTimeout(temporizadoresCopia.get(tarjeta));
    temporizadoresCopia.set(tarjeta, setTimeout(() => {
      tarjeta.classList.remove('copiada');
      texto.textContent = 'Copiar HEX';
    }, 1700));
  }

  botonPaleta.addEventListener('click', async () => {
    sonido.desbloquear();
    if (estado.seleccionado < 0) return;
    const hexes = triadaDe(estado.seleccionado).map((i) => COLORES[i].hex);
    const ok = await copiarTexto(hexes.join(', '));
    botonPaleta.focus({ preventScroll: true });
    mostrarAviso(ok ? `Paleta copiada: ${hexes.join(', ')}` : `No se pudo copiar: ${hexes.join(', ')}`, hexes);
    if (ok) sonido.acorde(estado.seleccionado);
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

  rueda.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    sonido.desbloquear();
    estado.tactil = e.pointerType !== 'mouse';
    estado.interactuado = true;
    const centro = centroDeRueda();
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
    // La mano detiene la rueda y el plato se endereza para girar con precisión
    giro.modo = 'arrastre';
    giro.v = 0;
    inclinacion.objetivoX = 0;
    inclinacion.objetivoY = 0;
    ocultarFantasma();
    despertar();
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
    const distanciaAlCentro = Math.hypot(e.clientX - centro.x, e.clientY - centro.y);
    if (distanciaAlCentro > centro.radio * 0.12) {
      const delta = normalizar(angulo - arrastre.angulo);
      giro.v = 0.6 * (delta / dt) + 0.4 * giro.v;   // velocidad suavizada (para el sonido)
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

    // Toque o clic sin arrastrar: elegir el segmento pulsado
    if (!datos.movido) {
      if (datos.segmento && !cancelado) {
        elegirSegmento(Number(datos.segmento.dataset.indice));
      } else {
        const destino = Math.round(giro.x / PASO) * PASO;
        moverConMuelle(destino, 0);
        if (estado.seleccionado === -1) seleccionar(indiceEnIndicador(destino));
      }
      return;
    }

    // Arrastre: velocidad de los últimos 90 ms → vuelo libre proyectado → muelle al segmento
    const ahora = e.timeStamp;
    const recientes = datos.muestras.filter((m) => ahora - m.t <= 90);
    recientes.push({ t: ahora, a: giro.x });
    let velocidad = 0;
    if (recientes.length >= 2 && !cancelado) {
      const primera = recientes[0];
      const ultima = recientes[recientes.length - 1];
      velocidad = (ultima.a - primera.a) / Math.max(16, ultima.t - primera.t);
    }
    if (sinMovimiento()) velocidad = 0;
    const vuelo = limitar(velocidad * PROYECCION, -720, 720);
    const destino = Math.round((giro.x + vuelo) / PASO) * PASO;

    moverConMuelle(destino, velocidad);
    seleccionar(indiceEnIndicador(destino));
  }

  rueda.addEventListener('pointerup', (e) => terminarArrastre(e, false));
  rueda.addEventListener('pointercancel', (e) => terminarArrastre(e, true));
  rueda.addEventListener('lostpointercapture', (e) => terminarArrastre(e, true));
  // Evita el menú contextual al mantener pulsado en pantallas táctiles
  rueda.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ------------------------------------------------------------------------
     11. Ratón: inclinación 3D y vista previa de la tríada
     ------------------------------------------------------------------------ */
  marco.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || arrastre || sinMovimiento()) return;
    const c = centroDeRueda();
    const nx = limitar((e.clientX - c.x) / c.radio, -1, 1);
    const ny = limitar((e.clientY - c.y) / c.radio, -1, 1);
    // El lado bajo el puntero se hunde un poco, como al apoyar la mano en la bandeja
    inclinacion.objetivoY = nx * INCLINACION_MAX;
    inclinacion.objetivoX = -ny * INCLINACION_MAX;
    despertar();
  });

  marco.addEventListener('pointerleave', () => {
    inclinacion.objetivoX = 0;
    inclinacion.objetivoY = 0;
    ocultarFantasma();
    despertar();
  });

  rueda.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || arrastre) return;
    const segmento = e.target.closest ? e.target.closest('[data-indice]') : null;
    if (segmento) mostrarFantasma(Number(segmento.dataset.indice));
    else ocultarFantasma();
  });

  /* ------------------------------------------------------------------------
     12. Teclado: flechas para girar, Enter o Espacio para elegir
     ------------------------------------------------------------------------ */
  rueda.addEventListener('keydown', (e) => {
    estado.interactuado = true;
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
        sonido.desbloquear();
        seleccionar(indiceEnIndicador(destinoActual()));
        return;
      default:
        return;
    }
    e.preventDefault();
    sonido.desbloquear();
    estado.tactil = false;
    const base = Math.round(destinoActual() / PASO) * PASO;
    moverConMuelle(base - pasos * PASO, giro.modo === 'muelle' ? giro.v : 0);
  });

  /* ------------------------------------------------------------------------
     13. Interruptor de sonido
     ------------------------------------------------------------------------ */
  function pintarBotonSonido() {
    botonSonido.setAttribute('aria-pressed', String(sonido.activo));
    botonSonido.setAttribute('aria-label', sonido.activo ? 'Sonido activado' : 'Sonido desactivado');
    botonSonido.title = sonido.activo ? 'Silenciar' : 'Activar sonido';
  }

  botonSonido.addEventListener('click', () => {
    sonido.activo = !sonido.activo;
    guardarPreferencia('circulo-cromatico:sonido', sonido.activo);
    pintarBotonSonido();
    if (sonido.activo) {
      sonido.desbloquear();
      // pequeña confirmación audible una vez listo el contexto
      setTimeout(() => { if (sonido.listo()) sonido.nota(784, sonido.ctx.currentTime + 0.01, 0.12); }, 40);
    }
  });

  /* ------------------------------------------------------------------------
     14. Inicio: el título entra letra a letra, la rueda llega girando
         y se descubre la tríada primaria
     ------------------------------------------------------------------------ */
  function prepararTitulo() {
    const titulo = document.getElementById('titulo');
    const texto = titulo.textContent.trim();
    titulo.setAttribute('aria-label', texto);
    titulo.textContent = '';
    let n = 0;
    texto.split(' ').forEach((palabra, i) => {
      if (i > 0) titulo.append(' ');
      const bloque = document.createElement('span');
      bloque.className = 'titulo__palabra';
      bloque.setAttribute('aria-hidden', 'true');
      Array.from(palabra).forEach((letra) => {
        const span = document.createElement('span');
        span.className = 'titulo__letra';
        span.style.setProperty('--i', n++);
        span.textContent = letra;
        bloque.append(span);
      });
      titulo.append(bloque);
    });
  }

  function iniciar() {
    if (!sinMovimiento()) prepararTitulo();
    construirRueda();
    girarTriangulo(0);   // colores iniciales del triángulo y de la luz (aún invisibles)
    crearTarjetas();
    pintarBotonSonido();

    // Las tarjetas parten con la tríada primaria, sin animación
    actualizarTarjetas(triadaDe(0), false);

    if (sinMovimiento()) {
      giro.x = 0;
      pintarGiro();
      seleccionar(0, { animarTarjetas: false, anunciar: false, sonar: false });
      return;
    }

    // La rueda llega girando casi media vuelta y se detiene con el amarillo arriba
    giro.x = -165;
    giro.tramo = Math.floor((giro.x + PASO / 2) / PASO);
    pintarGiro();
    setTimeout(() => {
      if (estado.interactuado) return;   // el usuario ya la ha tocado
      giro.tween = {
        desde: giro.x,
        hasta: 0,
        inicio: performance.now(),
        duracion: 1900,
        curva: curvas.salidaCuarta,
        alTerminar: () => {
          if (estado.seleccionado === -1) seleccionar(0, { animarTarjetas: false, anunciar: false, sonar: false });
        },
      };
      giro.modo = 'tween';
      despertar();
    }, 450);
  }

  iniciar();
})();
