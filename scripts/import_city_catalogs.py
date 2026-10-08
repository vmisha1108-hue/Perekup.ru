"""Import a one-time Auto.ru snapshot, preserving IDs of already imported cities.

Run from the repository root: python3 scripts/import_city_catalogs.py
Only Python's standard library is required. Cache lives outside the repository.
"""
import concurrent.futures
import hashlib
import html
import json
from pathlib import Path
import random
import re
import shutil
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path('/tmp/perekup-city-import')
CACHE.mkdir(exist_ok=True)
BINS = [(10000, 100000), (100001, 500000), (500001, 1000000),
        (1000001, 2000000), (2000001, 5000000), (5000001, 10000000)]
NETWORK_LOCK = threading.Lock()
LAST_REQUEST = 0
STOP = threading.Event()
SELLERS = [('Артём', '🧔'), ('Анна', '👩'), ('Сергей', '👨‍🔧'), ('Ольга', '👩‍💼'),
           ('Дмитрий', '👨'), ('Марина', '👩‍🦰'), ('Виктор', '👨‍💼'), ('Вера', '👵'),
           ('Максим', '🧑‍🦱'), ('Павел', '👨‍🔧'), ('Игорь', '👨‍🦲'), ('Елена', '👩'),
           ('Алексей', '🧔'), ('Кирилл', '👨'), ('Роман', '👨‍💼'), ('Наталья', '👩‍💼')]

def request(url):
    global LAST_REQUEST
    if STOP.is_set():
        raise RuntimeError('Import stopped after a rate-limit response')
    with NETWORK_LOCK:
        time.sleep(max(0, .15 - (time.monotonic() - LAST_REQUEST)))
        LAST_REQUEST = time.monotonic()
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        if error.code == 429:
            STOP.set()
        raise

def page(url, path):
    if not path.exists():
        path.write_bytes(request(url))
    return path.read_text()

def clean(value):
    return ' '.join(html.unescape(re.sub(r'<[^>]*>', ' ', value)).split())

def schemas(document):
    return [json.loads(block) for block in re.findall(
        r'<script type="application/ld\+json">(.*?)</script>', document, re.S)]

def specs(document):
    result = {}
    for row in re.findall(r'<li class="CardInfoSummary[^>]+>(.*?)</li>', document, re.S):
        label = re.search(r'<div class="CardInfoSummary(?:SimpleRow__label|ComplexRow__cellTitle)[^"]*">(.*?)</div>', row, re.S)
        value = re.search(r'<div class="CardInfoSummary(?:SimpleRow__content|ComplexRow__cellValue)[^"]*">(.*?)</div>', row, re.S)
        if label and value:
            result[clean(label.group(1))] = clean(value.group(1))
    return result

def offers_for(city, bin_index, number):
    low, high = BINS[bin_index]
    url = f'https://auto.ru/{city["autoRuSlug"]}/cars/all/?price_from={low}&price_to={high}&geo_radius=0&page={number}'
    document = page(url, CACHE / f'{city["id"]}-list-{bin_index}-{number}.html')
    product = next((s for s in schemas(document) if s.get('@type') == 'Product'), None)
    if not product:
        if 'ListingResetFiltersSuggest' in document or 'ListingEmpty' in document:
            return []
        raise ValueError('No listing data: ' + city['name'])
    locations = {}
    for card in re.split(r'<div class="ListingItemUniversal-[^"]*"', document)[1:]:
        link = re.search(r'href="(https://auto.ru/cars/used/sale/[^"]+)"', card)
        location = re.search(r'<span class="MetroListPlace__regionName[^"]*">(.*?)</span>', card, re.S)
        if link and location:
            locations[link.group(1)] = clean(location.group(1))
    result = []
    for offer in product.get('offers', {}).get('offers', []):
        link = offer.get('url', '')
        if '/cars/used/sale/' not in link or locations.get(link) != city['name']:
            continue
        if not low <= offer.get('price', 0) <= high:
            continue
        result.append({'url': link, 'brand': link.split('/')[6], 'bin': bin_index})
    return result

