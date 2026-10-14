# Círculo Cromático

Rueda cromática interactiva de 12 colores basada en la teoría del color tradicional (RYB).
Gira la rueda, elige un color y descubre su **tríada**: los dos colores que están a 120° de él.

Hecha solo con **HTML, CSS y JavaScript nativos**, sin frameworks ni dependencias.
Se abre directamente en el navegador y se puede publicar tal cual con GitHub Pages.

## Funciones

- **12 colores en su posición RYB**: 3 primarios (rojo, amarillo, azul), 3 secundarios
  (naranja, verde, violeta) y 6 terciarios (rojo-naranja, amarillo-naranja, amarillo-verde,
  azul-verde, azul-violeta, rojo-violeta).
- **Plato de porcelana esmaltada**: anillo de latón cepillado, esmaltes separados por filetes de
  oro (cloisonné), nombres grabados en el borde con 1, 2 o 3 perlas según la categoría, collar de
  perlas doradas y brillo de esmalte fijo, como la luz de la cocina.
- **Giro con física real**: arrastra con el ratón o con el dedo (Pointer Events). Si la lanzas,
  sigue girando por inercia y se asienta con un muelle suave en el segmento más cercano.
- **Colgante dorado**: marca el color activo, muestra su gema del mismo color y oscila cada vez
  que un filete pasa por debajo, como el trinquete de una ruleta.
- **Sonido sintetizado** (Web Audio, sin archivos): un clic metálico por cada segmento y un
  arpegio de caja de música al elegir. Cada color es un semitono, así que una tríada suena como
  un acorde aumentado. Se puede silenciar con el botón de arriba a la derecha.
- **Elegir un color**: con un clic o un toque sobre un segmento (la rueda lo lleva al colgante)
  o soltando la rueda con el color deseado bajo el colgante.
- **Tríada resaltada**: los tres esmaltes se elevan con bisel de oro, un leve aumento de tamaño y
  sombra suave; el resto se atenúa. Un triángulo dorado se dibuja en el centro con una veladura de
  los tres colores y joyas en los vértices, y una onda dorada recorre la rueda.
- **Vista previa**: al pasar el ratón por un color, o mientras arrastras, un triángulo punteado
  anticipa su tríada.
- **Luz reflejada**: los colores de la tríada iluminan la encimera alrededor del plato y giran con él.
- **Inclinación 3D** del plato hacia el puntero en escritorio.
- **Tarjetas de porcelana** con nombre, categoría, HEX y RGB. Al pulsar una tarjeta se copia el
  HEX; el botón *Copiar paleta* copia los tres códigos a la vez.
- **Accesible**: navegación con teclado, etiquetas ARIA, anuncios para lectores de pantalla y
  contraste AA del texto sobre el fondo crema.
- **Responsive**: móvil, tableta y escritorio.
- **Respeta `prefers-reduced-motion`**: sin animaciones, inclinación ni inercia para quien lo
  tenga activado.

## Uso con teclado

| Tecla                | Acción                                           |
| -------------------- | ------------------------------------------------ |
| `Tab`                | Enfoca la rueda y después las tarjetas           |
| `→` / `↓`            | Gira la rueda un segmento (siguiente color)      |
| `←` / `↑`            | Gira la rueda un segmento (color anterior)       |
| `Enter` / `Espacio`  | Elige el color que está bajo el indicador        |
| `Enter` en tarjeta   | Copia su código HEX                              |

## Colores

| Posición | Color            | Categoría  | HEX       |
| -------- | ---------------- | ---------- | --------- |
| 0°       | Amarillo         | Primario   | `#FFD400` |
| 30°      | Amarillo-naranja | Terciario  | `#FFA800` |
| 60°      | Naranja          | Secundario | `#FF7B00` |
| 90°      | Rojo-naranja     | Terciario  | `#F4471C` |
| 120°     | Rojo             | Primario   | `#E2231A` |
| 150°     | Rojo-violeta     | Terciario  | `#C0186D` |
| 180°     | Violeta          | Secundario | `#7D2BB5` |
| 210°     | Azul-violeta     | Terciario  | `#4C3CC4` |
| 240°     | Azul             | Primario   | `#1D5FD1` |
| 270°     | Azul-verde       | Terciario  | `#0098A6` |
| 300°     | Verde            | Secundario | `#1FA74A` |
| 330°     | Amarillo-verde   | Terciario  | `#9BCB1C` |

Las cuatro tríadas posibles son: primaria (amarillo, rojo, azul), secundaria (naranja, violeta,
verde) y dos terciarias (amarillo-naranja, rojo-violeta, azul-verde / rojo-naranja,
azul-violeta, amarillo-verde).

## Estructura

```
circulo-cromatico/
├── index.html        Estructura de la página y marcado accesible
├── css/
│   └── styles.css    Tema visual (marfil, lino, latón y café), rueda, tarjetas y responsive
├── js/
│   └── app.js        Datos, dibujo SVG, física del giro, sonido, tríadas, tarjetas y copiado
├── README.md
└── .gitignore
```

## Ver el proyecto en local

Abre `index.html` con doble clic en cualquier navegador moderno. No hace falta instalar nada.

Si prefieres un servidor local (por ejemplo, para que el portapapeles use la API moderna):

```bash
python -m http.server 8000
```

y abre <http://localhost:8000>.

## Publicar en GitHub Pages

1. Crea un repositorio vacío en GitHub llamado `circulo-cromatico` (sin README ni .gitignore).
2. Conecta este repositorio local y sube la rama `main`:

   ```bash
   git remote add origin https://github.com/<tu-usuario>/circulo-cromatico.git
   git push -u origin main
   ```

3. En GitHub ve a **Settings → Pages**. En **Build and deployment → Source** elige
   **Deploy from a branch**, rama **main** y carpeta **/ (root)**, y pulsa **Save**.
4. En uno o dos minutos la página estará en
   `https://<tu-usuario>.github.io/circulo-cromatico/`.

## Diseño

- Tipografías: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) para
  los títulos e [Inter](https://fonts.google.com/specimen/Inter) para el texto (Google Fonts).
- Paleta: marfil `#FAF3E3`, lino `#F0E4CC`, latón `#B8924A`, café espresso `#3B2A20` y
  café con leche `#8A7260`. Para el texto pequeño se usan variantes un poco más oscuras del latón
  y del café con leche, de modo que cumplan el contraste AA.
