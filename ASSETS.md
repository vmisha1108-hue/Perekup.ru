# Import catalogue illustrations

The built-in `image_gen` tool generated one game sprite atlas, used directly by all 38 import models. The final optimised asset is `img/commerce/import-illustrations-v1.webp` (1254 × 1254; 5 columns × 8 rows; last two cells empty). `img/commerce/import-illustrations-v1.json` fixes model-to-cell mappings so future model additions cannot shift existing pictures. SVG viewports crop the atlas at runtime without extra image files. These are model illustrations with approximate details and colours, not photographs of the offered vehicles. Previous Commons photos and their attribution remain available for older assets and dealer stock.

Final generation prompt (built-in mode):

> Use case: stylized-concept. Asset type: ONE production sprite atlas for the import catalogue of a car trading browser game. Create a perfectly regular grid of EXACTLY 5 columns and 8 rows (40 equal cells), canvas landscape width 2000 height 2000 or square high resolution, no outer margins or grid gaps. Each cell is a clean hand-painted digital automotive illustration on the exact same flat very pale cool grey studio background, one fully visible car centered with generous 12% inset. All cars front-left three-quarter view, distinct accurate model proportions, polished editorial game illustration, crisp outlines, soft cel shaded highlights and contact shadow, not a photograph. No labels, numbers, years, text, watermarks, dealer plates. Keep all car pixels inside their cell. Read each row LEFT TO RIGHT, models in this exact order. Row 1: red Toyota Raize compact SUV; pearl white Toyota Yaris Cross small crossover; silver Toyota Corolla Cross crossover; black Toyota Vellfire luxury minivan large chrome grille; white Toyota Noah tall family minivan. Row 2: black Toyota Voxy angular minivan; bronze Toyota Harrier coupe-like crossover; pale green Toyota Sienta rounded small minivan; blue Nissan Serena boxy minivan; orange Nissan Kicks compact SUV. Row 3: copper Nissan Ariya electric crossover with black closed grille; dark blue Honda ZR-V crossover oval grille; light blue Honda Freed small boxy minivan; red Acura Integra sporty liftback; silver Lexus NX angular SUV with spindle grille. Row 4: blue Lexus UX low crossover spindle grille; black Lexus LM luxury minivan huge spindle grille; blue BMW i4 fastback with tall twin kidney grille; grey BMW iX large electric SUV vertical twin grille; white Audi Q4 e-tron compact electric SUV with octagonal grille. Row 5: black Audi Q8 broad coupe SUV; white Mercedes-Benz GLB boxy compact SUV upright roof; silver Mercedes-Benz EQB boxy electric SUV closed grille; grey Hyundai Staria futuristic tall minivan with horizontal light strip; yellow Hyundai Casper tiny upright hatchback with round headlamps. Row 6: pale blue Hyundai Ioniq 5 angular retro electric crossover with pixel lights; black Kia Carnival long luxury minivan; red Kia EV6 sporty low electric crossover; orange Kia Seltos compact SUV; blue Genesis G70 sporty sedan twin horizontal lights. Row 7: dark green Genesis G90 long luxury sedan twin horizontal lights; white Volkswagen ID.4 rounded electric SUV; red Mazda CX-30 compact crossover; bronze Mazda CX-60 tall premium crossover; blue Subaru Crosstrek compact rugged hatchback black wheel cladding. Row 8: light blue Porsche Taycan low electric sports sedan; red Tesla Model 3 low smooth sedan; white Tesla Model Y rounded crossover; final two cells perfectly empty pale grey. Alignment is critical: exactly 5 equal columns by 8 equal rows, with each car fitting its own cell and no car straddling cells.

# Images added with the business update

The built-in `image_gen` tool was used for the two cosmetic-wear assets. The original generated PNGs were retained outside the repository; the game uses optimised WebP copies.

- `img/wear/lada-2114.webp`: edited from `img/fictional/1.jpg`; same silver car and courtyard, with cosmetic scuffs and light rust. After preparation the game returns to the original clean photograph.
- `img/wear/scuffs.webp`: transparent raster texture used on other inexpensive cars; it is removed after preparation.

Prompt for the Lada edit:

> Use case: precise-object-edit. Edit target: the attached local photo of a silver Lada 2114, a cheap used car in a Russian car trading game. Add plausible visible age-related wear ONLY on the car: scuffed front bumper, a few scratches in paint on the lower door and fender, small rust spots along sill and wheel arch, slightly faded paint. Keep the exact same car model, silver color, shape, camera angle, wheels, courtyard and light, car fully intact and roadworthy. Natural used-car listing photograph, subtle realistic wear, no crash damage, no overlays or text. This car costs about 90,000 roubles, make its cosmetic wear clear without exaggeration.

Prompt for the transparent overlay:

> Use case: product-mockup. Asset type: transparent cosmetic wear texture for compositing on a car body in a browser game. A square transparent canvas containing ONLY a few thin pale paint scuffs, dusty grey surface scratches, two small muted rust flecks and narrow scraped paint streaks. Arrange these sparse markings across a horizontal band from 25% to 80% of the image width, around 48% to 74% of its height. Make the marks photographed, fine and irregular, not drawn straight decorative lines. All other pixels transparent. No car, no body panels, no ground, no background, no frame, no text. Subtle wear of an old cheap used car, not crash damage. Actual alpha transparency.

## Model photographs

`img/commerce/*.webp` (except the generated import atlas described above) contains locally cached model photographs from Wikimedia Commons. Every image has an adjacent JSON record containing the original file, source URL, author, original licence and licence URL. The only processing was reduction in size and conversion to WebP. Original licences apply. `commerce-photo-credits.html` exposes the same attribution in the game.

The active catalogue contains one car per model: 49 new dealer models and 38 import models. The former 1,000 stock IDs are retained solely for compatibility with saved cars and orders. Photographs illustrate the model; the selected colour, equipment and condition are stated separately. Prices, equipment bundles, stock and import charges are game data.

Russian dealer selection was informed by official model ranges, including:

- https://haval.ru/
- https://www.chery.ru/models/
- https://www.geely-motors.com/
- https://jaecoo.ru/models/
- https://jetour-ru.com/
- https://livan-motors.ru/model/x3pro/

`commerce-models.json` is the curated source, `scripts/fetch-commerce-photos.py` refreshes the local photograph cache, and `scripts/build-commerce-models.py` compiles the browser data and attribution page. The game does not fetch catalogue data or photographs from third-party sites at runtime.
