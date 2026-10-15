# Círculo Cromático

Rueda cromática RYB de **24 colores**. Gírala, elige un color y descubre su tríada, su
complementario y otras armonías, con tonos claros y oscuros listos para copiar.

**Verla en línea:** <https://ogboyys009-create.github.io/circulo-cromatico/>

Hecha solo con **HTML, CSS y JavaScript nativos**, sin frameworks ni dependencias. Se abre con
doble clic en el navegador y se publica tal cual con GitHub Pages.

## Funciones

- **24 colores RYB** en su posición: 3 primarios, 3 secundarios, 6 terciarios y 12 intermedios
  (uno entre cada par vecino), cada 15°.
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
| `→` / `↓`          | Siguiente color (la rueda gira hasta él) |
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

| Pos. | Color            | Tipo       | HEX       | Pos. | Color          | Tipo       | HEX       |
| ---- | ---------------- | ---------- | --------- | ---- | -------------- | ---------- | --------- |
| 0°   | Amarillo         | Primario   | `#FFD400` | 180° | Violeta        | Secundario | `#7D2BB5` |
| 15°  | Amarillo dorado  | Intermedio | `#FFBE00` | 195° | Amatista       | Intermedio | `#6433BD` |
| 30°  | Amarillo-naranja | Terciario  | `#FFA800` | 210° | Azul-violeta   | Terciario  | `#4C3CC4` |
| 45°  | Mandarina        | Intermedio | `#FF9100` | 225° | Ultramar       | Intermedio | `#344ECB` |
| 60°  | Naranja          | Secundario | `#FF7B00` | 240° | Azul           | Primario   | `#1D5FD1` |
| 75°  | Calabaza         | Intermedio | `#FA6110` | 255° | Cerúleo        | Intermedio | `#0A7DC0` |
| 90°  | Rojo-naranja     | Terciario  | `#F4471C` | 270° | Azul-verde     | Terciario  | `#0098A6` |
| 105° | Bermellón        | Intermedio | `#EC3420` | 285° | Esmeralda      | Intermedio | `#10A07A` |
| 120° | Rojo             | Primario   | `#E2231A` | 300° | Verde          | Secundario | `#1FA74A` |
| 135° | Carmín           | Intermedio | `#D11A45` | 315° | Verde hierba   | Intermedio | `#5BB832` |
| 150° | Rojo-violeta     | Terciario  | `#C0186D` | 330° | Amarillo-verde | Terciario  | `#9BCB1C` |
| 165° | Púrpura          | Intermedio | `#9F2196` | 345° | Lima           | Intermedio | `#CFD20E` |

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
