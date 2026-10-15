# Images added with the business update

The built-in `image_gen` tool was used for the two cosmetic-wear assets. The original generated PNGs were retained outside the repository; the game uses optimised WebP copies.

- `img/wear/lada-2114.webp`: edited from `img/fictional/1.jpg`; same silver car and courtyard, with cosmetic scuffs and light rust. After preparation the game returns to the original clean photograph.
- `img/wear/scuffs.webp`: transparent raster texture used on other inexpensive cars; it is removed after preparation.

Prompt for the Lada edit:

> Use case: precise-object-edit. Edit target: the attached local photo of a silver Lada 2114, a cheap used car in a Russian car trading game. Add plausible visible age-related wear ONLY on the car: scuffed front bumper, a few scratches in paint on the lower door and fender, small rust spots along sill and wheel arch, slightly faded paint. Keep the exact same car model, silver color, shape, camera angle, wheels, courtyard and light, car fully intact and roadworthy. Natural used-car listing photograph, subtle realistic wear, no crash damage, no overlays or text. This car costs about 90,000 roubles, make its cosmetic wear clear without exaggeration.

Prompt for the transparent overlay:

> Use case: product-mockup. Asset type: transparent cosmetic wear texture for compositing on a car body in a browser game. A square transparent canvas containing ONLY a few thin pale paint scuffs, dusty grey surface scratches, two small muted rust flecks and narrow scraped paint streaks. Arrange these sparse markings across a horizontal band from 25% to 80% of the image width, around 48% to 74% of its height. Make the marks photographed, fine and irregular, not drawn straight decorative lines. All other pixels transparent. No car, no body panels, no ground, no background, no frame, no text. Subtle wear of an old cheap used car, not crash damage. Actual alpha transparency.

## Model photographs

`img/commerce/*.webp` contains locally cached model photographs from Wikimedia Commons. Every image has an adjacent JSON record containing the original file, source URL, author, original licence and licence URL. The only processing was reduction in size and conversion to WebP. Original licences apply. `commerce-photo-credits.html` exposes the same attribution in the game.

The catalogue contains 1,000 simulated stock units across 87 model families, with 400 dealer cars and 600 imports. Photographs illustrate the model; the selected colour, equipment and condition are stated separately. Prices, equipment bundles, stock and import charges are game data.

Russian dealer selection was informed by official model ranges, including:

- https://haval.ru/
- https://www.chery.ru/models/
- https://www.geely-motors.com/
- https://jaecoo.ru/models/
- https://jetour-ru.com/
- https://livan-motors.ru/model/x3pro/

`commerce-models.json` is the curated source, `scripts/fetch-commerce-photos.py` refreshes the local photograph cache, and `scripts/build-commerce-models.py` compiles the browser data and attribution page. The game does not fetch catalogue data or photographs from third-party sites at runtime.