def inspect(offer, city):
    key = offer['url'].rstrip('/').split('/')[-1]
    cached = CACHE / f'{key}.json'
    if cached.exists():
        return json.loads(cached.read_text())
    document = page(offer['url'], CACHE / f'{key}.html')
    data = next((s for s in schemas(document) if s.get('@type') == 'Product' and 'productionDate' in s), None)
    if not data:
        return None
    location = re.search(r'<span class="MetroListPlace__regionName[^"]*">(.*?)</span>', document, re.S)
    if not location or clean(location.group(1)) != city['name']:
        return None
    price = int(data['offers']['price'])
    if not 10000 <= price <= 10000000 or 'InStock' not in data['offers'].get('availability', ''):
        return None
    fields = specs(document)
    if not all(fields.get(k) for k in ['Двигатель', 'Коробка', 'Пробег']):
        return None
    year = int(data['productionDate'])
    if year > 2022:
        return None  # Avoid new-car credit/discount advertisements.
    image = re.search(r'<meta property="og:image" content="([^"]+)"', document)
    if not image:
        return None
    photo_url = html.unescape(image.group(1))
    photo = CACHE / f'{key}.jpg'
    if not photo.exists():
        image_bytes = request(photo_url)
        if not image_bytes.startswith(b'\xff\xd8\xff'):
            return None
        photo.write_bytes(image_bytes)
    model = clean(data['name']).replace('«', '').replace('»', '').replace('"', '').replace('Classic Classic', 'Classic')
    result = {'name': model + f', {year}', 'price': price, 'city': city['name'],
              'cityId': city['id'], 'url': offer['url'], 'photo': photo_url,
              'imageFile': str(photo), 'specifications': {k: fields[k] for k in ['Двигатель', 'Коробка', 'Пробег']},
              'brand': offer['brand'], 'retrieved': '2026-10-08', 'provider': 'Auto.ru'}
    cached.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    return result

def collect_city(city, retained):
    if len(retained) == 30:
        return [{**r, 'imageFile': str(ROOT / f'img/regions/{city["id"]}/{r["id"]}.jpg')} for r in retained]
    chosen_file = CACHE / f'{city["id"]}-chosen.json'
    if chosen_file.exists():
        records = json.loads(chosen_file.read_text())
        if len(records) == 30:
            return records
    else:
        records = []
    buckets = []
    for i in range(len(BINS)):
        buckets.append(offers_for(city, i, 1))
    seen = {r['url'] for r in records}
    attempted = set()
    def add(offer, limit):
        if offer['url'] in seen or offer['url'] in attempted:
            return False
        if sum(r['brand'] == offer['brand'] for r in records) >= limit:
            return False
        attempted.add(offer['url'])
        try:
            record = inspect(offer, city)
        except urllib.error.HTTPError as error:
            if error.code in [403, 404, 410]:
                return False
            raise
        if not record or any(r['photo'] == record['photo'] for r in records):
            return False
        seen.add(offer['url'])
        records.append(record)
        chosen_file.write_text(json.dumps(records, ensure_ascii=False, indent=2))
        return True
    for i, bucket in enumerate(buckets):
        before = len(records)
        for offer in bucket:
            add(offer, 3)
            if len(records) - before >= 4:
                break
    for limit in [3, 6, 12, 30]:
        for bucket in buckets:
            for offer in bucket:
                if len(records) >= 30:
                    break
                add(offer, limit)
    if len(records) < 30:
        for i in range(len(BINS)):
            if len(records) >= 30:
                break
            for offer in offers_for(city, i, 2):
                if len(records) >= 30:
                    break
                add(offer, 30)
    print(f'{city["name"]}: {len(records)}/30, {len({r["brand"] for r in records})} brands', flush=True)
    if len(records) != 30:
        raise ValueError(f'Only {len(records)} verified cars in {city["name"]}')
    return records

