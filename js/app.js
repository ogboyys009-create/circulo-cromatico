/* ==========================================================================
   Círculo Cromático — js/app.js
   Rueda RYB de 12 colores: se gira arrastrando (ratón o dedo) o con las
   flechas del teclado, se elige un color y se muestra su tríada.
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

  const TOTAL = COLORES.length;     // 12 segmentos
  const PASO = 360 / TOTAL;         // 30° por segmento
  const SALTO_TRIADA = TOTAL / 3;   // 4 segmentos = 120°

  /** Geometría del dibujo, en unidades del viewBox (-200 … 200). */
  const GEO = {
    radioInterior: 110,   // borde interno de los segmentos
    radioExterior: 184,   // borde externo de los segmentos
    radioFilete: 189,     // filete dorado sobre el borde de porcelana
    radioCentro: 103,     // disco crema central
    radioTriangulo: 92,   // vértices del triángulo dorado
  };

  // Los tres colores de una tríada comparten categoría, así que la tríada se nombra por ella.
  const NOMBRE_TRIADA = {
    primario: 'Tríada primaria',
    secundario: 'Tríada secundaria',
    terciario: 'Tríada terciaria',
  };
  const ETIQUETA_POSICION = ['Tu color', 'A 120°', 'A 240°'];

  const UMBRAL_ARRASTRE = 6;   // píxeles de movimiento para distinguir arrastre de toque
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const preferenciaMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------------
     2. Referencias al DOM
     ------------------------------------------------------------------------ */
  const rueda = document.getElementById('rueda');
  const rotor = document.getElementById('rueda-rotor');
  const etiquetaPunto = document.querySelector('.etiqueta-indicador__punto');
  const etiquetaNombre = document.querySelector('.etiqueta-indicador__nombre');
  const tituloTriada = document.getElementById('triada-titulo');
  const coloresTriada = document.getElementById('triada-colores');
  const tarjetas = Array.from(document.querySelectorAll('.tarjeta'));
  const aviso = document.getElementById('aviso');
  const anunciador = document.getElementById('anunciador');

  /* ------------------------------------------------------------------------
     3. Estado
     ------------------------------------------------------------------------ */
  const estado = {
    angulo: 0,           // giro visual actual de la rueda, en grados (acumulado)
    destino: 0,          // ángulo final del giro en curso
    seleccionado: -1,    // índice del color elegido (-1 = ninguno todavía)
    candidato: -1,       // índice del color bajo el indicador
    anguloTriangulo: 0,  // giro del triángulo dentro de la rueda
    animacion: 0,        // id de requestAnimationFrame del giro en curso
  };

  // Elementos del SVG creados en construirRueda()
  let segmentos = [];   // segmentos base (opciones del listbox)
  let realces = [];     // copias elevadas con borde dorado para la tríada
  let triangulo = null;
  let vertices = [];

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
    return [radio * Math.sin(rad), -radio * Math.cos(rad)];
  }

  /** Crea un elemento SVG con sus atributos. */
  function crearSVG(etiqueta, atributos) {
    const el = document.createElementNS(SVG_NS, etiqueta);
    Object.keys(atributos || {}).forEach((clave) => el.setAttribute(clave, atributos[clave]));
    return el;
  }

  /** Índices de la tríada de un color: él mismo y los que están a 120° y 240°. */
  const triadaDe = (i) => [i, mod(i + SALTO_TRIADA, TOTAL), mod(i + 2 * SALTO_TRIADA, TOTAL)];

  /** Índice del color que queda bajo el indicador (arriba) con un giro dado. */
  const indiceEnIndicador = (angulo) => mod(Math.round(-angulo / PASO), TOTAL);

  /** "a, b y c" */
  const enumerar = (lista) => `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;

  /* ------------------------------------------------------------------------
     5. Dibujo de la rueda (SVG)
     ------------------------------------------------------------------------ */

  /** Trazado de un sector anular (un segmento de la rueda). */
  function rutaSector(indice) {
    const ri = GEO.radioInterior;
    const re = GEO.radioExterior;
    const a0 = indice * PASO - PASO / 2;
    const a1 = indice * PASO + PASO / 2;
    const [x0, y0] = polar(re, a0).map(redondear);
    const [x1, y1] = polar(re, a1).map(redondear);
    const [x2, y2] = polar(ri, a1).map(redondear);
    const [x3, y3] = polar(ri, a0).map(redondear);
    return `M${x0} ${y0}A${re} ${re} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${ri} ${ri} 0 0 0 ${x3} ${y3}Z`;
  }

  /** Centroide del sector: punto sobre el que crece cada segmento resaltado. */
  function centroSector(indice) {
    const ri = GEO.radioInterior;
    const re = GEO.radioExterior;
    const mitad = ((PASO / 2) * Math.PI) / 180;
    const radio = (2 / 3) * ((re ** 3 - ri ** 3) / (re ** 2 - ri ** 2)) * (Math.sin(mitad) / mitad);
    return polar(radio, indice * PASO).map(redondear);
  }

  function construirRueda() {
    const svg = crearSVG('svg', { viewBox: '-200 -200 400 400', role: 'none', focusable: 'false' });

    // Definiciones: sombra suave de los segmentos elevados y degradado del centro.
    // La sombra no tiene desplazamiento para que se vea igual con la rueda girada.
    const defs = crearSVG('defs');
    defs.innerHTML =
      '<filter id="sombra-realce" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">' +
        '<feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#3B2A20" flood-opacity="0.38"/>' +
      '</filter>' +
      '<radialGradient id="degradado-centro" cx="0" cy="0" r="' + GEO.radioCentro + '" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="#FFFDF6"/>' +
        '<stop offset="0.7" stop-color="#FBF3E2"/>' +
        '<stop offset="1" stop-color="#F0E1C3"/>' +
      '</radialGradient>';
    svg.append(defs);

    // Filete dorado sobre el borde de porcelana
    svg.append(crearSVG('circle', {
      class: 'centro__linea', r: GEO.radioFilete, 'stroke-width': 0.8, opacity: 0.7, 'aria-hidden': 'true',
    }));

    // Segmentos base (opciones accesibles) y sus copias elevadas
    const grupoSegmentos = crearSVG('g', { class: 'segmentos', role: 'none' });
    const grupoRealces = crearSVG('g', { class: 'realces', filter: 'url(#sombra-realce)', 'aria-hidden': 'true' });

    COLORES.forEach((color, i) => {
      const trazado = rutaSector(i);

      const segmento = crearSVG('path', {
        d: trazado,
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

      const realce = crearSVG('path', { d: trazado, fill: color.hex, class: 'realce' });
      const [cx, cy] = centroSector(i);
      realce.style.transformOrigin = `${cx}px ${cy}px`;
      grupoRealces.append(realce);

      segmentos.push(segmento);
      realces.push(realce);
    });
    svg.append(grupoSegmentos);

    // Disco crema central con doble filete dorado
    const centro = crearSVG('g', { class: 'centro', 'aria-hidden': 'true' });
    centro.append(
      crearSVG('circle', { class: 'centro__disco', r: GEO.radioCentro }),
      crearSVG('circle', { class: 'centro__linea', r: GEO.radioCentro, 'stroke-width': 1.2 }),
      crearSVG('circle', { class: 'centro__linea', r: GEO.radioCentro - 5.5, 'stroke-width': 0.6, opacity: 0.55 })
    );
    svg.append(centro, grupoRealces);

    // Triángulo dorado: sus vértices apuntan a los tres colores de la tríada
    triangulo = crearSVG('g', { class: 'triangulo', 'aria-hidden': 'true' });
    const angulosVertices = [0, 120, 240];
    const puntos = angulosVertices
      .map((a) => polar(GEO.radioTriangulo, a).map(redondear).join(','))
      .join(' ');
    triangulo.append(crearSVG('polygon', { class: 'triangulo__linea', points: puntos }));
    vertices = angulosVertices.map((a) => {
      const [x, y] = polar(GEO.radioTriangulo, a).map(redondear);
      return crearSVG('circle', { class: 'triangulo__vertice', cx: x, cy: y, r: 5.5 });
    });
    triangulo.append(...vertices);
    svg.append(triangulo);

    rotor.append(svg);
  }

  /* ------------------------------------------------------------------------
     6. Giro de la rueda
     ------------------------------------------------------------------------ */
  const curvas = {
    salida: (t) => 1 - Math.pow(1 - t, 3),                                          // frena suave
    suave: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),      // acelera y frena
  };

  /** Aplica un giro al instante y actualiza el color bajo el indicador. */
  function aplicarAngulo(angulo) {
    estado.angulo = angulo;
    rotor.style.transform = `rotate(${angulo}deg)`;
    actualizarCandidato();
  }

  function detenerGiro() {
    if (estado.animacion) cancelAnimationFrame(estado.animacion);
    estado.animacion = 0;
  }

  /** Gira con animación hasta "destino" (en grados). */
  function girarA(destino, duracion, curva) {
    detenerGiro();
    estado.destino = destino;
    const inicio = estado.angulo;
    const distancia = destino - inicio;

    if (sinMovimiento() || duracion <= 0 || Math.abs(distancia) < 0.01) {
      aplicarAngulo(destino);
      return;
    }

    const facilidad = curva || curvas.salida;
    let t0 = null;
    const cuadro = (ahora) => {
      if (t0 === null) t0 = ahora;
      const t = Math.min(1, (ahora - t0) / duracion);
      aplicarAngulo(inicio + distancia * facilidad(t));
      estado.animacion = t < 1 ? requestAnimationFrame(cuadro) : 0;
    };
    estado.animacion = requestAnimationFrame(cuadro);
  }

  /** Lleva la rueda al segmento más cercano. */
  function asentar() {
    girarA(Math.round(estado.angulo / PASO) * PASO, 320, curvas.salida);
  }

  /** Muestra en la etiqueta qué color está bajo el indicador. */
  function actualizarCandidato() {
    const indice = indiceEnIndicador(estado.angulo);
    if (indice === estado.candidato) return;
    estado.candidato = indice;
    const color = COLORES[indice];
    etiquetaPunto.style.backgroundColor = color.hex;
    etiquetaNombre.textContent = color.nombre;
    rueda.setAttribute('aria-activedescendant', `color-${indice}`);
  }

  /* ------------------------------------------------------------------------
     7. Selección y tríada
     ------------------------------------------------------------------------ */
  function seleccionar(indice, opciones) {
    const { animarTarjetas = true, anunciar = true } = opciones || {};
    if (indice === estado.seleccionado) return;
    estado.seleccionado = indice;

    const triada = triadaDe(indice);
    rueda.classList.add('con-seleccion');

    segmentos.forEach((segmento, i) => {
      const enTriada = triada.includes(i);
      segmento.classList.toggle('en-triada', enTriada);
      segmento.setAttribute('aria-selected', String(i === indice));
      realces[i].classList.toggle('activo', enTriada);
    });

    girarTriangulo(indice);
    actualizarTarjetas(triada, animarTarjetas);

    const nombreTriada = NOMBRE_TRIADA[COLORES[indice].categoria];
    const nombres = triada.map((i) => COLORES[i].nombre.toLowerCase());
    tituloTriada.textContent = nombreTriada;
    coloresTriada.textContent = capitalizar(enumerar(nombres));

    if (anunciar) {
      anunciador.textContent = `${COLORES[indice].nombre} seleccionado. ${nombreTriada}: ${enumerar(nombres)}.`;
    }
  }

  /**
   * Gira el triángulo para que apunte a la nueva tríada. Como es equilátero,
   * cualquier giro múltiplo de 120° lo deja igual: se elige el más corto (±60°).
   */
  function girarTriangulo(indice) {
    const objetivo = indice * PASO;
    const delta = mod(objetivo - estado.anguloTriangulo + 60, 120) - 60;
    estado.anguloTriangulo += delta;
    triangulo.style.transform = `rotate(${estado.anguloTriangulo}deg)`;

    // Cada vértice se pinta con el color al que apunta
    vertices.forEach((vertice, k) => {
      const i = mod(Math.round((estado.anguloTriangulo + k * 120) / PASO), TOTAL);
      vertice.style.fill = COLORES[i].hex;
    });
  }

  /** Clic o toque en un segmento: se elige y la rueda lo lleva al indicador. */
  function elegirSegmento(indice) {
    const destino = estado.angulo + normalizar(-indice * PASO - estado.angulo);
    const distancia = Math.abs(destino - estado.angulo);
    girarA(destino, limitar(380 + distancia * 1.6, 380, 700), curvas.suave);
    seleccionar(indice);
  }

  /* ------------------------------------------------------------------------
     8. Tarjetas
     ------------------------------------------------------------------------ */
  let turnoTarjetas = 0;   // evita que una animación vieja pise a una nueva

  function rellenarTarjeta(tarjeta, color, posicion) {
    tarjeta.dataset.hex = color.hex;
    tarjeta.querySelector('.tarjeta__muestra').style.setProperty('--muestra', color.hex);
    tarjeta.querySelector('.tarjeta__nombre').textContent = color.nombre;
    tarjeta.querySelector('.tarjeta__categoria').textContent = capitalizar(color.categoria);
    tarjeta.querySelector('.tarjeta__hex-valor').textContent = color.hex;
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
      const contenido = tarjeta.querySelector('.tarjeta__contenido');
      const puedeAnimar = animar && !sinMovimiento() && typeof contenido.animate === 'function';

      if (contenido.getAnimations) contenido.getAnimations().forEach((a) => a.cancel());
      if (!puedeAnimar) {
        rellenarTarjeta(tarjeta, color, posicion);
        return;
      }

      // Sale el color anterior, se cambia el contenido y entra el nuevo (escalonado)
      const salida = contenido.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(6px)' }],
        { duration: 170, delay: posicion * 60, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' }
      );
      salida.finished
        .then(() => {
          if (turno !== turnoTarjetas) return;
          rellenarTarjeta(tarjeta, color, posicion);
          const entrada = contenido.animate(
            [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }],
            { duration: 330, easing: 'cubic-bezier(.22, .8, .24, 1)', fill: 'forwards' }
          );
          salida.cancel();
          return entrada.finished.then(() => entrada.cancel());
        })
        .catch(() => { /* animación cancelada por un cambio más reciente */ });
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
  function mostrarAviso(texto, hex) {
    const punto = document.createElement('span');
    punto.className = 'aviso__punto';
    punto.style.backgroundColor = hex;
    const mensaje = document.createElement('span');
    mensaje.textContent = texto;
    aviso.replaceChildren(punto, mensaje);
    aviso.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.remove('visible'), 1800);
  }

  const temporizadoresCopia = new WeakMap();
  tarjetas.forEach((tarjeta) => {
    tarjeta.addEventListener('click', async () => {
      const hex = tarjeta.dataset.hex;
      const ok = await copiarTexto(hex);
      tarjeta.focus({ preventScroll: true });   // el método alternativo mueve el foco

      if (!ok) {
        mostrarAviso(`No se pudo copiar. Código: ${hex}`, hex);
        return;
      }
      mostrarAviso(`${hex} copiado al portapapeles`, hex);
      tarjeta.classList.add('copiada');
      clearTimeout(temporizadoresCopia.get(tarjeta));
      temporizadoresCopia.set(tarjeta, setTimeout(() => tarjeta.classList.remove('copiada'), 1600));
    });
  });

  /* ------------------------------------------------------------------------
     9. Arrastre con ratón o dedo (Pointer Events)
     ------------------------------------------------------------------------ */
  let arrastre = null;

  function centroDeRueda() {
    const r = rueda.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, radio: r.width / 2 };
  }

  /** Ángulo del puntero respecto al centro (0° arriba, sentido horario). */
  function anguloPuntero(e, centro) {
    return (Math.atan2(e.clientX - centro.x, -(e.clientY - centro.y)) * 180) / Math.PI;
  }

  /** Guarda el ángulo reciente para calcular la inercia al soltar. */
  function registrarMuestra(tiempo) {
    arrastre.muestras.push({ t: tiempo, a: estado.angulo });
    if (arrastre.muestras.length > 20) arrastre.muestras.shift();
  }

  rueda.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    detenerGiro();
    const centro = centroDeRueda();
    arrastre = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      centro,
      angulo: anguloPuntero(e, centro),
      movido: false,
      segmento: e.target.closest ? e.target.closest('[data-indice]') : null,
      muestras: [{ t: e.timeStamp, a: estado.angulo }],
    };
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
    // Muy cerca del eje el ángulo es inestable: solo se actualiza la referencia
    const distanciaAlCentro = Math.hypot(e.clientX - centro.x, e.clientY - centro.y);
    if (distanciaAlCentro > centro.radio * 0.12) {
      aplicarAngulo(estado.angulo + normalizar(angulo - arrastre.angulo));
    }
    arrastre.angulo = angulo;
    registrarMuestra(e.timeStamp);
  });

  function terminarArrastre(e, cancelado) {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const datos = arrastre;
    arrastre = null;
    rueda.classList.remove('arrastrando');

    // Toque o clic sin arrastrar: elegir el segmento pulsado
    if (!datos.movido) {
      if (datos.segmento && !cancelado) elegirSegmento(Number(datos.segmento.dataset.indice));
      else asentar();
      return;
    }

    // Arrastre: inercia según la velocidad de los últimos 100 ms y asentado al segmento más cercano
    const ahora = e.timeStamp;
    const recientes = datos.muestras.filter((m) => ahora - m.t <= 100);
    recientes.push({ t: ahora, a: estado.angulo });
    let velocidad = 0;   // grados por milisegundo
    if (recientes.length >= 2) {
      const primera = recientes[0];
      const ultima = recientes[recientes.length - 1];
      velocidad = (ultima.a - primera.a) / Math.max(16, ultima.t - primera.t);
    }
    const impulso = sinMovimiento() || cancelado ? 0 : limitar(velocidad * 130, -180, 180);
    const destino = Math.round((estado.angulo + impulso) / PASO) * PASO;
    const distancia = Math.abs(destino - estado.angulo);

    girarA(destino, limitar(320 + distancia * 2.4, 320, 1100), curvas.salida);
    seleccionar(indiceEnIndicador(destino));
  }

  rueda.addEventListener('pointerup', (e) => terminarArrastre(e, false));
  rueda.addEventListener('pointercancel', (e) => terminarArrastre(e, true));
  rueda.addEventListener('lostpointercapture', (e) => terminarArrastre(e, true));
  // Evita el menú contextual al mantener pulsado en pantallas táctiles
  rueda.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ------------------------------------------------------------------------
     10. Teclado: flechas para girar, Enter o Espacio para elegir
     ------------------------------------------------------------------------ */
  rueda.addEventListener('keydown', (e) => {
    let pasos = 0;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        pasos = 1;    // trae al indicador el siguiente color en sentido horario
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        pasos = -1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        seleccionar(indiceEnIndicador(estado.destino));
        return;
      default:
        return;
    }
    e.preventDefault();
    const base = Math.round(estado.destino / PASO) * PASO;
    girarA(base - pasos * PASO, 380, curvas.salida);
  });

  /* ------------------------------------------------------------------------
     11. Inicio: la rueda entra girando y se descubre la tríada primaria
     ------------------------------------------------------------------------ */
  function iniciar() {
    construirRueda();

    if (sinMovimiento()) {
      aplicarAngulo(0);
      seleccionar(0, { animarTarjetas: false, anunciar: false });
      return;
    }

    aplicarAngulo(-150);
    girarA(0, 1300, curvas.salida);
    setTimeout(() => {
      if (estado.seleccionado === -1) seleccionar(0, { animarTarjetas: false, anunciar: false });
    }, 900);
  }

  iniciar();
})();
