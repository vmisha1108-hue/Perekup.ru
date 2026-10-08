var CUSTOM_CITIES = [
  {
    "id": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "name": "Благовещенск",
    "region": "Амурская область",
    "lat": 50.290659,
    "lon": 127.527198,
    "showRegion": true
  },
  {
    "id": "29a64605-5441-48c5-bc08-117a72ebc843",
    "name": "Алдан",
    "region": "Республика Саха (Якутия)",
    "lat": 58.6094283,
    "lon": 125.3817188,
    "showRegion": true
  },
  {
    "id": "magdagachi-amur",
    "name": "Магдагачи",
    "region": "Амурская область",
    "lat": 53.45,
    "lon": 125.8,
    "showRegion": true
  },
  {
    "id": "2a4a7c93-f3f8-4042-8cbf-e04ab64f5e08",
    "name": "Черкесск",
    "region": "Карачаево-Черкесия",
    "lat": 44.2269425,
    "lon": 42.0466704,
    "showRegion": true
  }
];

var CUSTOM_CARS = [
  {
    "id": 3000001,
    "name": "Toyota C-HR, 2018",
    "price": 1950000,
    "img": "img/custom/3000001.jpg",
    "desc": "1.8 л, гибрид, вариатор, 86 000 км, 122 л.с., передний привод",
    "full": "Серый кузов и заводские диски. Гибридная батарея проверена, салон аккуратный; показ на набережной Амура.",
    "seller": {
      "name": "Семен",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true
  },
  {
    "id": 3000002,
    "name": "Toyota Land Cruiser Prado, 2017",
    "price": 4450000,
    "img": "img/custom/3000002.jpg",
    "desc": "2.8 л, дизель, автомат, 124 000 км, 177 л.с., полный привод",
    "full": "Чёрный Prado 150 с кожаным салоном и штатной подвеской. Рама обработана, оба ключа и история обслуживания на руках.",
    "seller": {
      "name": "Семен",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true
  },
  {
    "id": 3000003,
    "name": "BMW X6 M Competition, 2021",
    "price": 14900000,
    "img": "img/custom/3000003.jpg",
    "desc": "4.4 л, бензин, автомат, 42 000 км, 625 л.с., полный привод",
    "full": "Синий F96 на оригинальных М-дисках. Без лишнего декора: заводской карбон, свежие тормоза и ухоженный салон.",
    "seller": {
      "name": "Семен",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true
  },
  {
    "id": 3000004,
    "name": "Toyota Chaser Tourer V, 1999",
    "price": 3100000,
    "img": "img/custom/3000004.jpg",
    "desc": "2.5 л, турбо, автомат, 178 000 км, 280 л.с., задний привод",
    "full": "JZX100 в жемчужно-белом цвете. Аккуратная губа, тёмные диски и небольшой клиренс; мотор 1JZ без экстремального форсирования.",
    "seller": {
      "name": "Никита",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000005,
    "name": "ЗИЛ-130, 1968",
    "price": 800000,
    "img": "img/custom/3000005.jpg",
    "desc": "6.0 л, бензин, механика, 92 000 км, 150 л.с., бортовой",
    "full": "Восстановленный голубой ЗИЛ с белой решёткой и деревянным бортом. Не рабочая развалюха: кабина покрашена, мотор обслужен.",
    "seller": {
      "name": "Никита",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000006,
    "name": "Toyota Probox Hybrid, 2020",
    "price": 1250000,
    "img": "img/custom/3000006.jpg",
    "desc": "1.5 л, гибрид, вариатор, 103 000 км, универсал, передний привод",
    "full": "Белый практичный Probox без грузового тюнинга. Чистый салон, ровный кузов, компактный багажник превращается в большой при сложенных сиденьях.",
    "seller": {
      "name": "Никита",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true
  },
  {
    "id": 3000007,
    "name": "Toyota Mark II, 1994",
    "price": 1100000,
    "img": "img/custom/3000007.jpg",
    "desc": "2.5 л, бензин, автомат, 224 000 км, 180 л.с., задний привод",
    "full": "Белый X90 с заводским обвесом и аккуратными дисками. Комфортная классика для города, кондиционер работает.",
    "seller": {
      "name": "Артём",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true
  },
  {
    "id": 3000008,
    "name": "Nissan Laurel, 1999",
    "price": 850000,
    "img": "img/custom/3000008.jpg",
    "desc": "2.5 л, бензин, автомат, 246 000 км, 200 л.с., задний привод",
    "full": "Серебристый C35 без сваренного дифференциала. Штатный салон и мягкая подвеска, кузов ухожен.",
    "seller": {
      "name": "Виктор",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true
  },
  {
    "id": 3000009,
    "name": "Mazda RX-8, 2006",
    "price": 1350000,
    "img": "img/custom/3000009.jpg",
    "desc": "1.3 л, бензин, механика, 112 000 км, 231 л.с., задний привод",
    "full": "Красный роторный спорткар на заводских дисках. Компрессия проверена, мотор прогревается перед поездками.",
    "seller": {
      "name": "Ольга",
      "avatar": "👩",
      "personality": "evil"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true
  },
  {
    "id": 3000010,
    "name": "Honda Fit RS, 2019",
    "price": 1800000,
    "img": "img/custom/3000010.jpg",
    "desc": "1.5 л, бензин, вариатор, 65 000 км, 132 л.с., передний привод",
    "full": "Жёлтый Fit RS с чёрными зеркалами. Без громкого выхлопа и наклеек, удобная городская комплектация.",
    "seller": {
      "name": "Анна",
      "avatar": "👩‍🦰",
      "personality": "kind"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true
  },
  {
    "id": 3000011,
    "name": "Toyota Corolla, 1993",
    "price": 90000,
    "img": "img/custom/3000011.jpg",
    "desc": "1.5 л, бензин, автомат, 318 000 км, 100 л.с., передний привод",
    "full": "Серебристая Corolla AE100 с аккуратным кузовом. Цена низкая из-за ремонта коробки: хороший вариант под восстановление.",
    "seller": {
      "name": "Павел",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true
  },
  {
    "id": 3000012,
    "name": "Mitsubishi Pajero, 2014",
    "price": 2350000,
    "img": "img/custom/3000012.jpg",
    "desc": "3.2 л, дизель, автомат, 174 000 км, 200 л.с., полный привод",
    "full": "Серебристый Pajero IV без огромных колёс и лифта. Обслужены раздатка и подвеска, салон после химчистки.",
    "seller": {
      "name": "Игорь",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true
  },
  {
    "id": 3000013,
    "name": "Lexus IS F, 2009",
    "price": 3950000,
    "img": "img/custom/3000013.jpg",
    "desc": "5.0 л, бензин, автомат, 138 000 км, 423 л.с., задний привод",
    "full": "Синий IS F с атмосферным V8 и родными дисками. Лёгкое занижение и чистая заводская внешность.",
    "seller": {
      "name": "Марина",
      "avatar": "👩",
      "personality": "kind"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000014,
    "name": "Toyota Celsior, 2005",
    "price": 3000000,
    "img": "img/custom/3000014.jpg",
    "desc": "4.3 л, бензин, автомат, 186 000 км, 280 л.с., задний привод",
    "full": "Чёрный UCF31, светлый кожаный салон. Умеренный VIP-стиль: красивые диски, без чрезмерного развала и обвеса.",
    "seller": {
      "name": "Дмитрий",
      "avatar": "👨",
      "personality": "evil"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true
  },
  {
    "id": 3000015,
    "name": "Nissan Silvia, 1995",
    "price": 2750000,
    "img": "img/custom/3000015.jpg",
    "desc": "2.0 л, турбо, механика, 165 000 км, 220 л.с., задний привод",
    "full": "Красная S14 с ровным кузовом. Небольшая губа и лёгкие диски, без дрифт-наклеек и огромного антикрыла.",
    "seller": {
      "name": "Роман",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000016,
    "name": "Suzuki Jimny, 2013",
    "price": 1650000,
    "img": "img/custom/3000016.jpg",
    "desc": "1.3 л, бензин, механика, 107 000 км, 85 л.с., полный привод",
    "full": "Зелёный компактный внедорожник на штатной подвеске. Понижайка работает, комплект зимних колёс входит в цену.",
    "seller": {
      "name": "Елена",
      "avatar": "👩‍💼",
      "personality": "neutral"
    },
    "cityId": "8f41253d-6e3b-48a9-842a-25ba894bd093",
    "fictional": true
  },
  {
    "id": 3000017,
    "name": "Toyota Crown Crossover RS Advanced, 2023",
    "price": 7800000,
    "img": "img/custom/3000017.jpg",
    "desc": "2.4 л, гибрид, автомат, 18 000 км, 349 л.с., полный привод",
    "full": "Новый кузов Crown: бронзовый низ, чёрный верх и оригинальные колёса. Богатая комплектация RS Advanced, показ у набережной.",
    "seller": {
      "name": "Женя",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "a4859da8-9977-4b62-8436-4e1b98c5d13f",
    "fictional": true
  },
  {
    "id": 3000018,
    "name": "ЗАЗ-968М, 1989",
    "price": 350000,
    "img": "img/custom/3000018.jpg",
    "desc": "1.2 л, бензин, механика, 64 000 км, 40 л.с., задний привод",
    "full": "Мятный Запорожец после бережной реставрации. Хром и салон аккуратные; на крыше свежий снег, машина хранится в тёплом гараже.",
    "seller": {
      "name": "Алексей",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000019,
    "name": "Волга ГАЗ-24, 1978",
    "price": 650000,
    "img": "img/custom/3000019.jpg",
    "desc": "2.4 л, бензин, механика, 118 000 км, 95 л.с., задний привод",
    "full": "Чёрная Волга с блестящими бамперами и ровным кузовом. Салон восстановлен в духе эпохи, без современных экранов и лишнего декора.",
    "seller": {
      "name": "Алексей",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000020,
    "name": "ГАЗ-51, 1964",
    "price": 700000,
    "img": "img/custom/3000020.jpg",
    "desc": "3.5 л, бензин, механика, 89 000 км, 70 л.с., бортовой",
    "full": "Тёмно-зелёный грузовик с деревянным кузовом. Отреставрирован для коллекции, кабина и рама ухожены, заводская внешность сохранена.",
    "seller": {
      "name": "Алексей",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000021,
    "name": "Москвич-412, 1977",
    "price": 280000,
    "img": "img/custom/3000021.jpg",
    "desc": "1.5 л, бензин, механика, 96 000 км, 75 л.с., задний привод",
    "full": "Голубой Москвич с хромом и тонкими бамперами. Кузов восстановлен, двигатель обслужен; снег на капоте после утреннего выезда.",
    "seller": {
      "name": "Алексей",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000022,
    "name": "Жигули ВАЗ-2101, 1974",
    "price": 240000,
    "img": "img/custom/3000022.jpg",
    "desc": "1.2 л, бензин, механика, 112 000 км, 64 л.с., задний привод",
    "full": "Кремовая копейка в заводском стиле. Родные колпаки и аккуратный интерьер, хороший вариант для спокойных прогулок.",
    "seller": {
      "name": "Алексей",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000023,
    "name": "ВАЗ-21063, 1989",
    "price": 180000,
    "img": "img/custom/3000023.jpg",
    "desc": "1.3 л, бензин, механика, 156 000 км, 64 л.с., задний привод",
    "full": "Бордовая шестёрка с четырьмя круглыми фарами. Чистый салон, свежая зимняя резина, без колхозного тюнинга.",
    "seller": {
      "name": "Алексей",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000024,
    "name": "Mercedes-AMG G 63, 2022",
    "price": 26900000,
    "img": "img/custom/3000024.jpg",
    "desc": "4.0 л, бензин, автомат, 29 000 км, 585 л.с., полный привод",
    "full": "Чёрный G 63 на оригинальных дисках, без нештатного обвеса. Подогревы работают, снег лежит на крыше после короткой поездки по Алдану.",
    "seller": {
      "name": "Семен",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000025,
    "name": "Honda NSX Type S, 2022",
    "price": 55000000,
    "img": "img/custom/3000025.jpg",
    "desc": "3.5 л, гибрид, робот, 7 000 км, 610 л.с., полный привод",
    "full": "Оранжевая NSX Type S — редкий гибридный суперкар. Машина на зимних колёсах, лёгкий снег на кузове; показывается у тёплого бокса.",
    "seller": {
      "name": "Семен",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000026,
    "name": "Mitsubishi Lancer Evolution IX MR, 2006",
    "price": 3900000,
    "img": "img/custom/3000026.jpg",
    "desc": "2.0 л, турбо, механика, 128 000 км, 280 л.с., полный привод",
    "full": "Белый Evo IX MR с оригинальным антикрылом. Умеренный тюнинг подвески, чистый кузов и без броских наклеек.",
    "seller": {
      "name": "Семен",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000027,
    "name": "Audi RS5 Coupe, 2020",
    "price": 12800000,
    "img": "img/custom/3000027.jpg",
    "desc": "2.9 л, бензин, автомат, 48 000 км, 450 л.с., полный привод",
    "full": "Купе B9 в сером Nardo Grey. Оригинальные диски, заводской карбон и зимняя резина; никаких агрессивных доработок.",
    "seller": {
      "name": "Михаил",
      "avatar": "👨‍💼",
      "personality": "neutral"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000028,
    "name": "Audi A8 L, 2019",
    "price": 9900000,
    "img": "img/custom/3000028.jpg",
    "desc": "4.0 л, бензин, автомат, 71 000 км, 460 л.с., полный привод",
    "full": "Тёмно-синяя длинная A8 с комфортными задними креслами. Пневмоподвеска обслужена, салон светлый и ухоженный.",
    "seller": {
      "name": "Максим",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000029,
    "name": "ВАЗ-2109, 2001",
    "price": 85000,
    "img": "img/custom/3000029.jpg",
    "desc": "1.5 л, бензин, механика, 208 000 км, 78 л.с., передний привод",
    "full": "Белая девятка с ровным кузовом и простыми дисками. Требует внимания к двигателю, поэтому цена для первого проекта.",
    "seller": {
      "name": "Павел",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000030,
    "name": "УАЗ Hunter, 2018",
    "price": 1200000,
    "img": "img/custom/3000030.jpg",
    "desc": "2.7 л, бензин, механика, 86 000 км, 135 л.с., полный привод",
    "full": "Оливковый Hunter без огромного лифта. Печка доработана для зимы, раздатка исправна, кузов аккуратный.",
    "seller": {
      "name": "Виктор",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000031,
    "name": "Toyota Land Cruiser 100, 1999",
    "price": 2500000,
    "img": "img/custom/3000031.jpg",
    "desc": "4.7 л, бензин, автомат, 289 000 км, 235 л.с., полный привод",
    "full": "Серебристая сотка с тёплым салоном и штатными колёсами. Рама обслужена, хороший северный внедорожник.",
    "seller": {
      "name": "Ольга",
      "avatar": "👩",
      "personality": "kind"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000032,
    "name": "Toyota Land Cruiser 200, 2016",
    "price": 5700000,
    "img": "img/custom/3000032.jpg",
    "desc": "4.5 л, дизель, автомат, 164 000 км, 249 л.с., полный привод",
    "full": "Чёрный рестайлинговый LC200. Салон и кузов ухожены, второй комплект колёс и зимние подогревы.",
    "seller": {
      "name": "Дмитрий",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000033,
    "name": "Nissan Safari, 1999",
    "price": 1950000,
    "img": "img/custom/3000033.jpg",
    "desc": "4.2 л, дизель, механика, 271 000 км, 160 л.с., полный привод",
    "full": "Серый Safari Y61 на умеренных внедорожных шинах. Без экспедиционного перегруза, надёжная механика.",
    "seller": {
      "name": "Игорь",
      "avatar": "👨",
      "personality": "evil"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000034,
    "name": "Subaru Forester XT, 2014",
    "price": 2400000,
    "img": "img/custom/3000034.jpg",
    "desc": "2.0 л, турбо, вариатор, 138 000 км, 240 л.с., полный привод",
    "full": "Синий турбо-Forester с заводской внешностью. Обслужены трансмиссия и подвеска, салон после химчистки.",
    "seller": {
      "name": "Анна",
      "avatar": "👩‍🦰",
      "personality": "neutral"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000035,
    "name": "Toyota Hilux, 2016",
    "price": 3350000,
    "img": "img/custom/3000035.jpg",
    "desc": "2.8 л, дизель, автомат, 142 000 км, 177 л.с., полный привод",
    "full": "Белый Hilux с аккуратным кунгом в цвет кузова. Пикап без силового обвеса, хороший вариант для северных дорог.",
    "seller": {
      "name": "Сергей",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000036,
    "name": "Mazda CX-5, 2018",
    "price": 2650000,
    "img": "img/custom/3000036.jpg",
    "desc": "2.5 л, бензин, автомат, 93 000 км, 194 л.с., полный привод",
    "full": "Красная Mazda в цвете Soul Red. Родные диски, тёплый салон и полный привод для зимнего Алдана.",
    "seller": {
      "name": "Марина",
      "avatar": "👩‍💼",
      "personality": "kind"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000037,
    "name": "Lexus LX 570, 2016",
    "price": 8800000,
    "img": "img/custom/3000037.jpg",
    "desc": "5.7 л, бензин, автомат, 121 000 км, 367 л.с., полный привод",
    "full": "Чёрный LX после рестайлинга на заводских дисках. Богатая комплектация, гидроподвеска обслужена.",
    "seller": {
      "name": "Роман",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000038,
    "name": "Mitsubishi Pajero Sport, 2016",
    "price": 2750000,
    "img": "img/custom/3000038.jpg",
    "desc": "2.4 л, дизель, автомат, 151 000 км, 181 л.с., полный привод",
    "full": "Серебристый Pajero Sport третьего поколения. Без лишнего обвеса, свежая зимняя резина и аккуратный салон.",
    "seller": {
      "name": "Елена",
      "avatar": "👩",
      "personality": "neutral"
    },
    "cityId": "29a64605-5441-48c5-bc08-117a72ebc843",
    "fictional": true
  },
  {
    "id": 3000039,
    "name": "Porsche 911 GT3, 2022",
    "price": 39900000,
    "img": "img/custom/3000039.jpg",
    "desc": "4.0 л, бензин, робот, 16 000 км, 510 л.с., задний привод",
    "full": "Серебристый 992 GT3 с заводским антикрылом. Керамические тормоза и оригинальные диски, чистая спортивная внешность.",
    "seller": {
      "name": "Александр",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "7dfa745e-aa19-4688-b121-b655c11e482f",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000040,
    "name": "BMW M3 Competition, 2022",
    "price": 11500000,
    "img": "img/custom/3000040.jpg",
    "desc": "3.0 л, бензин, автомат, 34 000 км, 510 л.с., полный привод",
    "full": "Зелёная M3 G80 в цвете Isle of Man Green. Карбоновая крыша, родные колёса и лёгкое занижение без экстремального развала.",
    "seller": {
      "name": "Александр",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "7dfa745e-aa19-4688-b121-b655c11e482f",
    "fictional": true
  },
  {
    "id": 3000041,
    "name": "Alfa Romeo Giulia Quadrifoglio, 2020",
    "price": 6900000,
    "img": "img/custom/3000041.jpg",
    "desc": "2.9 л, бензин, автомат, 52 000 км, 510 л.с., задний привод",
    "full": "Красная Giulia с четырёхлистником на крыле. Всё в заводском стиле, салон и кузов ухожены.",
    "seller": {
      "name": "Александр",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "7dfa745e-aa19-4688-b121-b655c11e482f",
    "fictional": true
  },
  {
    "id": 3000042,
    "name": "Mercedes-Benz CLS 63 AMG, 2008",
    "price": 4300000,
    "img": "img/custom/3000042.jpg",
    "desc": "6.2 л, бензин, автомат, 129 000 км, 514 л.с., задний привод",
    "full": "Тот самый банан W219 в серебристом цвете. Атмосферный V8, заводские AMG-диски, без чужих бамперов и ярких наклеек.",
    "seller": {
      "name": "Александр",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "7dfa745e-aa19-4688-b121-b655c11e482f",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000043,
    "name": "УАЗ-3909 Буханка, 2020",
    "price": 1100000,
    "img": "img/custom/3000043.jpg",
    "desc": "2.7 л, бензин, механика, 54 000 км, 112 л.с., полный привод",
    "full": "Оливковая Буханка с аккуратным багажником на крыше. Печка и шумоизоляция улучшены, без огромных колёс и тяжёлого обвеса.",
    "seller": {
      "name": "Даниил",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000044,
    "name": "Toyota RAV4 Adventure, 2020",
    "price": 4800000,
    "img": "img/custom/3000044.jpg",
    "desc": "2.5 л, бензин, автомат, 68 000 км, 199 л.с., полный привод",
    "full": "Кузов XA50 в комплектации Adventure: цвет хаки, чёрная крыша и красивые заводские диски. Чистый салон и штатная подвеска.",
    "seller": {
      "name": "Даниил",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000045,
    "name": "Toyota Caldina GT-T, 1998",
    "price": 2100000,
    "img": "img/custom/3000045.jpg",
    "desc": "2.0 л, турбо, автомат, 186 000 км, 260 л.с., полный привод",
    "full": "Серебристая ST215W с заводским воздухозаборником на капоте. Аккуратные диски, небольшое занижение и живой 3S-GTE.",
    "seller": {
      "name": "Даниил",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "magdagachi-amur",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000046,
    "name": "Cadillac Escalade-V, 2023",
    "price": 22500000,
    "img": "img/custom/3000046.jpg",
    "desc": "6.2 л, бензин, автомат, 21 000 км, 682 л.с., полный привод",
    "full": "Чёрный Escalade-V с компрессорным V8. Большой ухоженный салон и оригинальные диски, без хромированных накладок из магазина.",
    "seller": {
      "name": "Даниил",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000047,
    "name": "Honda CR-V, 2018",
    "price": 3250000,
    "img": "img/custom/3000047.jpg",
    "desc": "1.5 л, турбо, вариатор, 106 000 км, 190 л.с., полный привод",
    "full": "Красная CR-V пятого поколения. Заводские диски, ровный кузов и свежий комплект зимней резины.",
    "seller": {
      "name": "Даниил",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000048,
    "name": "УАЗ Patriot ДПС, 2021",
    "price": 1450000,
    "img": "img/custom/3000048.jpg",
    "desc": "2.7 л, бензин, механика, 78 000 км, 150 л.с., полный привод",
    "full": "Игровой выставочный Patriot в бело-синей раскраске ДПС. Кузов ухожен, служебная окраска — часть образа машины.",
    "seller": {
      "name": "Даниил",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000049,
    "name": "ВАЗ-2107, 2003",
    "price": 65000,
    "img": "img/custom/3000049.jpg",
    "desc": "1.5 л, бензин, механика, 196 000 км, 72 л.с., задний привод",
    "full": "Белая семёрка с аккуратной внешностью. Требует ремонта сцепления и мелочей по мотору, цена для недорогого проекта.",
    "seller": {
      "name": "Виктор",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000050,
    "name": "Toyota Succeed, 2008",
    "price": 610000,
    "img": "img/custom/3000050.jpg",
    "desc": "1.5 л, бензин, автомат, 234 000 км, 109 л.с., передний привод",
    "full": "Серебристый практичный универсал. Кузов ровный, багажник чистый, без курьерских наклеек.",
    "seller": {
      "name": "Ольга",
      "avatar": "👩",
      "personality": "neutral"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000051,
    "name": "Nissan X-Trail, 2013",
    "price": 1450000,
    "img": "img/custom/3000051.jpg",
    "desc": "2.0 л, бензин, вариатор, 168 000 км, 141 л.с., полный привод",
    "full": "Тёмно-синий X-Trail T31 в хорошем внешнем состоянии. Штатные диски, салон после химчистки.",
    "seller": {
      "name": "Сергей",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000052,
    "name": "Toyota Prius, 2016",
    "price": 1850000,
    "img": "img/custom/3000052.jpg",
    "desc": "1.8 л, гибрид, вариатор, 147 000 км, 122 л.с., передний привод",
    "full": "Белый Prius четвёртого поколения. Батарея проверена, машина без броского тюнинга и наклеек.",
    "seller": {
      "name": "Анна",
      "avatar": "👩‍🦰",
      "personality": "neutral"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000053,
    "name": "Subaru Legacy B4, 2007",
    "price": 1150000,
    "img": "img/custom/3000053.jpg",
    "desc": "2.0 л, турбо, автомат, 183 000 км, 260 л.с., полный привод",
    "full": "Серебристый B4 с заводским воздухозаборником. Небольшая губа и аккуратные диски, без чрезмерного занижения.",
    "seller": {
      "name": "Павел",
      "avatar": "👨",
      "personality": "evil"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000054,
    "name": "Mazda Atenza, 2014",
    "price": 1850000,
    "img": "img/custom/3000054.jpg",
    "desc": "2.5 л, бензин, автомат, 121 000 км, 188 л.с., передний привод",
    "full": "Красная Atenza с ровным кузовом и красивыми заводскими дисками. Спокойная комплектация для дальних поездок.",
    "seller": {
      "name": "Марина",
      "avatar": "👩‍💼",
      "personality": "kind"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000055,
    "name": "Mitsubishi Delica D:5, 2018",
    "price": 3450000,
    "img": "img/custom/3000055.jpg",
    "desc": "2.2 л, дизель, автомат, 109 000 км, 148 л.с., полный привод",
    "full": "Белая Delica с просторным салоном. Штатная подвеска, чистые сиденья, без тяжёлого экспедиционного обвеса.",
    "seller": {
      "name": "Роман",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000056,
    "name": "Suzuki Escudo, 2007",
    "price": 970000,
    "img": "img/custom/3000056.jpg",
    "desc": "2.0 л, бензин, автомат, 193 000 км, 145 л.с., полный привод",
    "full": "Зелёный Escudo третьего поколения. Аккуратный кузов, исправная раздатка, дополнительные колёса в комплекте.",
    "seller": {
      "name": "Елена",
      "avatar": "👩",
      "personality": "neutral"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000057,
    "name": "Toyota Land Cruiser 200, 2018",
    "price": 6900000,
    "img": "img/custom/3000057.jpg",
    "desc": "4.5 л, дизель, автомат, 112 000 км, 249 л.с., полный привод",
    "full": "Чёрный LC200 без нештатного обвеса. Богатая комплектация и аккуратный салон, обслуживание по регламенту.",
    "seller": {
      "name": "Игорь",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000058,
    "name": "Lexus RX 350, 2017",
    "price": 4200000,
    "img": "img/custom/3000058.jpg",
    "desc": "3.5 л, бензин, автомат, 119 000 км, 300 л.с., полный привод",
    "full": "Серебристый Lexus с красивыми родными дисками. Тихий салон, кузов ухожен, все подогревы работают.",
    "seller": {
      "name": "Дмитрий",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "magdagachi-amur",
    "fictional": true
  },
  {
    "id": 3000059,
    "name": "Bugatti Chiron Sport, 2019",
    "price": 350000000,
    "img": "img/custom/3000059.jpg",
    "desc": "8.0 л, бензин, робот, 9 000 км, 1500 л.с., полный привод",
    "full": "Чёрный Chiron Sport с тонкими синими акцентами в стиле гаража Роналду. Вымышленное коллекционное объявление, без утверждения о владении футболистом.",
    "seller": {
      "name": "Шамиль",
      "avatar": "🧔",
      "personality": "neutral"
    },
    "cityId": "2a4a7c93-f3f8-4042-8cbf-e04ab64f5e08",
    "fictional": true,
    "legend": true
  },
  {
    "id": 3000060,
    "name": "ВАЗ-2106, 1998",
    "price": 75000,
    "img": "img/custom/3000060.jpg",
    "desc": "1.6 л, бензин, механика, 212 000 км, 75 л.с., задний привод",
    "full": "Тёмно-зелёная шестёрка с чистым кузовом. Нужен ремонт двигателя, поэтому продаётся недорого под восстановление.",
    "seller": {
      "name": "Руслан",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "2a4a7c93-f3f8-4042-8cbf-e04ab64f5e08",
    "fictional": true
  },
  {
    "id": 3000061,
    "name": "Lada Priora, 2014",
    "price": 590000,
    "img": "img/custom/3000061.jpg",
    "desc": "1.6 л, бензин, механика, 138 000 км, 106 л.с., передний привод",
    "full": "Белая Priora с лёгким занижением и аккуратными дисками. Без наклеек и громкого выхлопа, салон чистый.",
    "seller": {
      "name": "Артём",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "2a4a7c93-f3f8-4042-8cbf-e04ab64f5e08",
    "fictional": true
  },
  {
    "id": 3000062,
    "name": "Lada Niva Legend, 2021",
    "price": 1050000,
    "img": "img/custom/3000062.jpg",
    "desc": "1.7 л, бензин, механика, 49 000 км, 83 л.с., полный привод",
    "full": "Зелёная трёхдверная Нива на штатной высоте. Ухоженный кузов, исправная понижайка, без тяжёлого силового обвеса.",
    "seller": {
      "name": "Ольга",
      "avatar": "👩",
      "personality": "kind"
    },
    "cityId": "2a4a7c93-f3f8-4042-8cbf-e04ab64f5e08",
    "fictional": true
  },
  {
    "id": 3000063,
    "name": "BMW 330i, 2020",
    "price": 3700000,
    "img": "img/custom/3000063.jpg",
    "desc": "2.0 л, бензин, автомат, 72 000 км, 258 л.с., задний привод",
    "full": "Синяя G20 с заводским M Sport. Оригинальные диски и аккуратный салон, без чужих эмблем и огромного спойлера.",
    "seller": {
      "name": "Максим",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "2a4a7c93-f3f8-4042-8cbf-e04ab64f5e08",
    "fictional": true
  },
  {
    "id": 3000064,
    "name": "Mercedes-Benz E 350, 2014",
    "price": 2650000,
    "img": "img/custom/3000064.jpg",
    "desc": "3.5 л, бензин, автомат, 143 000 км, 306 л.с., задний привод",
    "full": "Чёрный рестайлинговый W212. Комфортный салон, ровный кузов и штатная внешность.",
    "seller": {
      "name": "Роман",
      "avatar": "👨",
      "personality": "evil"
    },
    "cityId": "2a4a7c93-f3f8-4042-8cbf-e04ab64f5e08",
    "fictional": true
  },
  {
    "id": 3000065,
    "name": "Audi A6, 2018",
    "price": 3400000,
    "img": "img/custom/3000065.jpg",
    "desc": "2.0 л, бензин, робот, 97 000 км, 252 л.с., полный привод",
    "full": "Серебристая A6 C7 после рестайлинга. Quattro, оригинальные диски и ухоженный светлый салон.",
    "seller": {
      "name": "Анна",
      "avatar": "👩‍🦰",
      "personality": "kind"
    },
    "cityId": "2a4a7c93-f3f8-4042-8cbf-e04ab64f5e08",
    "fictional": true
  },
  {
    "id": 3000066,
    "name": "Lexus GS 350, 2014",
    "price": 3100000,
    "img": "img/custom/3000066.jpg",
    "desc": "3.5 л, бензин, автомат, 152 000 км, 317 л.с., полный привод",
    "full": "Тёмно-синий GS с заводским F Sport. Неброские диски и чистый кузов, без чрезмерного тюнинга.",
    "seller": {
      "name": "Игорь",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "2a4a7c93-f3f8-4042-8cbf-e04ab64f5e08",
    "fictional": true
  },
  {
    "id": 3000067,
    "name": "Toyota Camry, 2019",
    "price": 3100000,
    "img": "img/custom/3000067.jpg",
    "desc": "2.5 л, бензин, автомат, 94 000 км, 181 л.с., передний привод",
    "full": "Белая Camry XV70 на оригинальных дисках. Просторный чистый салон и спокойная заводская внешность.",
    "seller": {
      "name": "Марина",
      "avatar": "👩‍💼",
      "personality": "kind"
    },
    "cityId": "2a4a7c93-f3f8-4042-8cbf-e04ab64f5e08",
    "fictional": true
  },
  {
    "id": 3000068,
    "name": "Porsche Macan S, 2018",
    "price": 5100000,
    "img": "img/custom/3000068.jpg",
    "desc": "3.0 л, бензин, робот, 83 000 км, 340 л.с., полный привод",
    "full": "Серый Macan S на штатных красивых дисках. Без стороннего обвеса, кузов и салон ухожены.",
    "seller": {
      "name": "Павел",
      "avatar": "👨",
      "personality": "neutral"
    },
    "cityId": "2a4a7c93-f3f8-4042-8cbf-e04ab64f5e08",
    "fictional": true
  },
  {
    "id": 3000069,
    "name": "Toyota Land Cruiser Prado, 2020",
    "price": 6500000,
    "img": "img/custom/3000069.jpg",
    "desc": "2.8 л, дизель, автомат, 68 000 км, 200 л.с., полный привод",
    "full": "Чёрный Prado 150 последнего рестайлинга. Богатая комплектация, штатная подвеска и чистый салон.",
    "seller": {
      "name": "Виктор",
      "avatar": "👨",
      "personality": "kind"
    },
    "cityId": "2a4a7c93-f3f8-4042-8cbf-e04ab64f5e08",
    "fictional": true
  }
];