def game_car(record, id):
    fields = record['specifications']
    transmission = {'механическая': 'механика', 'автоматическая': 'автомат', 'роботизированная': 'робот'}.get(fields['Коробка'], fields['Коробка'])
    description = ', '.join([fields['Двигатель'], transmission, fields['Пробег']])
    if len(description) > 120:
        raise ValueError('Description too long: ' + record['name'])
    rng = random.Random(int(hashlib.sha256(record['url'].encode()).hexdigest()[:16], 16))
    name, avatar = rng.choice(SELLERS)
    image_path = f'img/regions/{record["cityId"]}/{id}.jpg'
    destination = ROOT / image_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    if Path(record['imageFile']).resolve() != destination.resolve():
        shutil.copyfile(record['imageFile'], destination)
    return {'id': id, 'name': record['name'], 'price': record['price'], 'img': image_path,
            'desc': description, 'cityId': record['cityId'],
            'seller': {'name': name, 'avatar': avatar, 'personality': rng.choice(['kind', 'neutral', 'neutral', 'neutral', 'evil'])}}

def regional_legends(cities):
    templates = json.loads((ROOT / 'data/legend-templates.json').read_text())
    legends = []
    for city_index, city in enumerate(cities):
        for j in range(3):
            template = templates[(city_index * 3 + j) % len(templates)]
            name, avatar = SELLERS[(city_index + j * 5) % len(SELLERS)]
            description = 'Игровая легенда: ' + template['desc']
            if len(description) > 120:
                raise ValueError('Legend description too long')
            legends.append({'id': city['catalogBase'] + 901 + j,
                            'name': template['name'], 'price': template['basePrice'] + city_index * 25000 + j * 50000,
                            'img': template['img'], 'desc': description, 'cityId': city['id'], 'legend': True,
                            'seller': {'name': name, 'avatar': avatar, 'personality': ['kind', 'neutral', 'evil'][j]}})
    return legends

def main():
    cities = json.loads((ROOT / 'data/catalog-cities.json').read_text())
    cars = []
    sources = []
    failures = []
    source_file = ROOT / 'data/regional-sources.json'
    retained = json.loads(source_file.read_text())['cars'] if source_file.exists() else []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs = {pool.submit(collect_city, city, [r for r in retained if r['cityId'] == city['id']]): city for city in cities}
        for job in concurrent.futures.as_completed(jobs):
            city = jobs[job]
            try:
                records = job.result()
                for i, record in enumerate(records):
                    id = record.get('id', city['catalogBase'] + i + 1)
                    cars.append(game_car(record, id))
                    sources.append({k: v for k, v in {**record, 'id': id}.items() if k != 'imageFile'})
            except Exception as error:
                print(f'FAILED {city["name"]}: {error} {getattr(error, "url", "")}', flush=True)
                failures.append(city['name'])
    if failures:
        raise RuntimeError('Incomplete import; existing catalogue retained. Missing: ' + ', '.join(failures))
    real_count = len(cars)
    legends = regional_legends(cities)
    cars.extend(legends)
    cars.sort(key=lambda car: car['id'])
    sources.sort(key=lambda item: item['id'])
    (ROOT / 'regional-cars.js').write_text('var REGIONAL_CARS = ' + json.dumps(cars, ensure_ascii=False, indent=2) + ';\n')
    (ROOT / 'data/regional-sources.json').write_text(json.dumps({'note': 'One-time snapshot of real Auto.ru listings. Cities, prices, specifications and photographs checked on each listing page; game sellers are fictional.', 'cars': sources}, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'data/regional-legends.json').write_text(json.dumps({'note': 'Fictional bonus listings. Photos illustrate the models and are credited in photo-credits.html. IDs do not overlap real listings.', 'cars': legends}, ensure_ascii=False, indent=2) + '\n')
    print(f'COMPLETE: {real_count} real cars + {len(legends)} game legends in {len(cities)} cities', flush=True)

if __name__ == '__main__':
    main()
