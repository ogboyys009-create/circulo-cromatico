/* ==========================================================================
   Círculo Cromático — js/app.js

   Una sola rueda con tres pestañas:
   - Color: círculo RYB de 96 colores con armonías (tríada, complementario,
     análogo, complementario dividido y tétrada) y búsqueda por código.
   - Tonos: 48 tintes y sombras del color elegido, con su escala 50–950.
   - Grises: 48 grises del blanco al negro (neutros, cálidos o fríos).

   Rendimiento:
   - El anillo se dibuja una vez por pestaña. Al girar solo cambia un transform.
   - Al soltar, el giro (inercia y muelle) se calcula de antemano y se
     reproduce con Web Animations: lo ejecuta el compositor del navegador,
     así va fluido aunque el hilo principal esté ocupado.
   - Durante el arrastre las escrituras se agrupan en un fotograma.
   JavaScript nativo, sin dependencias.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Datos
     ------------------------------------------------------------------------ */

  /**
   * 96 colores del círculo tradicional (RYB) en sentido horario desde el
   * amarillo (0°), cada 3,75°. Primarios a 0°, 120° y 240°; secundarios entre
   * ellos; terciarios entre primario y secundario; y entre cada par vecino,
   * colores intermedios con nombre propio.
   */
  const COLORES = [
    ['Amarillo', '#FFD400'], ['Canario', '#FFCF00'], ['Girasol', '#FFC900'], ['Mimosa', '#FFC400'],
    ['Amarillo dorado', '#FFBE00'], ['Oro', '#FFB900'], ['Ámbar', '#FFB300'], ['Miel', '#FFAE00'],
    ['Amarillo-naranja', '#FFA800'], ['Mango', '#FFA200'], ['Azafrán', '#FF9C00'], ['Albaricoque', '#FF9700'],
    ['Mandarina', '#FF9100'], ['Clementina', '#FF8C00'], ['Zanahoria', '#FF8600'], ['Butano', '#FF8100'],
    ['Naranja', '#FF7B00'], ['Caléndula', '#FE7504'], ['Papaya', '#FD6E08'], ['Pimentón', '#FC680C'],
    ['Calabaza', '#FA6110'], ['Cobre', '#F95B13'], ['Teja', '#F75416'], ['Coral', '#F64E19'],
    ['Rojo-naranja', '#F4471C'], ['Lava', '#F2421D'], ['Tomate', '#F03D1E'], ['Amapola', '#EE391F'],
    ['Bermellón', '#EC3420'], ['Cadmio', '#EA301F'], ['Escarlata', '#E72B1D'], ['Cereza', '#E5271C'],
    ['Rojo', '#E2231A'], ['Fresa', '#DE2125'], ['Rubí', '#DA1E2F'], ['Granate', '#D61C3A'],
    ['Carmín', '#D11A45'], ['Grosella', '#CD1A4F'], ['Frambuesa', '#C81959'], ['Fucsia', '#C41963'],
    ['Rojo-violeta', '#C0186D'], ['Buganvilla', '#B81A77'], ['Magenta', '#AF1C81'], ['Orquídea', '#A71F8C'],
    ['Púrpura', '#9F2196'], ['Ciruela', '#97249E'], ['Uva', '#8E26A5'], ['Morado', '#8629AD'],
    ['Violeta', '#7D2BB5'], ['Glicinia', '#772DB7'], ['Jacaranda', '#702FB9'], ['Iris', '#6A31BB'],
    ['Amatista', '#6433BD'], ['Campanilla', '#5E35BF'], ['Índigo', '#5837C0'], ['Pervinca', '#523AC2'],
    ['Azul-violeta', '#4C3CC4'], ['Lapislázuli', '#4641C6'], ['Zafiro', '#4045C7'], ['Azul Prusia', '#3A4AC9'],
    ['Ultramar', '#344ECB'], ['Azul Klein', '#2E52CD'], ['Cobalto', '#2856CE'], ['Azul eléctrico', '#235BD0'],
    ['Azul', '#1D5FD1'], ['Azul Francia', '#1867CD'], ['Azur', '#136EC8'], ['Cielo', '#0F76C4'],
    ['Cerúleo', '#0A7DC0'], ['Cian', '#0884BA'], ['Pavo real', '#058AB3'], ['Petróleo', '#0391AD'],
    ['Azul-verde', '#0098A6'], ['Aguamarina', '#049A9B'], ['Turquesa', '#089C90'], ['Menta', '#0C9E85'],
    ['Esmeralda', '#10A07A'], ['Malaquita', '#14A26E'], ['Jade', '#17A362'], ['Viridián', '#1BA556'],
    ['Verde', '#1FA74A'], ['Albahaca', '#2EAB44'], ['Trébol', '#3DAF3E'], ['Helecho', '#4CB438'],
    ['Verde hierba', '#5BB832'], ['Kiwi', '#6BBD2D'], ['Manzana', '#7BC127'], ['Pistacho', '#8BC622'],
    ['Amarillo-verde', '#9BCB1C'], ['Chartreuse', '#A8CD19'], ['Pera', '#B5CE15'], ['Cítrico', '#C2D012'],
    ['Lima', '#CFD20E'], ['Pomelo', '#DBD30B'], ['Limón', '#E7D307'], ['Plátano', '#F3D404'],
  ].map(([nombre, hex], i) => ({ nombre, hex, categoria: categoriaDe(i), slug: aSlug(nombre), hsl: hslDe(hex) }));

  function categoriaDe(i) {
    if (i % 32 === 0) return 'primario';
    if (i % 32 === 16) return 'secundario';
    if (i % 16 === 8) return 'terciario';
    return 'intermedio';
  }

  const NC = COLORES.length;   // 96 colores en la pestaña Color
  const NE = 48;               // 48 pasos en las ruedas de tonos y de grises
  const BASE_TONAL = 24;       // posición del color base en la rueda de tonos

  /** Armonías: posiciones relativas al color elegido (en pasos de 3,75°). */
  const ARMONIAS = {
    triada: {
      nombre: 'Tríada',
      pasos: [0, 32, 64],
      periodo: 120,   // la figura se repite cada 120°: la capa gira por el camino más corto
      texto: 'Tres colores separados 120°. Contraste vivo y equilibrado: deja que uno domine y usa los otros como acento.',
    },
    complementario: {
      nombre: 'Complementario',
      pasos: [0, 48],
      periodo: 180,
      texto: 'Dos colores opuestos, a 180°. Es el contraste más fuerte: úsalo para que algo destaque.',
    },
    analogo: {
      nombre: 'Análogo',
      pasos: [0, 8, 88],
      periodo: 360,
      texto: 'Tu color y sus vecinos a 30°. Una combinación tranquila y natural, con poco contraste.',
    },
    dividido: {
      nombre: 'Complementario dividido',
      pasos: [0, 40, 56],
      periodo: 360,
      texto: 'Tu color y los dos vecinos de su opuesto (150° y 210°). Contraste fuerte, más fácil de equilibrar que el complementario.',
    },
    tetrada: {
      nombre: 'Tétrada',
      pasos: [0, 24, 48, 72],
      periodo: 90,
      texto: 'Cuatro colores a 90°: dos parejas de complementarios. Paleta rica que funciona mejor si uno manda.',
    },
  };

  const NOMBRE_TRIADA = {
    primario: 'Tríada primaria',
    secundario: 'Tríada secundaria',
    terciario: 'Tríada terciaria',
    intermedio: 'Tríada intermedia',
  };

  /** Temperatura de los grises: un toque de matiz que se apaga hacia el blanco y el negro. */
  const TEMPERATURAS = {
    neutro: { nombre: 'Neutro', plural: 'neutros', h: 0, s: 0 },
    calido: { nombre: 'Cálido', plural: 'cálidos', h: 38, s: 11 },
    frio: { nombre: 'Frío', plural: 'fríos', h: 215, s: 11 },
  };

  /** Escala 50–950: mezcla con blanco (hacia el 50) o con negro (hacia el 950). El 500 es el color. */
  const PASOS_ESCALA = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const MEZCLAS_ESCALA = [['#FFFFFF', 0.92], ['#FFFFFF', 0.82], ['#FFFFFF', 0.64], ['#FFFFFF', 0.46], ['#FFFFFF', 0.24], [null, 0],
    ['#000000', 0.18], ['#000000', 0.36], ['#000000', 0.52], ['#000000', 0.68], ['#000000', 0.8]];
  const LUCES_GRIS = [98, 95, 89, 81, 64, 46, 36, 28, 18, 11, 6];

  /** Geometría del dibujo en unidades del viewBox (-120 … 120). */
  const GEO = { exterior: 100, interior: 64, marcador: 82 };
  const HUECOS = { 96: [0.9, 0.7], 48: [1.5, 1.6] };   // hueco y esquina según el número de sectores
  const RADIO_CENTRO = 56;          // disco central (zona para desplazar la página en táctil)

  const MUELLE = { w: 0.013, z: 0.82 };   // asentado con un rebote casi imperceptible
  const PROYECCION = 300;                 // ms de vuelo libre que se suman al lanzar la rueda
  const UMBRAL_ARRASTRE = 6;              // px para distinguir arrastre de toque
  const SALTO = 8;                        // Mayús + flecha o RePág/AvPág
  const OSCURO = '#141416';
  const AA = 4.5;                         // contraste mínimo para texto (WCAG AA)

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const preferenciaMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
  const preferenciaOscura = window.matchMedia('(prefers-color-scheme: dark)');

  /* ------------------------------------------------------------------------
     2. Referencias al DOM
     ------------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const marco = $('rueda-marco');
  const rueda = $('rueda');
  const rotor = $('rotor');
  const centro = $('centro');
  const capa = $('capa');
  const lecturaNombre = $('lectura-nombre');
  const lecturaHex = $('lectura-hex');
  const lecturaTipo = $('lectura-tipo');
  const lecturaGrados = $('lectura-grados');
  const tituloArmonia = $('titulo-armonia');
  const textoArmonia = $('texto-armonia');
  const listaMuestras = $('muestras');
  const buscador = $('buscador');
  const campo = $('codigo');
  const previa = $('codigo-muestra');
  const aviso = $('aviso');
  const anunciador = $('anunciador');
  const indicador = document.querySelector('.pestanas__indicador');
  const pestanas = Array.from(document.querySelectorAll('[role="tab"]'));

  /* ------------------------------------------------------------------------
     3. Estado
     ------------------------------------------------------------------------ */
  const est = {
    activa: 'color',
    formato: 'hex',
    tactil: false,
    vista: -1,         // posición que se muestra (bajo el puntero al arrastrar)
    marcado: 0,        // posición con aria-selected en el anillo actual
    anguloCapa: 0,     // giro de la capa de armonía dentro de la rueda (pestaña Color)
    color: { indice: 0, personal: null, modo: 'triada', angulo: 0 },
    tonos: { indice: BASE_TONAL, base: null, angulo: -BASE_TONAL * (360 / NE) },
    grises: { indice: 0, temperatura: 'neutro', angulo: 0 },
  };

  // Rueda activa: número de sectores, grados por sector y sus colores
  let TOTAL = NC;
  let PASO = 360 / TOTAL;
  let anillo = COLORES;

  // Giro de la rueda: ángulo en reposo y animación en curso (Web Animations)
  const mov = { x: 0, anim: null, puntos: null };

  /* ------------------------------------------------------------------------
     4. Utilidades
     ------------------------------------------------------------------------ */
  function mod(n, m) { return ((n % m) + m) % m; }
  const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
  const redondear = (n) => Math.round(n * 100) / 100;
  const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const sinMovimiento = () => preferenciaMovimiento.matches;
  const indiceEn = (angulo) => mod(Math.round(-angulo / PASO), TOTAL);
  /** "3,75°" con coma decimal. */
  const grados = (g) => `${String(redondear(g)).replace('.', ',')}°`;
  const ratio = (r) => `${r.toFixed(1).replace('.', ',')}:1`;

  /** Lleva un ángulo a (-180, 180] para girar por el camino corto. */
  function normalizar(a) {
    const r = mod(a, 360);
    return r > 180 ? r - 360 : r;
  }

  /** Ángulo equivalente a "objetivo" (módulo "periodo") más cercano a "actual". */
  function cercano(actual, objetivo, periodo) {
    return actual + mod(objetivo - actual + periodo / 2, periodo) - periodo / 2;
  }

  /** Punto del SVG (0° arriba, sentido horario). */
  function polar(radio, g) {
    const rad = (g * Math.PI) / 180;
    return [redondear(radio * Math.sin(rad)), redondear(-radio * Math.cos(rad))];
  }

  function crearSVG(etiqueta, atributos) {
    const el = document.createElementNS(SVG_NS, etiqueta);
    for (const clave in atributos) el.setAttribute(clave, atributos[clave]);
    return el;
  }

  function aSlug(texto) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  const enumerar = (lista) => (lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}` : lista[0]);

  /* ---- Color ---- */
  function hexARgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbAHex(rgb) {
    return '#' + rgb.map((v) => limitar(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  /** HSL con decimales: [matiz 0-360, saturación 0-100, luz 0-100]. */
  function hslDe(hex) {
    const [r, g, b] = hexARgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }

  function hslAHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return rgbAHex([f(0), f(8), f(4)].map((v) => v * 255));
  }

  /** Mezcla dos colores: t = 0 → a, t = 1 → b. */
  function mezclar(a, b, t) {
    const x = hexARgb(a);
    const y = hexARgb(b);
    return rgbAHex(x.map((v, k) => v + (y[k] - v) * t));
  }

  /** Luminancia relativa (WCAG). */
  function luminancia(hex) {
    const [r, g, b] = hexARgb(hex).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  const contrasteLum = (la, lb) => (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  const contraste = (a, b) => contrasteLum(luminancia(a), luminancia(b));

  /** Color de texto que mejor se lee sobre "hex" (blanco o casi negro) y su contraste. */
  function textoSobre(hex) {
    const conBlanco = contraste(hex, '#FFFFFF');
    const conOscuro = contraste(hex, OSCURO);
    return conBlanco >= conOscuro ? { color: '#FFFFFF', ratio: conBlanco } : { color: OSCURO, ratio: conOscuro };
  }

  /** Cinco tonos: dos más claros, el color y dos más oscuros. */
  function tonosDe(hex) {
    return [mezclar(hex, '#FFFFFF', 0.7), mezclar(hex, '#FFFFFF', 0.4), hex, mezclar(hex, '#000000', 0.25), mezclar(hex, '#000000', 0.5)];
  }

  function formatear(hex, formato) {
    const rgb = hexARgb(hex);
    if (formato === 'rgb') return `rgb(${rgb.join(', ')})`;
    if (formato === 'hsl') {
      const [h, s, l] = hslDe(hex).map(Math.round);
      return `hsl(${h % 360}, ${s}%, ${l}%)`;
    }
    return hex;
  }

  /* ---- Traducción de cualquier color al círculo RYB ----
     El matiz HSL de los 96 colores baja de forma continua al recorrer la rueda
     (una vuelta = 360°). Con esa tabla se pasa de matiz HSL a posición RYB y
     al revés, interpolando entre vecinos. */
  const MATIZ = (() => {
    const u = [COLORES[0].hsl[0]];
    for (let i = 1; i <= NC; i++) {
      const h = COLORES[i % NC].hsl[0];
      u.push(u[i - 1] - mod(u[i - 1] - h, 360));
    }
    return u;
  })();

  /** Posición en la rueda de color (índice con decimales, 0 … 96) de un matiz HSL. */
  function posicionDeMatiz(h) {
    const bajada = mod(MATIZ[0] - h, 360);
    for (let i = 0; i < NC; i++) {
      const a = MATIZ[0] - MATIZ[i];
      const b = MATIZ[0] - MATIZ[i + 1];
      if (bajada >= a && bajada <= b) return i + (b > a ? (bajada - a) / (b - a) : 0);
    }
    return 0;
  }

  /** Color de la rueda (en HSL) en una posición con decimales. */
  function hslEnPosicion(x) {
    const p = mod(x, NC);
    const i = Math.floor(p);
    const t = p - i;
    const a = COLORES[i].hsl;
    const b = COLORES[(i + 1) % NC].hsl;
    return [mod(MATIZ[i] + (MATIZ[i + 1] - MATIZ[i]) * t, 360), a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  /**
   * Color de la armonía para un código propio: el mismo desplazamiento en la
   * rueda RYB, conservando cuánto se aparta el código (en saturación y luz)
   * del color puro de la rueda. Así un azul pastel da una tríada pastel.
   */
  function derivar(personal, pasos) {
    if (personal.neutro) return personal.hex;   // un gris no tiene matiz: su armonía es él mismo
    const [, s, l] = personal.hsl;
    const ref = hslEnPosicion(personal.x);
    const obj = hslEnPosicion(personal.x + pasos);
    const s2 = ref[1] > 0.5 ? limitar((obj[1] * s) / ref[1], 0, 100) : 0;
    const l2 = limitar(obj[2] + (l - ref[2]), 0, 100);
    return hslAHex(obj[0], s2, l2);
  }

  const cercanoEnRueda = (hex) => COLORES[mod(Math.round(posicionDeMatiz(hslDe(hex)[0])), NC)];

  /** Datos de un código propio. Grises, blanco y negro se marcan como neutros (sin matiz). */
  function crearPersonal(hex) {
    const hsl = hslDe(hex);
    const x = posicionDeMatiz(hsl[0]);
    const neutro = hsl[1] < 6 || hsl[2] < 4 || hsl[2] > 97;
    return { hex, hsl, x, indice: mod(Math.round(x), NC), neutro };
  }

  /* ------------------------------------------------------------------------
     5. Ruedas de tonos y de grises
     ------------------------------------------------------------------------ */

  /** Color elegido en la pestaña Color (de la rueda o código propio): la base de los tonos. */
  const baseHex = () => (est.color.personal ? est.color.personal.hex : COLORES[est.color.indice].hex);
  const nombreBase = () => (est.color.personal ? est.color.personal.hex : COLORES[est.color.indice].nombre);
  const slugBase = () => (est.color.personal ? 'color' : COLORES[est.color.indice].slug);

  /** 48 pasos: tintes (con blanco) arriba, el color base abajo y sombras (con negro) de vuelta. */
  function anilloTonal(base) {
    const lista = [];
    for (let i = 0; i < NE; i++) {
      let hex;
      let nombre;
      if (i < BASE_TONAL) {
        const t = ((BASE_TONAL - i) / BASE_TONAL) * 0.94;
        hex = mezclar(base, '#FFFFFF', t);
        nombre = `Tinte ${Math.round(t * 100)} %`;
      } else if (i === BASE_TONAL) {
        hex = base;
        nombre = 'Color base';
      } else {
        const t = ((i - BASE_TONAL) / (NE - 1 - BASE_TONAL)) * 0.9;
        hex = mezclar(base, '#000000', t);
        nombre = `Sombra ${Math.round(t * 100)} %`;
      }
      lista.push({ hex, nombre, lum: luminancia(hex) });
    }
    return lista;
  }

  function grisEn(luz, temperatura) {
    const t = TEMPERATURAS[temperatura];
    const s = t.s * (1 - Math.pow((2 * luz) / 100 - 1, 2));
    return hslAHex(t.h, s, luz);
  }

  /** 48 grises del blanco (0°) al negro. */
  function anilloGrises(temperatura) {
    return Array.from({ length: NE }, (_, i) => {
      const luz = 100 * (1 - i / (NE - 1));
      const hex = grisEn(luz, temperatura);
      const nombre = i === 0 ? 'Blanco' : i === NE - 1 ? 'Negro' : `Gris ${Math.round(luz)} %`;
      return { hex, nombre, lum: luminancia(hex) };
    });
  }

  const escalaTonal = (base) => PASOS_ESCALA.map((paso, k) => {
    const [con, t] = MEZCLAS_ESCALA[k];
    return { paso, hex: con ? mezclar(base, con, t) : base };
  });
  const escalaGrises = (temperatura) => PASOS_ESCALA.map((paso, k) => ({ paso, hex: grisEn(LUCES_GRIS[k], temperatura) }));

  /* ------------------------------------------------------------------------
     6. Dibujo de la rueda
     ------------------------------------------------------------------------ */

  /**
   * Sector de anillo con esquinas suavizadas y hueco constante entre
   * sectores. Se usa para los colores y para los velos.
   */
  function rutaSector(i) {
    const { exterior: re, interior: ri } = GEO;
    const [hueco, c] = HUECOS[TOTAL];
    const a = i * PASO - PASO / 2;
    const b = i * PASO + PASO / 2;
    const desvio = (r) => (Math.asin(hueco / 2 / r) * 180) / Math.PI;   // hueco paralelo al radio
    const arco = (r) => ((c / r) * 180) / Math.PI;                       // lo que ocupa la esquina en el arco
    const p = (r, g) => polar(r, g).join(' ');

    return [
      `M${p(re, a + desvio(re) + arco(re))}`,
      `A${re} ${re} 0 0 1 ${p(re, b - desvio(re) - arco(re))}`,
      `Q${p(re, b - desvio(re))} ${p(re - c, b - desvio(re - c))}`,
      `L${p(ri + c, b - desvio(ri + c))}`,
      `Q${p(ri, b - desvio(ri))} ${p(ri, b - desvio(ri) - arco(ri))}`,
      `A${ri} ${ri} 0 0 0 ${p(ri, a + desvio(ri) + arco(ri))}`,
      `Q${p(ri, a + desvio(ri))} ${p(ri + c, a + desvio(ri + c))}`,
      `L${p(re - c, a + desvio(re - c))}`,
      `Q${p(re, a + desvio(re))} ${p(re, a + desvio(re) + arco(re))}Z`,
    ].join('');
  }

  let segmentos = [];
  let svgAnillo = null;

  /** Dibuja el anillo de la pestaña activa (una vez por pestaña o cambio de base). */
  function construirAnillo() {
    const svg = crearSVG('svg', { class: 'rueda__anillo', viewBox: '-120 -120 240 240', role: 'none', focusable: 'false' });
    segmentos = anillo.map((color, i) => {
      const segmento = crearSVG('path', {
        class: 'segmento',
        d: rutaSector(i),
        fill: color.hex,
        id: `color-${i}`,
        role: 'option',
        'aria-selected': 'false',
        'aria-label': est.activa === 'color' ? `${color.nombre}, ${color.categoria}` : `${color.nombre}, ${color.hex}`,
      });
      const titulo = crearSVG('title', {});
      titulo.textContent = color.nombre;
      segmento.append(titulo);
      svg.append(segmento);
      return segmento;
    });
    if (svgAnillo) svgAnillo.remove();
    rotor.prepend(svg);
    svgAnillo = svg;
  }

  /** Marcador: anillo blanco hueco (deja ver el color) con un halo oscuro. */
  function marcador(svg, paso, r) {
    const [cx, cy] = polar(GEO.marcador, paso * PASO);
    svg.append(
      crearSVG('circle', { class: 'marcador marcador--halo', cx, cy, r }),
      crearSVG('circle', { class: 'marcador marcador--anillo', cx, cy, r })
    );
  }

  /**
   * Capa de la armonía (pestaña Color), dibujada con el color elegido en 0°.
   * Es una figura fija: al cambiar de color solo se gira con transform.
   */
  function construirCapaColor() {
    const pasos = ARMONIAS[est.color.modo].pasos;
    const svg = crearSVG('svg', { viewBox: '-120 -120 240 240', focusable: 'false' });

    // Velo sobre los colores que no forman parte de la armonía
    const velo = [];
    for (let i = 0; i < TOTAL; i++) if (!pasos.includes(i)) velo.push(rutaSector(i));
    svg.append(crearSVG('path', { class: 'velo', d: velo.join('') }));

    // Polígono que une los colores: cada lado se recorta en el borde de los marcadores
    const radioMarcador = (p) => (p === 0 ? 7.2 : 5.6);
    const vertices = [...pasos].sort((x, y) => x - y).map((p) => ({ punto: polar(GEO.marcador, p * PASO), r: radioMarcador(p) }));
    const lados = [];
    const cerrado = vertices.length > 2;
    for (let k = 0; k < (cerrado ? vertices.length : vertices.length - 1); k++) {
      const a = vertices[k];
      const b = vertices[(k + 1) % vertices.length];
      const dx = b.punto[0] - a.punto[0];
      const dy = b.punto[1] - a.punto[1];
      const largo = Math.hypot(dx, dy);
      const ux = dx / largo;
      const uy = dy / largo;
      const ra = a.r + 1.3;
      const rb = b.r + 1.3;
      lados.push(`M${redondear(a.punto[0] + ux * ra)} ${redondear(a.punto[1] + uy * ra)}` +
                 `L${redondear(b.punto[0] - ux * rb)} ${redondear(b.punto[1] - uy * rb)}`);
    }
    const d = lados.join('');
    svg.append(
      crearSVG('path', { class: 'poligono poligono--halo', d }),
      crearSVG('path', { class: 'poligono poligono--linea', d })
    );
    pasos.forEach((p) => marcador(svg, p, radioMarcador(p)));
    capa.replaceChildren(svg);
  }

  /**
   * Capa de las ruedas de tonos y grises: un velo sobre lo que NO se lee
   * sobre el elegido (contraste menor que AA). Lo que queda limpio sirve
   * para texto encima de ese tono o gris.
   */
  function construirCapaEscala(i) {
    const ref = anillo[i].lum;
    const velo = [];
    for (let k = 0; k < TOTAL; k++) if (k !== i && contrasteLum(anillo[k].lum, ref) < AA) velo.push(rutaSector(k));
    const svg = crearSVG('svg', { viewBox: '-120 -120 240 240', focusable: 'false' });
    if (velo.length) svg.append(crearSVG('path', { class: 'velo velo--escala', d: velo.join('') }));
    marcador(svg, i, 7.2);
    capa.replaceChildren(svg);
  }

  /** Gira la capa de armonía hasta el color "i" por el camino más corto (pestaña Color). */
  function girarCapa(i) {
    est.anguloCapa = cercano(est.anguloCapa, i * PASO, ARMONIAS[est.color.modo].periodo);
    capa.style.transform = `rotate(${est.anguloCapa}deg)`;
  }

  /* ------------------------------------------------------------------------
     7. Movimiento de la rueda
     ------------------------------------------------------------------------ */
  function fijarAngulo(x) {
    mov.x = x;
    rotor.style.transform = `rotate(${x}deg)`;
  }

  /** Ángulo de una trayectoria [[t, x], …] en el instante t (interpolación lineal). */
  function anguloEn(puntos, t) {
    if (t <= 0) return puntos[0][1];
    const n = puntos.length;
    if (t >= puntos[n - 1][0]) return puntos[n - 1][1];
    let bajo = 0;
    let alto = n - 1;
    while (alto - bajo > 1) {
      const medio = (bajo + alto) >> 1;
      if (puntos[medio][0] <= t) bajo = medio; else alto = medio;
    }
    const [t0, x0] = puntos[bajo];
    const [t1, x1] = puntos[alto];
    return x0 + ((x1 - x0) * (t - t0)) / (t1 - t0 || 1);
  }

  const tiempoActual = () => (mov.anim ? Number(mov.anim.currentTime) || 0 : 0);
  const anguloActual = () => (mov.anim ? anguloEn(mov.puntos, tiempoActual()) : mov.x);

  function velocidadActual() {
    if (!mov.anim) return 0;
    const t = tiempoActual();
    return (anguloEn(mov.puntos, t + 8) - anguloEn(mov.puntos, t - 8)) / 16;
  }

  /** Detiene la animación en curso dejando la rueda donde está. */
  function detener() {
    if (!mov.anim) return;
    const x = anguloActual();
    mov.anim.cancel();
    mov.anim = null;
    fijarAngulo(x);
  }

  /** Trayectoria de un muelle amortiguado de x0 a x1 con velocidad inicial v0 (°/ms). */
  function trayectoriaMuelle(x0, v0, x1) {
    const { w, z } = MUELLE;
    const h = 4;
    let x = x0;
    let v = v0;
    let t = 0;
    const puntos = [[0, x0]];
    for (let paso = 1; t < 5000; paso++) {
      const a = w * w * (x1 - x) - 2 * z * w * v;
      v += a * h;
      x += v * h;
      t += h;
      if (paso % 4 === 0) puntos.push([t, x]);
      if (Math.abs(x1 - x) < 0.015 && Math.abs(v) < 0.0006) break;
    }
    puntos.push([t + 16, x1]);
    return puntos;
  }

  /** Trayectoria con una curva de aceleración, muestreada cada 16 ms. */
  function trayectoriaCurva(x0, x1, duracion, curva) {
    const n = Math.max(2, Math.round(duracion / 16));
    const puntos = [];
    for (let k = 0; k <= n; k++) puntos.push([(duracion * k) / n, x0 + (x1 - x0) * curva(k / n)]);
    return puntos;
  }

  const salidaCuarta = (t) => 1 - Math.pow(1 - t, 4);
  const salidaCubica = (t) => 1 - Math.pow(1 - t, 3);

  /** Reproduce una trayectoria en el compositor con Web Animations. */
  function reproducir(puntos) {
    const final = puntos[puntos.length - 1][1];
    const duracion = puntos[puntos.length - 1][0];
    if (mov.anim) {
      mov.anim.cancel();
      mov.anim = null;
    }
    if (sinMovimiento() || duracion < 20 || typeof rotor.animate !== 'function') {
      fijarAngulo(final);
      return;
    }
    const fotogramas = puntos.map(([t, x]) => ({ transform: `rotate(${x}deg)`, offset: t / duracion }));
    const anim = rotor.animate(fotogramas, { duration: duracion, easing: 'linear', fill: 'forwards' });
    mov.anim = anim;
    mov.puntos = puntos;
    anim.finished
      .then(() => {
        if (mov.anim !== anim) return;
        fijarAngulo(final);
        anim.cancel();
        mov.anim = null;
      })
      .catch(() => { /* interrumpida por otra animación o por la mano */ });
  }

  /** Lleva la posición "i" bajo el puntero por el camino más corto. */
  function irA(i, velocidad) {
    const x = anguloActual();
    reproducir(trayectoriaMuelle(x, velocidad || 0, x + normalizar(-i * PASO - x)));
  }

  /* ------------------------------------------------------------------------
     8. Vista (lo que señala el puntero) y selección
     ------------------------------------------------------------------------ */

  /** Muestra la posición "i" en el centro, en la lectura y en la capa. */
  function mostrarVista(i, forzar) {
    if (i === est.vista && !forzar) return;
    est.vista = i;
    rueda.setAttribute('aria-activedescendant', `color-${i}`);
    const e = anillo[i];

    if (est.activa === 'color') {
      const propio = est.color.personal && est.color.personal.indice === i ? est.color.personal : null;
      centro.style.backgroundColor = propio ? propio.hex : e.hex;
      if (propio) {
        lecturaNombre.textContent = propio.hex;
        lecturaHex.textContent = propio.neutro ? 'Sin matiz' : `≈ ${e.nombre}`;
        lecturaTipo.textContent = 'Código propio';
      } else {
        lecturaNombre.textContent = e.nombre;
        lecturaHex.textContent = e.hex;
        lecturaTipo.textContent = capitalizar(e.categoria);
      }
      lecturaGrados.textContent = grados(i * PASO);
      girarCapa(i);
      return;
    }

    centro.style.backgroundColor = e.hex;
    lecturaNombre.textContent = e.nombre;
    lecturaHex.textContent = e.hex;
    if (est.activa === 'tonos') {
      lecturaTipo.textContent = `Tono de ${nombreBase()}`;
      lecturaGrados.textContent = `Luz ${Math.round(hslDe(e.hex)[2])} %`;
    } else {
      lecturaTipo.textContent = TEMPERATURAS[est.grises.temperatura].nombre;
      lecturaGrados.textContent = `Sobre blanco ${ratio(contrasteLum(e.lum, 1))}`;
    }
    construirCapaEscala(i);
  }

  /**
   * Confirma una posición de la rueda activa. En la pestaña Color, con
   * { personal: true } conserva el código propio (la rueda va al más parecido).
   */
  function seleccionar(i, opciones) {
    const { anunciar = true, personal = false, desdeCampo = false } = opciones || {};
    if (!desdeCampo) limpiarCampo();
    if (segmentos[est.marcado]) segmentos[est.marcado].setAttribute('aria-selected', 'false');
    segmentos[i].setAttribute('aria-selected', 'true');
    est.marcado = i;
    const cambia = i !== est[est.activa].indice;

    if (est.activa === 'color') {
      if (!personal) est.color.personal = null;
      est.color.indice = i;
      mostrarVista(i, true);
      pintarPanelColor(false);
      guardarEnEnlace();
    } else {
      est[est.activa].indice = i;
      mostrarVista(i, true);
      pintarPanelEscala();
    }

    if (cambia && est.tactil && navigator.vibrate) {
      try { navigator.vibrate(8); } catch (_) { /* sin vibración */ }
    }
    if (anunciar) anunciarSeleccion();
  }

  function anunciarSeleccion() {
    if (est.activa === 'color') {
      const entradas = entradasDePaleta();
      const quien = est.color.personal ? `Código ${est.color.personal.hex}` : COLORES[est.color.indice].nombre;
      anunciador.textContent = `${quien}. ${tituloDeArmonia()}: ${enumerar(entradas.map((e) => e.nombre.replace('≈ ', 'parecido a ').toLowerCase()))}.`;
    } else {
      const e = anillo[est[est.activa].indice];
      anunciador.textContent = `${e.nombre}, ${e.hex}.`;
    }
  }

  function tituloDeArmonia() {
    if (est.color.modo === 'triada' && !est.color.personal) return NOMBRE_TRIADA[COLORES[est.color.indice].categoria];
    return ARMONIAS[est.color.modo].nombre;
  }

  /** Colores de la paleta actual: de la rueda, o derivados del código propio. */
  function entradasDePaleta() {
    const pasos = ARMONIAS[est.color.modo].pasos;
    const p = est.color.personal;
    return pasos.map((paso, k) => {
      if (!p) {
        const c = COLORES[mod(est.color.indice + paso, NC)];
        return { hex: c.hex, nombre: c.nombre, variable: c.slug, paso };
      }
      const hex = k === 0 ? p.hex : derivar(p, paso);
      const nombre = p.neutro ? 'Neutro' : `≈ ${cercanoEnRueda(hex).nombre}`;
      return { hex, nombre, variable: k === 0 ? 'tu-color' : `armonia-${k}`, paso };
    });
  }

  /** Toque o tecla: se elige la posición y la rueda la lleva bajo el puntero. */
  function elegir(i, velocidad) {
    irA(i, velocidad);
    seleccionar(i);
  }

  /* ------------------------------------------------------------------------
     9. Paneles
     ------------------------------------------------------------------------ */
  function etiquetaPosicion(paso) {
    if (paso === 0) return 'Tu color';
    const g = normalizar(paso * (360 / NC));
    return `${g > 0 ? '+' : '−'}${grados(Math.abs(g))}`;
  }

  /* ---- Pestaña Color: muestras de la armonía ---- */
  function crearMuestras() {
    const pasos = ARMONIAS[est.color.modo].pasos;
    listaMuestras.style.setProperty('--n', pasos.length);
    listaMuestras.replaceChildren(...pasos.map((paso, k) => {
      const li = document.createElement('li');
      li.className = 'muestra';
      li.style.setProperty('--i', k);
      li.innerHTML =
        '<button class="muestra__bloque" type="button">' +
          '<span class="muestra__cabeza"><span class="muestra__posicion"></span><span class="muestra__contraste"></span></span>' +
          '<span class="muestra__pie"><span class="muestra__nombre"></span><span class="muestra__valor"></span></span>' +
        '</button>' +
        '<div class="muestra__tonos" role="group">' + '<button class="tono" type="button"></button>'.repeat(5) + '</div>';
      li.querySelector('.muestra__posicion').textContent = etiquetaPosicion(paso);
      return li;
    }));
  }

  function pintarPanelColor(recrear) {
    const entradas = entradasDePaleta();
    if (recrear || listaMuestras.children.length !== entradas.length) crearMuestras();

    tituloArmonia.textContent = tituloDeArmonia();
    textoArmonia.textContent = ARMONIAS[est.color.modo].texto;

    const nombresTono = ['muy claro', 'claro', 'base', 'oscuro', 'muy oscuro'];
    entradas.forEach((entrada, k) => {
      const li = listaMuestras.children[k];
      const sobre = textoSobre(entrada.hex);
      const valor = formatear(entrada.hex, est.formato);
      const bloque = li.querySelector('.muestra__bloque');

      bloque.style.setProperty('--c', entrada.hex);
      bloque.style.setProperty('--sobre', sobre.color);
      bloque.dataset.valor = valor;
      bloque.dataset.hex = entrada.hex;
      bloque.setAttribute('aria-label', `Copiar ${valor}, ${entrada.nombre.replace('≈ ', 'parecido a ')}`);
      li.querySelector('.muestra__nombre').textContent = entrada.nombre;
      li.querySelector('.muestra__valor').textContent = valor;
      const contrasteEl = li.querySelector('.muestra__contraste');
      contrasteEl.textContent = `Aa ${ratio(sobre.ratio)}`;
      contrasteEl.title = `Contraste del texto ${sobre.color === '#FFFFFF' ? 'blanco' : 'oscuro'} sobre este color`;

      const grupo = li.querySelector('.muestra__tonos');
      grupo.setAttribute('aria-label', `Tonos de ${entrada.nombre.replace('≈ ', '')}`);
      tonosDe(entrada.hex).forEach((hex, t) => {
        const boton = grupo.children[t];
        const valorTono = formatear(hex, est.formato);
        boton.style.setProperty('--t', hex);
        boton.dataset.valor = valorTono;
        boton.dataset.hex = hex;
        boton.title = valorTono;
        boton.setAttribute('aria-label', `Copiar tono ${nombresTono[t]} ${valorTono}`);
      });
    });
  }

  /* ---- Pestañas Tonos y Grises: escala 50–950 ---- */
  function escalaActual() {
    return est.activa === 'tonos' ? escalaTonal(baseHex()) : escalaGrises(est.grises.temperatura);
  }

  function prefijoCss() {
    if (est.activa === 'tonos') return slugBase();
    return est.grises.temperatura === 'neutro' ? 'gris' : `gris-${aSlug(TEMPERATURAS[est.grises.temperatura].nombre)}`;
  }

  function pintarPanelEscala() {
    const pestana = est.activa;
    const lista = $(`escala-${pestana}`);
    const escala = escalaActual();
    if (pestana === 'tonos') {
      $('titulo-tonos').textContent = `Tonos de ${nombreBase()}`;
    } else {
      const t = est.grises.temperatura;
      $('titulo-grises').textContent = t === 'neutro' ? 'Escala de grises' : `Grises ${TEMPERATURAS[t].plural}`;
    }

    if (lista.children.length !== escala.length) {
      lista.replaceChildren(...escala.map(() => {
        const li = document.createElement('li');
        li.innerHTML =
          '<button class="escalon" type="button">' +
            '<span class="escalon__muestra">Aa</span>' +
            '<span class="escalon__paso"></span>' +
            '<span class="escalon__valor"></span>' +
            '<span class="escalon__contraste"></span>' +
          '</button>';
        return li;
      }));
    }

    // Se marca el escalón más parecido (en luminancia) al tono o gris elegido
    const lumElegida = anillo[est[pestana].indice].lum;
    let masCercano = 0;
    escala.forEach((e, k) => {
      e.lum = luminancia(e.hex);
      if (Math.abs(e.lum - lumElegida) < Math.abs(escala[masCercano].lum - lumElegida)) masCercano = k;
    });

    escala.forEach((e, k) => {
      const boton = lista.children[k].firstElementChild;
      const sobre = textoSobre(e.hex);
      const valor = formatear(e.hex, est.formato);
      const muestra = boton.querySelector('.escalon__muestra');
      muestra.style.setProperty('--c', e.hex);
      muestra.style.setProperty('--sobre', sobre.color);
      boton.querySelector('.escalon__paso').textContent = e.paso;
      boton.querySelector('.escalon__valor').textContent = valor;
      boton.querySelector('.escalon__contraste').textContent = `Aa ${ratio(sobre.ratio)}`;
      boton.dataset.valor = valor;
      boton.dataset.hex = e.hex;
      boton.classList.toggle('actual', k === masCercano);
      boton.setAttribute('aria-label', `Copiar ${e.paso}: ${valor}. Texto ${sobre.color === '#FFFFFF' ? 'blanco' : 'oscuro'} con contraste ${ratio(sobre.ratio)}`);
    });
  }

  /* ------------------------------------------------------------------------
     10. Copiar, compartir y avisos
     ------------------------------------------------------------------------ */
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
    const muestras = document.createElement('span');
    muestras.className = 'aviso__muestras';
    (colores || []).forEach((hex) => {
      const punto = document.createElement('span');
      punto.className = 'aviso__muestra';
      punto.style.backgroundColor = hex;
      muestras.append(punto);
    });
    const mensaje = document.createElement('span');
    mensaje.textContent = texto;
    aviso.replaceChildren(muestras, mensaje);
    aviso.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.remove('visible'), 2200);
  }

  /** Copia y avisa; "mensaje" es lo que dice el aviso si sale bien. */
  async function copiarYAvisar(texto, colores, boton, mensaje) {
    const ok = await copiarTexto(texto);
    if (boton) boton.focus({ preventScroll: true });   // el método alternativo mueve el foco
    mostrarAviso(ok ? mensaje || `${texto} copiado` : `No se pudo copiar: ${texto}`, colores);
  }

  // Un solo escuchador para muestras, tonos y escalones
  document.querySelector('.principal').addEventListener('click', (e) => {
    const boton = e.target.closest('.muestra__bloque, .tono, .escalon');
    if (!boton) return;
    copiarYAvisar(boton.dataset.valor, [boton.dataset.hex], boton);
  });

  const hexesDePaleta = () => entradasDePaleta().map((e) => e.hex);

  $('copiar-paleta').addEventListener('click', (e) => {
    const hexes = hexesDePaleta();
    copiarYAvisar(hexes.map((h) => formatear(h, est.formato)).join(', '), hexes, e.currentTarget, 'Paleta copiada');
  });

  $('copiar-css').addEventListener('click', (e) => {
    const lineas = entradasDePaleta().map((en) => `  --${en.variable}: ${formatear(en.hex, est.formato)};`);
    copiarYAvisar(`:root {\n${lineas.join('\n')}\n}`, hexesDePaleta(), e.currentTarget, 'Variables CSS copiadas');
  });

  ['tonos', 'grises'].forEach((pestana) => {
    $(`copiar-escala-${pestana}`).addEventListener('click', (e) => {
      const escala = escalaActual();
      copiarYAvisar(escala.map((x) => formatear(x.hex, est.formato)).join(', '), escala.map((x) => x.hex), e.currentTarget, 'Escala copiada');
    });
    $(`copiar-css-${pestana}`).addEventListener('click', (e) => {
      const escala = escalaActual();
      const prefijo = prefijoCss();
      const lineas = escala.map((x) => `  --${prefijo}-${x.paso}: ${formatear(x.hex, est.formato)};`);
      copiarYAvisar(`:root {\n${lineas.join('\n')}\n}`, escala.map((x) => x.hex), e.currentTarget, 'Variables CSS copiadas');
    });
  });

  /** El enlace guarda la armonía y el color: #triada-amarillo o #triada-3a7bd5 */
  function guardarEnEnlace() {
    const color = est.color.personal ? est.color.personal.hex.slice(1).toLowerCase() : COLORES[est.color.indice].slug;
    try {
      history.replaceState(null, '', `#${est.color.modo}-${color}`);
    } catch (_) { /* algunos marcos no lo permiten */ }
  }

  function leerEnlace() {
    const hash = decodeURIComponent(location.hash.slice(1));
    const modo = Object.keys(ARMONIAS).find((m) => hash.startsWith(`${m}-`));
    if (!modo) return null;
    const resto = hash.slice(modo.length + 1);
    if (/^[0-9a-f]{6}$/i.test(resto)) return { modo, hex: `#${resto.toUpperCase()}` };
    const indice = COLORES.findIndex((c) => c.slug === resto);
    return indice >= 0 ? { modo, indice } : null;
  }

  const botonCompartir = $('compartir');
  // Dentro de un marco (vista previa) el enlace no serviría: se oculta el botón
  if (window.self !== window.top) botonCompartir.hidden = true;
  botonCompartir.addEventListener('click', async () => {
    guardarEnEnlace();
    const url = location.href;
    const nombres = entradasDePaleta().map((e) => e.nombre).join(', ');
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Círculo Cromático', text: `${tituloDeArmonia()}: ${nombres}`, url });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;   // el usuario cerró el menú
      }
    }
    const ok = await copiarTexto(url);
    botonCompartir.focus({ preventScroll: true });
    mostrarAviso(ok ? 'Enlace copiado' : `No se pudo copiar: ${url}`, hexesDePaleta());
  });

  /* ------------------------------------------------------------------------
     11. Buscar por código: HEX, RGB, HSL, nombres CSS o de la rueda
     ------------------------------------------------------------------------ */
  let lienzo = null;

  /** Interpreta lo escrito. Devuelve { hex } o { hex, indice } (color de la rueda), o null. */
  function interpretarCodigo(texto) {
    const t = texto.trim();
    if (!t) return null;

    // Un nombre de la rueda, sin importar tildes ni mayúsculas: "cobalto", "azul klein"
    const porNombre = COLORES.findIndex((c) => c.slug === aSlug(t));
    if (porNombre >= 0) return { hex: COLORES[porNombre].hex, indice: porNombre };

    // HEX con o sin #, de 3 o 6 cifras
    let m = t.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
      return { hex: `#${h.toUpperCase()}` };
    }

    // Tres números sueltos (RGB): "58 123 213" o "58, 123, 213"
    m = t.match(/^(\d{1,3})\s*[,;\s]\s*(\d{1,3})\s*[,;\s]\s*(\d{1,3})$/);
    if (m) {
      const rgb = m.slice(1).map(Number);
      if (rgb.every((v) => v <= 255)) return { hex: rgbAHex(rgb) };
    }

    // Cualquier otro color CSS (rgb(), hsl(), "tomato"…): lo traduce el navegador
    if (window.CSS && CSS.supports && CSS.supports('color', t)) {
      if (!lienzo) lienzo = document.createElement('canvas').getContext('2d');
      if (lienzo) {
        lienzo.fillStyle = '#000000';
        lienzo.fillStyle = t;
        const v = String(lienzo.fillStyle);
        if (/^#[0-9a-f]{6}$/i.test(v)) return { hex: v.toUpperCase() };
        const n = v.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
        if (n) return { hex: rgbAHex(n.slice(1, 4).map(Number)) };
      }
    }
    return null;
  }

  /** Fija el color de la pestaña Color (de la rueda o código propio) sin mostrarla. */
  function fijarColor(resultado) {
    const exacto = resultado.indice !== undefined ? resultado.indice : COLORES.findIndex((c) => c.hex === resultado.hex);
    if (exacto >= 0) {
      est.color.personal = null;
      est.color.indice = exacto;
    } else {
      est.color.personal = crearPersonal(resultado.hex);
      est.color.indice = est.color.personal.indice;
    }
    est.color.angulo = -est.color.indice * (360 / NC);
    return exacto;
  }

  /** Aplica un código en la pestaña Color: la rueda va al color (o al más parecido). */
  function aplicarEnColor(resultado) {
    const exacto = fijarColor(resultado);
    irA(est.color.indice, velocidadActual());
    seleccionar(est.color.indice, { personal: exacto < 0, desdeCampo: true });
    if (est.color.personal && est.color.personal.neutro) {
      mostrarAviso('Grises, blanco y negro no tienen matiz: combinan con todo y su armonía es el mismo color.', [resultado.hex]);
    }
  }

  function limpiarCampo() {
    if (!campo.value) return;
    campo.value = '';
    pintarPrevia(null);
  }

  function pintarPrevia(resultado) {
    previa.style.backgroundColor = resultado ? resultado.hex : '';
    previa.classList.toggle('valida', Boolean(resultado));
  }

  campo.addEventListener('input', () => pintarPrevia(interpretarCodigo(campo.value)));

  buscador.addEventListener('submit', (e) => {
    e.preventDefault();
    const resultado = interpretarCodigo(campo.value);
    if (!resultado) {
      buscador.classList.remove('error');
      void buscador.offsetWidth;   // reinicia la animación
      buscador.classList.add('error');
      mostrarAviso(campo.value.trim()
        ? 'No reconozco ese código. Prueba #3A7BD5, rgb(58, 123, 213) o un nombre como Cobalto.'
        : 'Escribe un código: #3A7BD5, rgb(58, 123, 213) o un nombre.');
      return;
    }
    est.tactil = false;

    if (est.activa === 'color') {
      aplicarEnColor(resultado);
    } else if (est.activa === 'tonos') {
      // El código pasa a ser la base de los tonos (y el color de la pestaña Color)
      fijarColor(resultado);
      guardarEnEnlace();
      prepararTonos(true);
      irA(BASE_TONAL, velocidadActual());
      seleccionar(BASE_TONAL, { desdeCampo: true });
    } else {
      // Su gris equivalente: el de luminancia más parecida
      const lum = luminancia(resultado.hex);
      let i = 0;
      anillo.forEach((g, k) => { if (Math.abs(g.lum - lum) < Math.abs(anillo[i].lum - lum)) i = k; });
      irA(i, velocidadActual());
      seleccionar(i, { desdeCampo: true });
      mostrarAviso(`Su gris equivalente es ${anillo[i].nombre.toLowerCase()}: ${anillo[i].hex}`, [resultado.hex, anillo[i].hex]);
    }
    if (window.matchMedia('(pointer: coarse)').matches) campo.blur();   // oculta el teclado del móvil
  });

  // Atajo: "/" lleva al buscador
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const activo = document.activeElement;
    if (activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    campo.focus();
  });

  /* ------------------------------------------------------------------------
     12. Arrastre con ratón o dedo (Pointer Events)
     ------------------------------------------------------------------------ */
  let arrastre = null;
  let cuadroPendiente = 0;

  function centroDeRueda() {
    const r = marco.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, radio: r.width / 2 };
  }

  const anguloPuntero = (x, y, c) => (Math.atan2(x - c.x, -(y - c.y)) * 180) / Math.PI;
  const enCentro = (x, y, c) => Math.hypot(x - c.x, y - c.y) < c.radio * (RADIO_CENTRO / 120);

  /** Aplica el giro del arrastre una vez por fotograma. */
  function pintarArrastre() {
    cuadroPendiente = 0;
    rotor.style.transform = `rotate(${mov.x}deg)`;
    mostrarVista(indiceEn(mov.x));
  }

  rueda.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const c = centroDeRueda();
    // En táctil, el disco central queda libre para desplazar la página
    if (e.pointerType !== 'mouse' && enCentro(e.clientX, e.clientY, c)) return;
    est.tactil = e.pointerType !== 'mouse';
    detener();
    arrastre = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      c,
      angulo: anguloPuntero(e.clientX, e.clientY, c),
      movido: false,
      muestras: [{ t: e.timeStamp, a: mov.x }],
    };
    try { rueda.setPointerCapture(e.pointerId); } catch (_) { /* sin captura también funciona */ }
  });

  rueda.addEventListener('pointermove', (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const { c } = arrastre;
    if (!arrastre.movido) {
      if (Math.hypot(e.clientX - arrastre.x, e.clientY - arrastre.y) < UMBRAL_ARRASTRE) return;
      arrastre.movido = true;
      rueda.classList.add('arrastrando');
      capa.classList.add('inmediata');   // la capa sigue al puntero sin retraso
    }
    const angulo = anguloPuntero(e.clientX, e.clientY, c);
    // Muy cerca del eje el ángulo es inestable: solo se actualiza la referencia
    if (Math.hypot(e.clientX - c.x, e.clientY - c.y) > c.radio * 0.15) {
      mov.x += normalizar(angulo - arrastre.angulo);
      if (!cuadroPendiente) cuadroPendiente = requestAnimationFrame(pintarArrastre);
    }
    arrastre.angulo = angulo;
    arrastre.muestras.push({ t: e.timeStamp, a: mov.x });
    if (arrastre.muestras.length > 20) arrastre.muestras.shift();
  });

  function terminarArrastre(e, cancelado) {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const datos = arrastre;
    arrastre = null;
    if (cuadroPendiente) {
      cancelAnimationFrame(cuadroPendiente);
      cuadroPendiente = 0;
    }
    fijarAngulo(mov.x);
    rueda.classList.remove('arrastrando');
    capa.classList.remove('inmediata');

    // Toque sin arrastrar: se elige por el ángulo del toque (los sectores son finos;
    // así también vale tocar entre dos)
    if (!datos.movido) {
      const distancia = Math.hypot(datos.x - datos.c.x, datos.y - datos.c.y);
      const escala = datos.c.radio / 120;
      const enAnillo = distancia > GEO.interior * 0.9 * escala && distancia < (GEO.exterior + 8) * escala;
      const actual = est[est.activa].indice;
      if (enAnillo && !cancelado) {
        const angulo = anguloPuntero(datos.x, datos.y, datos.c);
        elegir(mod(Math.round((angulo - mov.x) / PASO), TOTAL));
      } else {
        irA(actual);   // vuelve a lo elegido si se tocó el centro o fuera del anillo
        mostrarVista(actual, true);
      }
      return;
    }

    // Arrastre: velocidad de los últimos 80 ms → vuelo libre proyectado → muelle a la posición
    const ahora = e.timeStamp;
    const recientes = datos.muestras.filter((m) => ahora - m.t <= 80);
    let v = 0;
    if (recientes.length >= 2 && !cancelado && !sinMovimiento()) {
      const primera = recientes[0];
      const ultima = recientes[recientes.length - 1];
      v = limitar((ultima.a - primera.a) / Math.max(16, ultima.t - primera.t), -3, 3);
    }
    const destino = Math.round((mov.x + v * PROYECCION) / PASO) * PASO;
    reproducir(trayectoriaMuelle(mov.x, v, destino));
    seleccionar(indiceEn(destino));
  }

  rueda.addEventListener('pointerup', (e) => terminarArrastre(e, false));
  rueda.addEventListener('pointercancel', (e) => terminarArrastre(e, true));
  rueda.addEventListener('lostpointercapture', (e) => terminarArrastre(e, true));
  rueda.addEventListener('contextmenu', (e) => e.preventDefault());

  // Táctil: sobre el anillo, el dedo gira la rueda y no mueve la página
  rueda.addEventListener('touchstart', (e) => {
    const toque = e.touches[0];
    if (!toque || e.touches.length > 1) return;
    if (!enCentro(toque.clientX, toque.clientY, centroDeRueda())) e.preventDefault();
  }, { passive: false });

  /* ------------------------------------------------------------------------
     13. Teclado: flechas (un paso), Mayús + flecha o RePág/AvPág (8 pasos), Inicio/Fin
     ------------------------------------------------------------------------ */
  rueda.addEventListener('keydown', (e) => {
    let pasos = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, PageDown: SALTO, PageUp: -SALTO }[e.key];
    if (pasos && e.shiftKey && Math.abs(pasos) === 1) pasos *= SALTO;
    let i = null;
    if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = TOTAL - 1;
    else if (pasos) i = mod(est[est.activa].indice + pasos, TOTAL);
    if (i === null) return;
    e.preventDefault();
    est.tactil = false;
    // Conserva la velocidad del giro en curso para encadenar pulsaciones rápidas sin saltos
    elegir(i, velocidadActual());
  });

  /* ------------------------------------------------------------------------
     14. Pestañas
     ------------------------------------------------------------------------ */
  const ETIQUETAS_RUEDA = {
    color: () => 'Rueda cromática de 96 colores',
    tonos: () => `Rueda de 48 tonos de ${nombreBase()}`,
    grises: () => `Rueda de 48 grises ${TEMPERATURAS[est.grises.temperatura].plural}`,
  };

  /** Prepara la rueda de tonos; si cambió el color base, vuelve a su posición. */
  function prepararTonos(forzar) {
    const base = baseHex();
    if (forzar || est.tonos.base !== base) {
      est.tonos.base = base;
      est.tonos.indice = BASE_TONAL;
      est.tonos.angulo = -BASE_TONAL * (360 / NE);
      if (est.activa === 'tonos') {
        anillo = anilloTonal(base);
        construirAnillo();
        rueda.setAttribute('aria-label', ETIQUETAS_RUEDA.tonos());
      }
    }
  }

  /** Coloca la raya bajo la pestaña activa. */
  function moverIndicador() {
    const activa = pestanas.find((p) => p.dataset.pestana === est.activa);
    if (!activa || !indicador) return;
    indicador.style.setProperty('--x', `${activa.offsetLeft}px`);
    indicador.style.setProperty('--ancho', `${activa.offsetWidth}px`);
  }

  function cambiarPestana(nombre, enfocar) {
    if (nombre === est.activa) return;
    detener();
    est[est.activa].angulo = mov.x;
    est.activa = nombre;

    pestanas.forEach((p) => {
      const activa = p.dataset.pestana === nombre;
      p.setAttribute('aria-selected', String(activa));
      p.tabIndex = activa ? 0 : -1;
      $(p.getAttribute('aria-controls')).hidden = !activa;
      if (activa && enfocar) p.focus();
    });
    moverIndicador();

    // Datos de la rueda
    TOTAL = nombre === 'color' ? NC : NE;
    PASO = 360 / TOTAL;
    if (nombre === 'color') {
      anillo = COLORES;
    } else if (nombre === 'tonos') {
      if (est.tonos.base !== baseHex()) {
        est.tonos.base = baseHex();
        est.tonos.indice = BASE_TONAL;   // con un color base nuevo, se empieza por él
        est.tonos.angulo = -BASE_TONAL * PASO;
      }
      anillo = anilloTonal(est.tonos.base);
    } else {
      anillo = anilloGrises(est.grises.temperatura);
    }
    rueda.classList.toggle('rueda--escala', nombre !== 'color');
    rueda.setAttribute('aria-label', ETIQUETAS_RUEDA[nombre]());
    construirAnillo();

    capa.classList.add('inmediata');
    if (nombre === 'color') {
      construirCapaColor();
      est.anguloCapa = est.color.indice * PASO;
      capa.style.transform = `rotate(${est.anguloCapa}deg)`;
    } else {
      capa.style.transform = 'none';
    }
    requestAnimationFrame(() => capa.classList.remove('inmediata'));

    est.vista = -1;
    est.marcado = 0;
    seleccionar(est[nombre].indice, { anunciar: false, personal: Boolean(est.color.personal), desdeCampo: true });
    if (nombre === 'color') pintarPanelColor(true);

    // La rueda entra con un giro corto hasta su posición
    const destino = cercano(0, est[nombre].angulo, 360);
    fijarAngulo(destino - 40);
    reproducir(trayectoriaCurva(destino - 40, destino, 560, salidaCubica));
  }

  pestanas.forEach((p) => {
    p.addEventListener('click', () => cambiarPestana(p.dataset.pestana));
    // Flechas entre pestañas (patrón ARIA de pestañas)
    p.addEventListener('keydown', (e) => {
      const k = pestanas.indexOf(p);
      const destino = { ArrowRight: k + 1, ArrowLeft: k - 1, Home: 0, End: pestanas.length - 1 }[e.key];
      if (destino === undefined) return;
      e.preventDefault();
      cambiarPestana(pestanas[mod(destino, pestanas.length)].dataset.pestana, true);
    });
  });
  window.addEventListener('resize', moverIndicador);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moverIndicador);

  /* ------------------------------------------------------------------------
     15. Controles: armonía, temperatura, formato, azar y tema
     ------------------------------------------------------------------------ */
  /** Cambia la armonía: nueva capa en la rueda y nuevas muestras. */
  function cambiarModo(modo) {
    est.color.modo = modo;
    const radio = document.querySelector(`input[name="armonia"][value="${modo}"]`);
    if (radio) radio.checked = true;
    if (est.activa !== 'color') return;
    construirCapaColor();
    est.anguloCapa = cercano(0, est.vista * PASO, 360);
    capa.classList.add('inmediata');
    capa.style.transform = `rotate(${est.anguloCapa}deg)`;
    if (!sinMovimiento() && capa.animate) capa.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
    requestAnimationFrame(() => capa.classList.remove('inmediata'));
    pintarPanelColor(true);
  }

  document.querySelectorAll('input[name="armonia"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      cambiarModo(radio.value);
      guardarEnEnlace();
      anunciarSeleccion();
    });
  });

  document.querySelectorAll('input[name="temperatura"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      est.grises.temperatura = radio.value;
      if (est.activa !== 'grises') return;
      anillo = anilloGrises(radio.value);
      construirAnillo();
      rueda.setAttribute('aria-label', ETIQUETAS_RUEDA.grises());
      est.marcado = 0;
      seleccionar(est.grises.indice, { anunciar: false, desdeCampo: true });
    });
  });

  // Si cambia el enlace (#triada-azul, #triada-3a7bd5…) con la página abierta, se aplica
  window.addEventListener('hashchange', () => {
    const enlace = leerEnlace();
    if (!enlace) return;
    cambiarPestana('color');
    if (enlace.modo !== est.color.modo) cambiarModo(enlace.modo);
    const actual = est.color.personal ? est.color.personal.hex : COLORES[est.color.indice].hex;
    const nuevo = enlace.hex || COLORES[enlace.indice].hex;
    if (nuevo !== actual) aplicarEnColor(enlace.hex ? { hex: enlace.hex } : { hex: nuevo, indice: enlace.indice });
  });

  document.querySelectorAll('input[name="formato"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      est.formato = radio.value;
      if (est.activa === 'color') pintarPanelColor(false);
      else pintarPanelEscala();
    });
  });

  // Al azar: una vuelta completa larga que frena en una posición nueva
  $('azar').addEventListener('click', () => {
    const actual = est[est.activa].indice;
    let i = actual;
    while (i === actual) i = Math.floor(Math.random() * TOTAL);
    const x = anguloActual();
    const recorrido = mod(-i * PASO - x, 360) + 360;   // siempre en sentido horario
    reproducir(trayectoriaCurva(x, x + recorrido, 1500, salidaCuarta));
    seleccionar(i);
  });

  const botonTema = $('tema');
  const temaActual = () => document.documentElement.getAttribute('data-theme') || (preferenciaOscura.matches ? 'dark' : 'light');
  function pintarBotonTema() {
    botonTema.setAttribute('aria-label', temaActual() === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  }
  botonTema.addEventListener('click', () => {
    const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevo);
    try { localStorage.setItem('circulo-cromatico:tema', nuevo); } catch (_) { /* sin almacenamiento */ }
    pintarBotonTema();
  });
  if (preferenciaOscura.addEventListener) preferenciaOscura.addEventListener('change', pintarBotonTema);

  /* ------------------------------------------------------------------------
     16. Inicio (pestaña Color)
     ------------------------------------------------------------------------ */
  function iniciar() {
    const enlace = leerEnlace();
    if (enlace) {
      est.color.modo = enlace.modo;
      const radio = document.querySelector(`input[name="armonia"][value="${enlace.modo}"]`);
      if (radio) radio.checked = true;
    } else {
      // El navegador puede recordar los radios marcados al recargar: se respetan
      const marcado = document.querySelector('input[name="armonia"]:checked');
      if (marcado) est.color.modo = marcado.value;
    }
    const temperatura = document.querySelector('input[name="temperatura"]:checked');
    if (temperatura) est.grises.temperatura = temperatura.value;
    const formato = document.querySelector('input[name="formato"]:checked');
    if (formato) est.formato = formato.value;

    construirAnillo();
    construirCapaColor();
    pintarBotonTema();
    moverIndicador();

    // Color inicial: el del enlace (de la rueda o un código propio) o el amarillo
    if (enlace && enlace.hex) {
      est.color.personal = crearPersonal(enlace.hex);
      est.color.indice = est.color.personal.indice;
      campo.value = enlace.hex;
      pintarPrevia({ hex: enlace.hex });
    } else if (enlace) {
      est.color.indice = enlace.indice;
    }

    pintarPanelColor(true);
    const objetivo = -est.color.indice * PASO;
    est.anguloCapa = est.color.indice * PASO;
    capa.style.transform = `rotate(${est.anguloCapa}deg)`;
    est.marcado = est.color.indice;
    seleccionar(est.color.indice, { anunciar: false, personal: Boolean(est.color.personal), desdeCampo: true });

    // Entrada: la rueda llega girando un tercio de vuelta y se detiene en su color
    fijarAngulo(objetivo - 120);
    reproducir(trayectoriaCurva(objetivo - 120, objetivo, 1100, salidaCubica));
  }

  iniciar();
})();
