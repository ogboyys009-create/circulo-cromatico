# Círculo Cromático

Rueda cromática RYB de **48 colores**. Gírala, elige un color y descubre su tríada, su
complementario y otras armonías, con tonos claros y oscuros listos para copiar.

**Verla en línea:** <https://ogboyys009-create.github.io/circulo-cromatico/>

Hecha solo con **HTML, CSS y JavaScript nativos**, sin frameworks ni dependencias. Se abre con
doble clic en el navegador y se publica tal cual con GitHub Pages.

## Funciones

- **48 colores RYB** en su posición, cada 7,5°: 3 primarios, 3 secundarios, 6 terciarios y
  36 intermedios con nombre propio (Girasol, Azafrán, Escarlata, Frambuesa, Jacaranda, Cobalto,
  Pavo real, Jade, Trébol, Limón…).
- **Tocar para elegir**: el color se elige por el ángulo del toque, así que acertar en un sector
  fino del anillo es fácil también con el dedo.
- **Giro con física**: arrastra el anillo con el ratón o el dedo; si lo lanzas, sigue girando por
  inercia y se asienta con un muelle suave en el color más cercano. El color bajo el puntero se
  muestra en vivo (nombre grande, disco central y armonía) mientras giras.
- **Cinco armonías**: tríada, complementario, análogo, complementario dividido y tétrada. La rueda
  atenúa el resto, marca los colores y dibuja la figura que los une.
- **Paleta** con cada color de la armonía: nombre, código, contraste del texto (blanco u oscuro,
  según cuál se lea mejor, con su relación WCAG) y **5 tonos** del más claro al más oscuro.
- **Copiar** cualquier color o tono en **HEX, RGB o HSL**, la paleta entera o como
  **variables CSS**.
- **Color al azar**: una vuelta larga que frena en un color nuevo.
- **Compartir**: el enlace guarda la armonía y el color (`#triada-amarillo`). En el móvil abre el
  menú de compartir del sistema.
- **Tema claro y oscuro**: sigue al sistema y se puede cambiar con el botón de arriba.
- **Accesible**: navegación con teclado, etiquetas ARIA, anuncios para lectores de pantalla y
  contraste AA en los textos.
- **Responsive**: una columna en móvil, dos en escritorio.
- **Respeta `prefers-reduced-motion`**.

## Rendimiento

Pensada para ir fluida en móviles modestos, en iOS, Android, macOS y Windows:

- El anillo se dibuja una sola vez. Al girar solo cambia un `transform` de su capa.
- Al soltar, la trayectoria (inercia + muelle) se calcula de antemano y se reproduce con
  **Web Animations**, que ejecuta el compositor del navegador: el giro no se traba aunque el hilo
  principal esté ocupado.
- Durante el arrastre, las escrituras se agrupan en un solo fotograma.
- Sin filtros, desenfoques ni sombras animadas. Las tipografías van incrustadas, sin peticiones a
  otros servidores.

Probado con Chrome (CPU ralentizada ×4: 60 fps constantes) y con WebKit, el motor de Safari
(escritorio e iPhone emulado).

## Uso con teclado

| Tecla              | Acción                                   |
| ------------------ | ---------------------------------------- |
| `Tab`              | Enfoca la rueda y después los controles  |
| `→` / `↓`          | Siguiente color, 7,5° (la rueda gira)    |
| `←` / `↑`          | Color anterior                           |
| `Inicio` / `Fin`   | Primer / último color                    |
| `Enter` en un color de la paleta | Copia su código            |

## Armonías

| Armonía                 | Posiciones respecto a tu color |
| ----------------------- | ------------------------------ |
| Tríada                  | 0°, 120°, 240°                 |
| Complementario          | 0°, 180°                       |
| Análogo                 | 0°, +30°, −30°                 |
| Complementario dividido | 0°, 150°, 210°                 |
| Tétrada                 | 0°, 90°, 180°, 270°            |

## Colores

