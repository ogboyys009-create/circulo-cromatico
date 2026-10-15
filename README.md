# Círculo Cromático

Rueda cromática RYB de **96 colores**. Gírala, elige un color o escribe cualquier código y descubre
su tríada, su complementario y otras armonías, con tonos claros y oscuros listos para copiar.

**Verla en línea:** <https://ogboyys009-create.github.io/circulo-cromatico/>

Hecha solo con **HTML, CSS y JavaScript nativos**, sin frameworks ni dependencias. Se abre con
doble clic en el navegador y se publica tal cual con GitHub Pages.

## Funciones

- **96 colores RYB** en su posición, cada 3,75°: 3 primarios, 3 secundarios, 6 terciarios y
  84 intermedios con nombre propio (Canario, Butano, Cadmio, Fucsia, Azul Klein, Lapislázuli,
  Pavo real, Viridián, Pistacho, Plátano…).
- **Buscar por código**: escribe un HEX (`#3A7BD5`, `3AD`), RGB (`rgb(58, 123, 213)` o
  `58 123 213`), HSL (`hsl(215, 65%, 53%)`), un nombre CSS (`tomato`) o un nombre de la rueda
  (`cobalto`, `azul klein`). Si el código no es un color de la rueda, la rueda gira hasta el más
  parecido y las armonías se calculan a partir del color exacto: se desplaza su matiz en el círculo
  RYB conservando su saturación y su luz (un azul pastel da una tríada pastel). Los grises, el
  blanco y el negro no tienen matiz y su armonía es el mismo color. Atajo de teclado: `/`.
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
- **Compartir**: el enlace guarda la armonía y el color (`#triada-amarillo`, o `#triada-3a7bd5` con un código propio). En el móvil abre el
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
| `→` / `↓`          | Siguiente color, 3,75° (la rueda gira)   |
| `Mayús` + flecha, `RePág` / `AvPág` | Salta 30°     |
| `/`                | Va al buscador de códigos                |
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
| 3,75° | Canario | Intermedio | `#FFCF00` | 183,75° | Glicinia | Intermedio | `#772DB7` |
| 7,5° | Girasol | Intermedio | `#FFC900` | 187,5° | Jacaranda | Intermedio | `#702FB9` |
| 11,25° | Mimosa | Intermedio | `#FFC400` | 191,25° | Iris | Intermedio | `#6A31BB` |
| 15° | Amarillo dorado | Intermedio | `#FFBE00` | 195° | Amatista | Intermedio | `#6433BD` |
| 18,75° | Oro | Intermedio | `#FFB900` | 198,75° | Campanilla | Intermedio | `#5E35BF` |
| 22,5° | Ámbar | Intermedio | `#FFB300` | 202,5° | Índigo | Intermedio | `#5837C0` |
| 26,25° | Miel | Intermedio | `#FFAE00` | 206,25° | Pervinca | Intermedio | `#523AC2` |
| 30° | Amarillo-naranja | Terciario | `#FFA800` | 210° | Azul-violeta | Terciario | `#4C3CC4` |
| 33,75° | Mango | Intermedio | `#FFA200` | 213,75° | Lapislázuli | Intermedio | `#4641C6` |
| 37,5° | Azafrán | Intermedio | `#FF9C00` | 217,5° | Zafiro | Intermedio | `#4045C7` |
| 41,25° | Albaricoque | Intermedio | `#FF9700` | 221,25° | Azul Prusia | Intermedio | `#3A4AC9` |
| 45° | Mandarina | Intermedio | `#FF9100` | 225° | Ultramar | Intermedio | `#344ECB` |
| 48,75° | Clementina | Intermedio | `#FF8C00` | 228,75° | Azul Klein | Intermedio | `#2E52CD` |
| 52,5° | Zanahoria | Intermedio | `#FF8600` | 232,5° | Cobalto | Intermedio | `#2856CE` |
| 56,25° | Butano | Intermedio | `#FF8100` | 236,25° | Azul eléctrico | Intermedio | `#235BD0` |
| 60° | Naranja | Secundario | `#FF7B00` | 240° | Azul | Primario | `#1D5FD1` |
| 63,75° | Caléndula | Intermedio | `#FE7504` | 243,75° | Azul Francia | Intermedio | `#1867CD` |
| 67,5° | Papaya | Intermedio | `#FD6E08` | 247,5° | Azur | Intermedio | `#136EC8` |
| 71,25° | Pimentón | Intermedio | `#FC680C` | 251,25° | Cielo | Intermedio | `#0F76C4` |
| 75° | Calabaza | Intermedio | `#FA6110` | 255° | Cerúleo | Intermedio | `#0A7DC0` |
| 78,75° | Cobre | Intermedio | `#F95B13` | 258,75° | Cian | Intermedio | `#0884BA` |
| 82,5° | Teja | Intermedio | `#F75416` | 262,5° | Pavo real | Intermedio | `#058AB3` |
| 86,25° | Coral | Intermedio | `#F64E19` | 266,25° | Petróleo | Intermedio | `#0391AD` |
| 90° | Rojo-naranja | Terciario | `#F4471C` | 270° | Azul-verde | Terciario | `#0098A6` |
| 93,75° | Lava | Intermedio | `#F2421D` | 273,75° | Aguamarina | Intermedio | `#049A9B` |
| 97,5° | Tomate | Intermedio | `#F03D1E` | 277,5° | Turquesa | Intermedio | `#089C90` |
| 101,25° | Amapola | Intermedio | `#EE391F` | 281,25° | Menta | Intermedio | `#0C9E85` |
| 105° | Bermellón | Intermedio | `#EC3420` | 285° | Esmeralda | Intermedio | `#10A07A` |
| 108,75° | Cadmio | Intermedio | `#EA301F` | 288,75° | Malaquita | Intermedio | `#14A26E` |
| 112,5° | Escarlata | Intermedio | `#E72B1D` | 292,5° | Jade | Intermedio | `#17A362` |
| 116,25° | Cereza | Intermedio | `#E5271C` | 296,25° | Viridián | Intermedio | `#1BA556` |
| 120° | Rojo | Primario | `#E2231A` | 300° | Verde | Secundario | `#1FA74A` |
| 123,75° | Fresa | Intermedio | `#DE2125` | 303,75° | Albahaca | Intermedio | `#2EAB44` |
| 127,5° | Rubí | Intermedio | `#DA1E2F` | 307,5° | Trébol | Intermedio | `#3DAF3E` |
| 131,25° | Granate | Intermedio | `#D61C3A` | 311,25° | Helecho | Intermedio | `#4CB438` |
| 135° | Carmín | Intermedio | `#D11A45` | 315° | Verde hierba | Intermedio | `#5BB832` |
| 138,75° | Grosella | Intermedio | `#CD1A4F` | 318,75° | Kiwi | Intermedio | `#6BBD2D` |
| 142,5° | Frambuesa | Intermedio | `#C81959` | 322,5° | Manzana | Intermedio | `#7BC127` |
| 146,25° | Fucsia | Intermedio | `#C41963` | 326,25° | Pistacho | Intermedio | `#8BC622` |
| 150° | Rojo-violeta | Terciario | `#C0186D` | 330° | Amarillo-verde | Terciario | `#9BCB1C` |
| 153,75° | Buganvilla | Intermedio | `#B81A77` | 333,75° | Chartreuse | Intermedio | `#A8CD19` |
| 157,5° | Magenta | Intermedio | `#AF1C81` | 337,5° | Pera | Intermedio | `#B5CE15` |
| 161,25° | Orquídea | Intermedio | `#A71F8C` | 341,25° | Cítrico | Intermedio | `#C2D012` |
| 165° | Púrpura | Intermedio | `#9F2196` | 345° | Lima | Intermedio | `#CFD20E` |
| 168,75° | Ciruela | Intermedio | `#97249E` | 348,75° | Pomelo | Intermedio | `#DBD30B` |
| 172,5° | Uva | Intermedio | `#8E26A5` | 352,5° | Limón | Intermedio | `#E7D307` |
| 176,25° | Morado | Intermedio | `#8629AD` | 356,25° | Plátano | Intermedio | `#F3D404` |

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

- Tipografías: [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) para
  títulos y el nombre del color, e [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans)
  para el texto. Ambas con licencia SIL OFL 1.1, incrustadas en `css/fuentes.css`.
- Interfaz en tinta neutra (clara u oscura) para que lo único con color sean la rueda y la paleta.
- Los colores en pantalla son orientativos: para pintar, compruébalos con una muestra real.
