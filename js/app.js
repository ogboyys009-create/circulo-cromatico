/* ==========================================================================
   Círculo Cromático — js/app.js

   Rueda RYB de 24 colores con armonías (tríada, complementario, análogo,
   complementario dividido y tétrada), tonos, copia en HEX/RGB/HSL y enlace
   para compartir.

   Rendimiento:
   - El anillo se dibuja una sola vez. Al girar solo cambia un transform.
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
   * 24 colores del círculo tradicional (RYB) en sentido horario desde el
   * amarillo (0°), cada 15°. Primarios a 0°, 120° y 240°; secundarios entre
   * ellos; terciarios entre primario y secundario; y entre cada par vecino,
   * un color intermedio.
   */
  const COLORES = [
    ['Amarillo', '#FFD400'], ['Amarillo dorado', '#FFBE00'], ['Amarillo-naranja', '#FFA800'], ['Mandarina', '#FF9100'],
    ['Naranja', '#FF7B00'], ['Calabaza', '#FA6110'], ['Rojo-naranja', '#F4471C'], ['Bermellón', '#EC3420'],
    ['Rojo', '#E2231A'], ['Carmín', '#D11A45'], ['Rojo-violeta', '#C0186D'], ['Púrpura', '#9F2196'],
    ['Violeta', '#7D2BB5'], ['Amatista', '#6433BD'], ['Azul-violeta', '#4C3CC4'], ['Ultramar', '#344ECB'],
    ['Azul', '#1D5FD1'], ['Cerúleo', '#0A7DC0'], ['Azul-verde', '#0098A6'], ['Esmeralda', '#10A07A'],
    ['Verde', '#1FA74A'], ['Verde hierba', '#5BB832'], ['Amarillo-verde', '#9BCB1C'], ['Lima', '#CFD20E'],
  ].map(([nombre, hex], i) => ({ nombre, hex, categoria: categoriaDe(i), slug: aSlug(nombre) }));

  function categoriaDe(i) {
    if (i % 8 === 0) return 'primario';
    if (i % 8 === 4) return 'secundario';
    if (i % 2 === 0) return 'terciario';
    return 'intermedio';
  }

  const TOTAL = COLORES.length;   // 24
  const PASO = 360 / TOTAL;       // 15° por color

  /** Armonías: posiciones relativas al color elegido (en pasos de 15°). */
  const ARMONIAS = {
    triada: {
      nombre: 'Tríada',
      pasos: [0, 8, 16],
      periodo: 120,   // la figura se repite cada 120°: la capa gira por el camino más corto
      texto: 'Tres colores separados 120°. Contraste vivo y equilibrado: deja que uno domine y usa los otros como acento.',
    },
    complementario: {
      nombre: 'Complementario',
      pasos: [0, 12],
      periodo: 180,
      texto: 'Dos colores opuestos, a 180°. Es el contraste más fuerte: úsalo para que algo destaque.',
    },
    analogo: {
      nombre: 'Análogo',
      pasos: [0, 2, 22],
      periodo: 360,
      texto: 'Tu color y sus vecinos a 30°. Una combinación tranquila y natural, con poco contraste.',
    },
    dividido: {
      nombre: 'Complementario dividido',
      pasos: [0, 10, 14],
      periodo: 360,
      texto: 'Tu color y los dos vecinos de su opuesto (150° y 210°). Contraste fuerte, más fácil de equilibrar que el complementario.',
    },
    tetrada: {
      nombre: 'Tétrada',
      pasos: [0, 6, 12, 18],
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

  /** Geometría del dibujo en unidades del viewBox (-120 … 120). */
  const GEO = { exterior: 100, interior: 64, marcador: 82, hueco: 2.2, esquina: 3 };
  const RADIO_CENTRO = 56;          // disco central (zona para desplazar la página en táctil)

  const MUELLE = { w: 0.013, z: 0.82 };   // asentado con un rebote casi imperceptible
  const PROYECCION = 300;                 // ms de vuelo libre que se suman al lanzar la rueda
  const UMBRAL_ARRASTRE = 6;              // px para distinguir arrastre de toque
  const OSCURO = '#141416';

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
  const aviso = $('aviso');
  const anunciador = $('anunciador');

  /* ------------------------------------------------------------------------
     3. Estado
     ------------------------------------------------------------------------ */
  const estado = {
    seleccionado: 0,   // color elegido
    vista: -1,         // color que se muestra (bajo el puntero al arrastrar)
    modo: 'triada',
    formato: 'hex',
    anguloCapa: 0,     // giro de la capa de armonía dentro de la rueda
    tactil: false,
  };

  // Giro de la rueda: ángulo en reposo y animación en curso (Web Animations)
  const mov = { x: 0, anim: null, puntos: null, destino: 0 };

  /* ------------------------------------------------------------------------
     4. Utilidades
     ------------------------------------------------------------------------ */
  const mod = (n, m) => ((n % m) + m) % m;
  const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
  const redondear = (n) => Math.round(n * 100) / 100;
  const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const sinMovimiento = () => preferenciaMovimiento.matches;
  const indiceEn = (angulo) => mod(Math.round(-angulo / PASO), TOTAL);

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
  function polar(radio, grados) {
    const rad = (grados * Math.PI) / 180;
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

  /* ---- Color ---- */
  const hexARgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgbAHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

  function rgbAHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
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
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
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

  function contraste(a, b) {
    const la = luminancia(a);
    const lb = luminancia(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

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
      const [h, s, l] = rgbAHsl(rgb);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    return hex;
  }

  const coloresDeArmonia = (indice, modo) => ARMONIAS[modo].pasos.map((p) => mod(indice + p, TOTAL));

  /* ------------------------------------------------------------------------
     5. Dibujo de la rueda
     ------------------------------------------------------------------------ */

  /**
   * Sector de anillo con esquinas redondeadas y hueco constante entre
   * sectores. Se usa para los colores y para el velo de la armonía.
   */
  function rutaSector(i) {
    const { exterior: re, interior: ri, hueco, esquina: c } = GEO;
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

  const segmentos = [];

  function construirAnillo() {
    const svg = crearSVG('svg', { class: 'rueda__anillo', viewBox: '-120 -120 240 240', role: 'none', focusable: 'false' });
    COLORES.forEach((color, i) => {
      const segmento = crearSVG('path', {
        class: 'segmento',
        d: rutaSector(i),
        fill: color.hex,
        id: `color-${i}`,
        role: 'option',
        'aria-selected': 'false',
        'aria-label': `${color.nombre}, ${color.categoria}`,
        'data-indice': i,
      });
      const titulo = crearSVG('title', {});
      titulo.textContent = color.nombre;
      segmento.append(titulo);
      svg.append(segmento);
      segmentos.push(segmento);
    });
    rotor.prepend(svg);
  }

  /**
   * Capa de la armonía para el modo actual, dibujada con el color elegido en
   * 0°. Es una figura fija: al cambiar de color solo se gira con transform.
   */
  function construirCapa() {
    const pasos = ARMONIAS[estado.modo].pasos;
    const svg = crearSVG('svg', { viewBox: '-120 -120 240 240', focusable: 'false' });

    // Velo sobre los colores que no forman parte de la armonía
    const velo = [];
    for (let i = 0; i < TOTAL; i++) if (!pasos.includes(i)) velo.push(rutaSector(i));
    svg.append(crearSVG('path', { class: 'velo', d: velo.join('') }));

    // Marcadores: anillos blancos huecos (dejan ver el color); el del color elegido, mayor
    const radioMarcador = (p) => (p === 0 ? 8.5 : 6.5);
    const vertices = [...pasos].sort((x, y) => x - y).map((p) => ({ punto: polar(GEO.marcador, p * PASO), r: radioMarcador(p) }));

    // Polígono que une los colores: cada lado se recorta en el borde de los marcadores
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

    pasos.forEach((p) => {
      const [cx, cy] = polar(GEO.marcador, p * PASO);
      const r = radioMarcador(p);
      svg.append(
        crearSVG('circle', { class: 'marcador marcador--halo', cx, cy, r }),
        crearSVG('circle', { class: 'marcador marcador--anillo', cx, cy, r })
      );
    });

    capa.replaceChildren(svg);
  }

  /** Gira la capa de armonía hasta el color "i" por el camino más corto. */
  function girarCapa(i) {
    estado.anguloCapa = cercano(estado.anguloCapa, i * PASO, ARMONIAS[estado.modo].periodo);
    capa.style.transform = `rotate(${estado.anguloCapa}deg)`;
  }

  /* ------------------------------------------------------------------------
     6. Movimiento de la rueda
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

  function tiempoActual() {
    return mov.anim ? Number(mov.anim.currentTime) || 0 : 0;
  }

  function anguloActual() {
    return mov.anim ? anguloEn(mov.puntos, tiempoActual()) : mov.x;
  }

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
    mov.destino = final;
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

  /** Lleva el color "i" bajo el puntero por el camino más corto. */
  function irAColor(i, velocidad) {
    const x = anguloActual();
    reproducir(trayectoriaMuelle(x, velocidad || 0, x + normalizar(-i * PASO - x)));
  }

  /* ------------------------------------------------------------------------
     7. Vista (lo que señala el puntero) y selección
     ------------------------------------------------------------------------ */

  /** Muestra un color en el centro, en la lectura y en la capa de armonía. */
  function mostrarVista(i) {
    if (i === estado.vista) return;
    estado.vista = i;
    const color = COLORES[i];
    centro.style.backgroundColor = color.hex;
    lecturaNombre.textContent = color.nombre;
    lecturaHex.textContent = color.hex;
    lecturaTipo.textContent = capitalizar(color.categoria);
    lecturaGrados.textContent = `${i * PASO}°`;
    rueda.setAttribute('aria-activedescendant', `color-${i}`);
    girarCapa(i);
  }

  /** Confirma un color: paleta, enlace y anuncio para lectores de pantalla. */
  function seleccionar(i, opciones) {
    const { anunciar = true } = opciones || {};
    const cambia = i !== estado.seleccionado;
    segmentos[estado.seleccionado].setAttribute('aria-selected', 'false');
    segmentos[i].setAttribute('aria-selected', 'true');
    estado.seleccionado = i;
    mostrarVista(i);
    pintarPanel(false);
    guardarEnEnlace();
    if (cambia && estado.tactil && navigator.vibrate) {
      try { navigator.vibrate(8); } catch (_) { /* sin vibración */ }
    }
    if (anunciar) {
      const nombres = coloresDeArmonia(i, estado.modo).map((k) => COLORES[k].nombre.toLowerCase());
      anunciador.textContent = `${COLORES[i].nombre}. ${tituloDeArmonia()}: ${enumerar(nombres)}.`;
    }
  }

  const enumerar = (lista) => (lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}` : lista[0]);

  function tituloDeArmonia() {
    if (estado.modo === 'triada') return NOMBRE_TRIADA[COLORES[estado.seleccionado].categoria];
    return ARMONIAS[estado.modo].nombre;
  }

  /* ------------------------------------------------------------------------
     8. Panel: título, muestras y tonos
     ------------------------------------------------------------------------ */
  function etiquetaPosicion(paso) {
    if (paso === 0) return 'Tu color';
    const grados = normalizar(paso * PASO);
    return `${grados > 0 ? '+' : '−'}${Math.abs(grados)}°`;
  }

  /** Crea las muestras del modo actual (solo cuando cambia el número de colores). */
  function crearMuestras() {
    const pasos = ARMONIAS[estado.modo].pasos;
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

  /** Rellena las muestras con los colores de la armonía actual. */
  function pintarPanel(recrear) {
    const indices = coloresDeArmonia(estado.seleccionado, estado.modo);
    if (recrear || listaMuestras.children.length !== indices.length) crearMuestras();

    tituloArmonia.textContent = tituloDeArmonia();
    textoArmonia.textContent = ARMONIAS[estado.modo].texto;

    indices.forEach((indice, k) => {
      const li = listaMuestras.children[k];
      const color = COLORES[indice];
      const sobre = textoSobre(color.hex);
      const valor = formatear(color.hex, estado.formato);
      const bloque = li.querySelector('.muestra__bloque');

      bloque.style.setProperty('--c', color.hex);
      bloque.style.setProperty('--sobre', sobre.color);
      bloque.dataset.valor = valor;
      bloque.dataset.hex = color.hex;
      bloque.setAttribute('aria-label', `Copiar ${valor}, ${color.nombre}`);
      li.querySelector('.muestra__nombre').textContent = color.nombre;
      li.querySelector('.muestra__valor').textContent = valor;
      const ratio = sobre.ratio.toFixed(1).replace('.', ',');
      const contrasteEl = li.querySelector('.muestra__contraste');
      contrasteEl.textContent = `Aa ${ratio}:1`;
      contrasteEl.title = `Contraste del texto ${sobre.color === '#FFFFFF' ? 'blanco' : 'oscuro'} sobre este color`;

      const grupo = li.querySelector('.muestra__tonos');
      grupo.setAttribute('aria-label', `Tonos de ${color.nombre}`);
      const nombresTono = ['muy claro', 'claro', 'base', 'oscuro', 'muy oscuro'];
      tonosDe(color.hex).forEach((hex, t) => {
        const boton = grupo.children[t];
        const valorTono = formatear(hex, estado.formato);
        boton.style.setProperty('--t', hex);
        boton.dataset.valor = valorTono;
        boton.dataset.hex = hex;
        boton.title = valorTono;
        boton.setAttribute('aria-label', `Copiar tono ${nombresTono[t]} ${valorTono}`);
      });
    });
  }

  /* ------------------------------------------------------------------------
     9. Copiar, compartir y avisos
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
    temporizadorAviso = setTimeout(() => aviso.classList.remove('visible'), 1800);
  }

  /** Copia y avisa; "mensaje" es lo que dice el aviso si sale bien. */
  async function copiarYAvisar(texto, colores, boton, mensaje) {
    const ok = await copiarTexto(texto);
    if (boton) boton.focus({ preventScroll: true });   // el método alternativo mueve el foco
    mostrarAviso(ok ? mensaje || `${texto} copiado` : `No se pudo copiar: ${texto}`, colores);
  }

  // Un solo escuchador para todas las muestras y tonos
  listaMuestras.addEventListener('click', (e) => {
    const boton = e.target.closest('.muestra__bloque, .tono');
    if (!boton) return;
    copiarYAvisar(boton.dataset.valor, [boton.dataset.hex], boton);
  });

  const hexesDePaleta = () => coloresDeArmonia(estado.seleccionado, estado.modo).map((i) => COLORES[i].hex);

  $('copiar-paleta').addEventListener('click', (e) => {
    const hexes = hexesDePaleta();
    copiarYAvisar(hexes.map((h) => formatear(h, estado.formato)).join(', '), hexes, e.currentTarget, 'Paleta copiada');
  });

  $('copiar-css').addEventListener('click', (e) => {
    const indices = coloresDeArmonia(estado.seleccionado, estado.modo);
    const lineas = indices.map((i) => `  --${COLORES[i].slug}: ${formatear(COLORES[i].hex, estado.formato)};`);
    copiarYAvisar(`:root {\n${lineas.join('\n')}\n}`, hexesDePaleta(), e.currentTarget, 'Variables CSS copiadas');
  });

  /** El enlace guarda la armonía y el color: #triada-amarillo */
  function guardarEnEnlace() {
    try {
      history.replaceState(null, '', `#${estado.modo}-${COLORES[estado.seleccionado].slug}`);
    } catch (_) { /* algunos marcos no lo permiten */ }
  }

  function leerEnlace() {
    const hash = decodeURIComponent(location.hash.slice(1));
    const modo = Object.keys(ARMONIAS).find((m) => hash.startsWith(`${m}-`));
    if (!modo) return null;
    const indice = COLORES.findIndex((c) => c.slug === hash.slice(modo.length + 1));
    return indice >= 0 ? { modo, indice } : null;
  }

  const botonCompartir = $('compartir');
  // Dentro de un marco (vista previa) el enlace no serviría: se oculta el botón
  if (window.self !== window.top) botonCompartir.hidden = true;
  botonCompartir.addEventListener('click', async () => {
    guardarEnEnlace();
    const url = location.href;
    const nombres = coloresDeArmonia(estado.seleccionado, estado.modo).map((i) => COLORES[i].nombre).join(', ');
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
     10. Arrastre con ratón o dedo (Pointer Events)
     ------------------------------------------------------------------------ */
  let arrastre = null;
  let cuadroPendiente = 0;

  function centroDeRueda() {
    const r = marco.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, radio: r.width / 2 };
  }

  const anguloPuntero = (e, c) => (Math.atan2(e.clientX - c.x, -(e.clientY - c.y)) * 180) / Math.PI;
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
    estado.tactil = e.pointerType !== 'mouse';
    detener();
    arrastre = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      c,
      angulo: anguloPuntero(e, c),
      movido: false,
      segmento: e.target.closest ? e.target.closest('[data-indice]') : null,
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
    const angulo = anguloPuntero(e, c);
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

    // Toque sin arrastrar: elegir el color tocado
    if (!datos.movido) {
      if (datos.segmento && !cancelado) {
        const i = Number(datos.segmento.dataset.indice);
        irAColor(i);
        seleccionar(i);
      } else {
        irAColor(estado.seleccionado);   // vuelve al color elegido si se tocó el hueco o el centro
      }
      return;
    }

    // Arrastre: velocidad de los últimos 80 ms → vuelo libre proyectado → muelle al color
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
     11. Teclado: las flechas eligen el color anterior o siguiente
     ------------------------------------------------------------------------ */
  rueda.addEventListener('keydown', (e) => {
    const pasos = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      estado.tactil = false;
      const i = e.key === 'Home' ? 0 : TOTAL - 1;
      irAColor(i, velocidadActual());
      seleccionar(i);
      return;
    }
    if (!pasos) return;
    e.preventDefault();
    estado.tactil = false;
    const i = mod(estado.seleccionado + pasos, TOTAL);
    // Conserva la velocidad del giro en curso para encadenar pulsaciones rápidas sin saltos
    irAColor(i, velocidadActual());
    seleccionar(i);
  });

  /* ------------------------------------------------------------------------
     12. Controles: armonía, formato, azar y tema
     ------------------------------------------------------------------------ */
  /** Cambia la armonía: nueva capa en la rueda y nuevas muestras. */
  function cambiarModo(modo) {
    estado.modo = modo;
    const radio = document.querySelector(`input[name="armonia"][value="${modo}"]`);
    if (radio) radio.checked = true;
    construirCapa();
    estado.anguloCapa = cercano(0, estado.vista * PASO, 360);
    capa.classList.add('inmediata');
    capa.style.transform = `rotate(${estado.anguloCapa}deg)`;
    if (!sinMovimiento() && capa.animate) capa.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
    requestAnimationFrame(() => capa.classList.remove('inmediata'));
    pintarPanel(true);
  }

  document.querySelectorAll('input[name="armonia"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      cambiarModo(radio.value);
      guardarEnEnlace();
      const nombres = coloresDeArmonia(estado.seleccionado, estado.modo).map((k) => COLORES[k].nombre.toLowerCase());
      anunciador.textContent = `${tituloDeArmonia()}: ${enumerar(nombres)}.`;
    });
  });

  // Si cambia el enlace (#triada-azul…) con la página abierta, se aplica
  window.addEventListener('hashchange', () => {
    const enlace = leerEnlace();
    if (!enlace) return;
    if (enlace.modo !== estado.modo) cambiarModo(enlace.modo);
    if (enlace.indice !== estado.seleccionado) {
      irAColor(enlace.indice);
      seleccionar(enlace.indice);
    }
  });

  document.querySelectorAll('input[name="formato"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      estado.formato = radio.value;
      pintarPanel(false);
    });
  });

  // Color al azar: una vuelta completa larga que frena hasta el nuevo color
  $('azar').addEventListener('click', () => {
    let i = estado.seleccionado;
    while (i === estado.seleccionado) i = Math.floor(Math.random() * TOTAL);
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
     13. Inicio
     ------------------------------------------------------------------------ */
  function iniciar() {
    const enlace = leerEnlace();
    if (enlace) {
      estado.modo = enlace.modo;
      estado.seleccionado = enlace.indice;
      const radio = document.querySelector(`input[name="armonia"][value="${enlace.modo}"]`);
      if (radio) radio.checked = true;
    } else {
      // El navegador puede recordar el radio marcado al recargar: se respeta
      const marcado = document.querySelector('input[name="armonia"]:checked');
      if (marcado) estado.modo = marcado.value;
    }

    construirAnillo();
    construirCapa();
    pintarBotonTema();
    pintarPanel(true);

    const objetivo = -estado.seleccionado * PASO;
    estado.anguloCapa = estado.seleccionado * PASO;
    capa.style.transform = `rotate(${estado.anguloCapa}deg)`;
    seleccionar(estado.seleccionado, { anunciar: false });

    // Entrada: la rueda llega girando un tercio de vuelta y se detiene en su color
    fijarAngulo(objetivo - 120);
    reproducir(trayectoriaCurva(objetivo - 120, objetivo, 1100, salidaCubica));
  }

  iniciar();
})();