| Pos. | Color | Tipo | HEX | Pos. | Color | Tipo | HEX |
| ---- | ----- | ---- | --- | ---- | ----- | ---- | --- |
| 0° | Amarillo | Primario | `#FFD400` | 180° | Violeta | Secundario | `#7D2BB5` |
| 7,5° | Girasol | Intermedio | `#FFC900` | 187,5° | Jacaranda | Intermedio | `#702FB9` |
| 15° | Amarillo dorado | Intermedio | `#FFBE00` | 195° | Amatista | Intermedio | `#6433BD` |
| 22,5° | Ámbar | Intermedio | `#FFB300` | 202,5° | Índigo | Intermedio | `#5837C0` |
| 30° | Amarillo-naranja | Terciario | `#FFA800` | 210° | Azul-violeta | Terciario | `#4C3CC4` |
| 37,5° | Azafrán | Intermedio | `#FF9C00` | 217,5° | Zafiro | Intermedio | `#4045C7` |
| 45° | Mandarina | Intermedio | `#FF9100` | 225° | Ultramar | Intermedio | `#344ECB` |
| 52,5° | Zanahoria | Intermedio | `#FF8600` | 232,5° | Cobalto | Intermedio | `#2856CE` |
| 60° | Naranja | Secundario | `#FF7B00` | 240° | Azul | Primario | `#1D5FD1` |
| 67,5° | Papaya | Intermedio | `#FD6E08` | 247,5° | Azur | Intermedio | `#136EC8` |
| 75° | Calabaza | Intermedio | `#FA6110` | 255° | Cerúleo | Intermedio | `#0A7DC0` |
| 82,5° | Teja | Intermedio | `#F75416` | 262,5° | Pavo real | Intermedio | `#058AB3` |
| 90° | Rojo-naranja | Terciario | `#F4471C` | 270° | Azul-verde | Terciario | `#0098A6` |
| 97,5° | Tomate | Intermedio | `#F03D1E` | 277,5° | Turquesa | Intermedio | `#089C90` |
| 105° | Bermellón | Intermedio | `#EC3420` | 285° | Esmeralda | Intermedio | `#10A07A` |
| 112,5° | Escarlata | Intermedio | `#E72B1D` | 292,5° | Jade | Intermedio | `#17A362` |
| 120° | Rojo | Primario | `#E2231A` | 300° | Verde | Secundario | `#1FA74A` |
| 127,5° | Rubí | Intermedio | `#DA1E2F` | 307,5° | Trébol | Intermedio | `#3DAF3E` |
| 135° | Carmín | Intermedio | `#D11A45` | 315° | Verde hierba | Intermedio | `#5BB832` |
| 142,5° | Frambuesa | Intermedio | `#C81959` | 322,5° | Manzana | Intermedio | `#7BC127` |
| 150° | Rojo-violeta | Terciario | `#C0186D` | 330° | Amarillo-verde | Terciario | `#9BCB1C` |
| 157,5° | Magenta | Intermedio | `#AF1C81` | 337,5° | Pera | Intermedio | `#B5CE15` |
| 165° | Púrpura | Intermedio | `#9F2196` | 345° | Lima | Intermedio | `#CFD20E` |
| 172,5° | Uva | Intermedio | `#8E26A5` | 352,5° | Limón | Intermedio | `#E7D307` |

## Estructura

```
circulo-cromatico/
├── index.html        Estructura de la página y marcado accesible
├── css/
│   ├── fuentes.css   Tipografías incrustadas en base64 (archivo generado)
│   └── styles.css    Temas claro y oscuro, rueda, paleta, controles y responsive
├── js/
│   └── app.js        Colores, dibujo de la rueda, física del giro, armonías, paleta y copiado
├── licencias/        Licencias SIL Open Font License de las tipografías
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

1. Crea un repositorio vacío en GitHub (sin README ni .gitignore).
2. Conecta este repositorio local y sube la rama `main`:

   ```bash
   git remote add origin https://github.com/<tu-usuario>/circulo-cromatico.git
   git push -u origin main
   ```

3. En GitHub ve a **Settings → Pages**. En **Build and deployment → Source** elige
   **Deploy from a branch**, rama **main** y carpeta **/ (root)**, y pulsa **Save**.
4. En uno o dos minutos la página estará en `https://<tu-usuario>.github.io/circulo-cromatico/`.

## Diseño

- Tipografías: [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) en cursiva
  para el nombre del color y los títulos, y [Manrope](https://fonts.google.com/specimen/Manrope)
  para el texto y los controles. Ambas con licencia SIL OFL 1.1, incrustadas en `css/fuentes.css`.
- Interfaz en tinta neutra (clara u oscura) para que lo único con color sean la rueda y la paleta.
- Los colores en pantalla son orientativos: para pintar, compruébalos con una muestra real.
