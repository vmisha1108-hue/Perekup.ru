var CARS = [
  {
    id: 1,
    name: "Лада 2114 Самара, 2006",
    price: 90000,
    img: "",
    desc: "1.6 л, механика, 240 000 км, требуется ремонт, нет 2-й передачи",
    seller: {name: "Дмитрий", avatar: "👨‍🔧", personality: "neutral"}
  },
  {
    id: 2,
    name: "Opel Vectra, 2003",
    price: 281000,
    img: "",
    desc: "2.2 л дизель, механика, 465 517 км, свежее ТО, новая МКПП",
    seller: {name: "Сергей Педик", avatar: "🧔", personality: "kind"}
  },
  {
    id: 3,
    name: "Opel Vectra, 2003",
    price: 300000,
    img: "",
    desc: "3.2 л бензин, АКПП, 323 958 км, 211 л.с., на ходу",
    seller: {name: "Максим", avatar: "🧑‍🦱", personality: "neutral"}
  },
  {
    id: 4,
    name: "ГАЗ-31105 Волга, 2004",
    price: 950000,
    img: "",
    desc: "2.4 л карбюратор, 3 487 км, капсула времени, один владелец",
    seller: {name: "Ольга", avatar: "👩", personality: "kind"}
  },
  {
    id: 5,
    name: "Mitsubishi Colt, 2005",
    price: 385000,
    img: "",
    desc: "1.3 л, механика, 226 740 км, бензин, передний привод",
    seller: {name: "Игорь", avatar: "👨", personality: "evil"}
  },
  {
    id: 6,
    name: "Kia Stinger, 2018",
    price: 1900000,
    img: "",
    desc: "2.0 л бензин, АКПП, 170 000 км, 247 л.с., 4WD",
    seller: {name: "Марина", avatar: "👩‍💼", personality: "neutral"}
  },
  {
    id: 7,
    name: "Kia Stinger, 2022",
    price: 3600000,
    img: "",
    desc: "2.0 л бензин, АКПП, 40 806 км, 247 л.с., AWD",
    seller: {name: "Артём", avatar: "🧔", personality: "kind"}
  },
  {
    id: 8,
    name: "Mercedes-Benz E-Класс, 2014",
    price: 1635000,
    img: "",
    desc: "E200, 2.0 л, 153 961 км, 184 л.с., задний привод",
    seller: {name: "Анна", avatar: "👩‍🦰", personality: "neutral"}
  },
  {
    id: 9,
    name: "Mercedes-Benz E-Класс, 2015",
    price: 2234000,
    img: "",
    desc: "2.0 л, 77 470 км, 211 л.с., задний привод, АКПП",
    seller: {name: "Виктор", avatar: "👨‍💼", personality: "evil"}
  },
  {
    id: 10,
    name: "Mercedes-Benz E-Класс, 2020",
    price: 4699000,
    img: "",
    desc: "2.0 л, 102 049 км, 197 л.с., полный привод, купе",
    seller: {name: "Павел", avatar: "👨‍🔧", personality: "kind"}
  },
  {
    id: 11,
    name: "Mercedes-Benz E-Класс, 2026",
    price: 9700000,
    img: "",
    desc: "2.0 л гибрид, АКПП, 258 л.с., 4WD, новый автомобиль",
    seller: {name: "Гоша", avatar: "🧑‍🎤", personality: "evil"}
  },
  {
    id: 12,
    name: "BMW X7, 2026",
    price: 18990000,
    img: "",
    desc: "3.0 л дизель гибрид, АКПП, 352 л.с., 4WD, новый",
    seller: {name: "Ринат", avatar: "🧔", personality: "neutral"}
  },
  {
    id: 19,
    name: "Daewoo Nexia, 2010",
    price: 180000,
    img: "",
    desc: "1.5 л, механика, 180 000 км, простой и дешёвый в обслуживании",
    seller: {name: "Алексей", avatar: "🧔", personality: "kind"}
  },
  {
    id: 20,
    name: "Lada Priora, 2012",
    price: 250000,
    img: "",
    desc: "1.6 л, механика, 150 000 км, один владелец, без вложений",
    seller: {name: "Наталья", avatar: "👩", personality: "neutral"}
  },
  {
    id: 21,
    name: "Lada Granta, 2018",
    price: 550000,
    img: "",
    desc: "1.6 л, механика, 90 000 км, свежая, ездил дедушка",
    seller: {name: "Кирилл", avatar: "👨‍💼", personality: "evil"}
  },
  {
    id: 22,
    name: "Volkswagen Polo, 2015",
    price: 650000,
    img: "",
    desc: "1.6 л, автомат, 130 000 км, седан, не такси",
    seller: {name: "Елена", avatar: "👩‍🦰", personality: "kind"}
  },
  {
    id: 23,
    name: "Renault Duster, 2015",
    price: 700000,
    img: "",
    desc: "1.6 л, механика, 140 000 км, полный привод, кроссовер",
    seller: {name: "Роман", avatar: "🧑‍🦱", personality: "evil"}
  },
  {
    id: 24,
    name: "Kia Sportage, 2013",
    price: 850000,
    img: "",
    desc: "2.0 л, автомат, 170 000 км, кроссовер, 4WD",
    seller: {name: "Юлия", avatar: "👩‍💼", personality: "neutral"}
  },
  {
    id: 25,
    name: "BMW 5 Series, 2008",
    price: 900000,
    img: "",
    desc: "2.5 л, автомат, 220 000 км, E60, требует внимания",
    seller: {name: "Станислав", avatar: "👨‍🔧", personality: "evil"}
  },
  {
    id: 26,
    name: "Hyundai Creta, 2017",
    price: 950000,
    img: "",
    desc: "1.6 л, автомат, 110 000 км, кроссовер, один владелец",
    seller: {name: "Татьяна", avatar: "👩", personality: "kind"}
  },
  {
    id: 27,
    name: "Audi A6, 2010",
    price: 1000000,
    img: "",
    desc: "2.8 л, вариатор, 200 000 км, C6, quattro, кожа",
    seller: {name: "Михаил", avatar: "👨", personality: "neutral"}
  },
  {
    id: 28,
    name: "Mazda CX-5, 2014",
    price: 1300000,
    img: "",
    desc: "2.0 л, автомат, 130 000 км, 4WD, японец, надёжный",
    seller: {name: "Дарья", avatar: "👩‍🦱", personality: "kind"}
  },
  {
    id: 29,
    name: "Toyota RAV4, 2013",
    price: 1400000,
    img: "",
    desc: "2.0 л, вариатор, 145 000 км, кроссовер, без вложений",
    seller: {name: "Андрей", avatar: "🧔‍♂️", personality: "neutral"}
  },
  {
    id: 30,
    name: "Haval Jolion, 2021",
    price: 1700000,
    img: "",
    desc: "1.5 л турбо, робот, 50 000 км, китаец, гарантия",
    seller: {name: "Кристина", avatar: "👩‍💼", personality: "evil"}
  },
  {
    id: 31,
    name: "BMW X5, 2012",
    price: 2300000,
    img: "",
    desc: "3.0 л дизель, автомат, 180 000 км, E70, полный",
    seller: {name: "Владимир", avatar: "👴", personality: "kind"}
  },
  {
    id: 32,
    name: "Porsche Cayenne, 2011",
    price: 2500000,
    img: "",
    desc: "3.6 л, автомат, 170 000 км, премиум, обслужен",
    seller: {name: "Нина", avatar: "👵", personality: "neutral"}
  },
  {
    id: 33,
    name: "Toyota Land Cruiser, 2010",
    price: 2800000,
    img: "",
    desc: "4.5 л дизель, автомат, 250 000 км, рамный, 4WD",
    seller: {name: "Тимур", avatar: "🧔", personality: "evil"}
  },
  {id: 34, name: "Ford Focus II, 2009", price: 500000, img: "", desc: "1.6 л, механика, 181 450 км, седан, 2 владельца", seller: {name: "Андрей", avatar: "🧔", personality: "neutral"}},
  {id: 35, name: "Daewoo Matiz, 2010", price: 49000, img: "", desc: "0.8 л, механика, 100 000 км, для доставки, на ходу", seller: {name: "Игорь", avatar: "👨", personality: "evil"}},
  {id: 36, name: "Daewoo Matiz, 2015", price: 500000, img: "", desc: "0.8 л, автомат, 30 270 км, летняя эксплуатация, гараж", seller: {name: "Ольга", avatar: "👩", personality: "kind"}},
  {id: 37, name: "Opel Astra H, 2008", price: 410000, img: "", desc: "1.6 л, автомат, 235 808 км, хэтчбек, 4 владельца", seller: {name: "Максим", avatar: "🧑‍🦱", personality: "neutral"}},
  {id: 38, name: "Nissan Tiida, 2011", price: 450000, img: "", desc: "1.6 л, автомат, 254 000 км, рестайлинг, максимальная", seller: {name: "Марина", avatar: "👩‍💼", personality: "kind"}},
  {id: 39, name: "Nissan Note, 2013", price: 290000, img: "", desc: "1.4 л, механика, 149 800 км, рестайлинг, семейный", seller: {name: "Дмитрий", avatar: "👨‍🔧", personality: "neutral"}},
  {id: 40, name: "BYD F3, 2012", price: 245000, img: "", desc: "1.5 л, механика, 71 300 км, кожа, люк, 1 владелец", seller: {name: "Анна", avatar: "👩‍🦰", personality: "kind"}},
  {id: 41, name: "Ford Focus II, 2008", price: 450000, img: "", desc: "1.8 л, механика, 251 109 км, хэтчбек, 3 владельца", seller: {name: "Виктор", avatar: "👨‍💼", personality: "evil"}},
  {id: 42, name: "Lada Granta, 2017", price: 390000, img: "", desc: "1.6 л, механика, 170 979 км, лифтбек, свежая", seller: {name: "Павел", avatar: "👨‍🔧", personality: "neutral"}},
  {id: 43, name: "Lada Priora, 2014", price: 337000, img: "", desc: "1.6 л, механика, 180 000 км, седан, без вложений", seller: {name: "Сергей", avatar: "🧔", personality: "neutral"}},
  {id: 44, name: "Geely GC6, 2015", price: 285000, img: "", desc: "1.5 л, механика, 138 000 км, седан, китаец", seller: {name: "Ринат", avatar: "🧔", personality: "evil"}},
  {id: 45, name: "Hyundai Solaris, 2011", price: 310000, img: "", desc: "1.4 л, механика, 288 047 км, седан, такси", seller: {name: "Люба", avatar: "👵", personality: "kind"}},
  {id: 46, name: "Renault Logan, 2008", price: 179000, img: "", desc: "1.4 л, механика, 240 000 км, седан, неприхотливый", seller: {name: "Гоша", avatar: "🧑‍🎤", personality: "evil"}},
  {id: 47, name: "Chevrolet Cruze, 2012", price: 370000, img: "", desc: "1.6 л, механика, 384 000 км, седан, чёрный", seller: {name: "Кирилл", avatar: "👨‍💼", personality: "neutral"}},
  {id: 48, name: "Chevrolet Aveo, 2014", price: 499000, img: "", desc: "1.6 л, механика, без пробега, седан, от дилера", seller: {name: "Елена", avatar: "👩‍🦰", personality: "kind"}},
  {
    id: 91,
    name: "Toyota Corolla, 1997",
    price: 230000,
    img: "img/91.jpg",
    desc: "1.6 л, автомат, 370 000 км, универсал, 115 л.с., правый руль",
    seller: {name: "Алексей", avatar: "🧔", personality: "neutral"}
  },
  {
    id: 92,
    name: "Toyota Corolla, 2000",
    price: 185000,
    img: "img/92.jpg",
    desc: "1.3 л, механика, 380 000 км, хэтчбек, 86 л.с.",
    seller: {name: "Наталья", avatar: "👩", personality: "evil"}
  },
  {
    id: 93,
    name: "Toyota Corolla, 2003",
    price: 210000,
    img: "img/93.jpg",
    desc: "1.6 л, механика, 243 000 км, седан, 110 л.с.",
    seller: {name: "Кирилл", avatar: "👨‍💼", personality: "neutral"}
  },
  {
    id: 94,
    name: "Toyota Corolla, 2005",
    price: 290000,
    img: "img/94.jpg",
    desc: "1.4 л, механика, 268 257 км, седан",
    seller: {name: "Елена", avatar: "👩‍🦰", personality: "kind"}
  },
  {
    id: 95,
    name: "Toyota Corolla, 2006",
    price: 400000,
    img: "img/95.jpg",
    desc: "1.6 л, автомат, 132 000 км, седан",
    seller: {name: "Роман", avatar: "🧑‍🦱", personality: "neutral"}
  },
  {
    id: 96,
    name: "Toyota Corolla, 2007",
    price: 420000,
    img: "img/96.jpg",
    desc: "1.6 л, автомат, 162 783 км, седан, 124 л.с.",
    seller: {name: "Юлия", avatar: "👩‍💼", personality: "neutral"}
  },
  {
    id: 97,
    name: "Toyota Corolla, 2008",
    price: 440000,
    img: "img/97.jpg",
    desc: "1.6 л, автомат, 107 000 км, седан, 124 л.с.",
    seller: {name: "Станислав", avatar: "👨‍🔧", personality: "kind"}
  },
  {
    id: 98,
    name: "Toyota Corolla, 2009",
    price: 410000,
    img: "img/98.jpg",
    desc: "1.6 л, механика, 82 000 км, седан, 124 л.с.",
    seller: {name: "Татьяна", avatar: "👩", personality: "neutral"}
  },
  {
    id: 99,
    name: "Toyota Camry, 2002",
    price: 490000,
    img: "img/99.jpg",
    desc: "2.4 л, автомат, 480 000 км, седан, 159 л.с.",
    seller: {name: "Андрей", avatar: "🧔‍♂️", personality: "evil"}
  },
  {
    id: 100,
    name: "Toyota Camry, 2005",
    price: 500000,
    img: "img/100.jpg",
    desc: "2.4 л, автомат, 325 387 км, седан, 152 л.с.",
    seller: {name: "Михаил", avatar: "👨", personality: "neutral"}
  },
  {
    id: 101,
    name: "Toyota Avensis, 2001",
    price: 320000,
    img: "img/101.jpg",
    desc: "2.0 л, механика, 306 647 км, седан, 128 л.с.",
    seller: {name: "Дарья", avatar: "👩‍🦱", personality: "kind"}
  },
  {
    id: 102,
    name: "Toyota Avensis, 2002",
    price: 350000,
    img: "img/102.jpg",
    desc: "1.6 л, механика, 318 648 км, седан, 110 л.с.",
    seller: {name: "Кристина", avatar: "👩‍💼", personality: "neutral"}
  },
  {
    id: 103,
    name: "Toyota Avensis, 2008",
    price: 500000,
    img: "img/103.jpg",
    desc: "1.8 л, автомат, 290 000 км, седан, 129 л.с.",
    seller: {name: "Владимир", avatar: "👴", personality: "neutral"}
  },
  {
    id: 104,
    name: "Toyota RAV4, 2004",
    price: 400000,
    img: "img/104.jpg",
    desc: "2.0 л, автомат, 162 000 км, внедорожник, 135 л.с.",
    seller: {name: "Нина", avatar: "👵", personality: "kind"}
  },
  {
    id: 105,
    name: "Toyota RAV4, 2005",
    price: 500000,
    img: "img/105.jpg",
    desc: "2.0 л, автомат, 285 000 км, внедорожник, 150 л.с.",
    seller: {name: "Тимур", avatar: "🧔", personality: "evil"}
  },
  {
    id: 106,
    name: "Toyota Yaris, 2010",
    price: 350000,
    img: "img/106.jpg",
    desc: "1.3 л, автомат, 238 000 км, хэтчбек, 87 л.с.",
    seller: {name: "Марина", avatar: "👩", personality: "neutral"}
  },
  {
    "id": 107,
    "name": "Lada (ВАЗ) 2106 4-speed, 1990",
    "price": 35000,
    "img": "img/107.jpg",
    "desc": "Москва, 1.6 л, 75 л.с., бензин, механика, 210 000 км, нужен ремонт генератора и днища",
    "seller": {
      "name": "Александр",
      "avatar": "👨",
      "personality": "kind"
    }
  },
  {
    "id": 108,
    "name": "Daewoo Matiz I Рестайлинг, 2004",
    "price": 40000,
    "img": "img/108.jpg",
    "desc": "Москва, 0.8 л, 52 л.с., бензин, механика, 250 000 км, нет корпуса фильтра",
    "seller": {
      "name": "Валентина",
      "avatar": "👩",
      "personality": "neutral"
    }
  },
  {
    "id": 109,
    "name": "Ford Mondeo II, 1997",
    "price": 40000,
    "img": "img/109.jpg",
    "desc": "Москва, 1.8 л, 115 л.с., бензин, механика, 200 000 км, нужно варить кузов и крепление балки",
    "seller": {
      "name": "Борис",
      "avatar": "🧔",
      "personality": "evil"
    }
  },
  {
    "id": 110,
    "name": "Nissan Expert, 1999",
    "price": 75000,
    "img": "img/110.jpg",
    "desc": "Москва, 1.8 л, 125 л.с., бензин, автомат, 397 000 км, требует внимания",
    "seller": {
      "name": "Светлана",
      "avatar": "👩‍💼",
      "personality": "neutral"
    }
  },
  {
    "id": 111,
    "name": "Chevrolet Lanos I, 2006",
    "price": 40000,
    "img": "img/111.jpg",
    "desc": "Москва, 1.5 л, 86 л.с., бензин, механика, 256 000 км, на ходу, нужен ремонт",
    "seller": {
      "name": "Николай",
      "avatar": "👨‍🔧",
      "personality": "kind"
    }
  },
  {
    "id": 112,
    "name": "Volkswagen Passat B4, 1996",
    "price": 75000,
    "img": "img/112.jpg",
    "desc": "Москва, 1.6 л, 101 л.с., бензин, механика, 400 000 км, белорусские транзиты",
    "seller": {
      "name": "Вероника",
      "avatar": "👩‍🦰",
      "personality": "neutral"
    }
  },
  {
    "id": 113,
    "name": "Toyota Camry V30, 1993",
    "price": 87000,
    "img": "img/113.jpg",
    "desc": "Москва, 2.0 л, 140 л.с., бензин, автомат, 280 000 км, АКПП пинается при включении R",
    "seller": {
      "name": "Евгений",
      "avatar": "👨‍💼",
      "personality": "neutral"
    }
  },
  {
    "id": 114,
    "name": "ГАЗ 31029 Волга, 1997",
    "price": 49490,
    "img": "img/114.jpg",
    "desc": "Москва, 2.5 л, 90 л.с., бензин, механика, 70 000 км, на ходу, требует внимания",
    "seller": {
      "name": "Лидия",
      "avatar": "👵",
      "personality": "evil"
    }
  },
  {
    "id": 115,
    "name": "Opel Vectra B, 1998",
    "price": 95000,
    "img": "img/115.jpg",
    "desc": "Москва, 1.8 л, 116 л.с., бензин, автомат, 364 738 км, нет задней передачи",
    "seller": {
      "name": "Денис",
      "avatar": "🧑‍🦱",
      "personality": "kind"
    }
  },
  {
    "id": 116,
    "name": "Mitsubishi Lancer VI, 1998",
    "price": 100000,
    "img": "img/116.jpg",
    "desc": "Москва, 1.6 л, 113 л.с., бензин, механика, 264 368 км",
    "seller": {
      "name": "Василий",
      "avatar": "👴",
      "personality": "neutral"
    }
  },
  {
    "id": 117,
    "name": "Ford Focus III, 2012",
    "price": 649000,
    "img": "img/117.jpg",
    "desc": "Москва, 1.6 л, 125 л.с., бензин, робот, 130 600 км",
    "seller": {
      "name": "Олег",
      "avatar": "👨",
      "personality": "kind"
    }
  },
  {
    "id": 118,
    "name": "Renault Logan II, 2015",
    "price": 675000,
    "img": "img/118.jpg",
    "desc": "Москва, 1.6 л, 82 л.с., бензин, робот, 97 352 км",
    "seller": {
      "name": "Виктория",
      "avatar": "👩",
      "personality": "neutral"
    }
  },
  {
    "id": 119,
    "name": "Hyundai Santa Fe Classic, 2008",
    "price": 547800,
    "img": "img/119.jpg",
    "desc": "Москва, 2.0 л, 112 л.с., дизель, автомат, 146 131 км",
    "seller": {
      "name": "Арсений",
      "avatar": "🧔",
      "personality": "evil"
    }
  },
  {
    "id": 120,
    "name": "Kia Sportage II, 2007",
    "price": 680000,
    "img": "img/120.jpg",
    "desc": "Москва, 2.7 л, 175 л.с., бензин, автомат, 392 000 км",
    "seller": {
      "name": "Галина",
      "avatar": "👩‍💼",
      "personality": "neutral"
    }
  },
  {
    "id": 121,
    "name": "Volkswagen Jetta V, 2010",
    "price": 580000,
    "img": "img/121.jpg",
    "desc": "Москва, 1.6 л, 102 л.с., бензин, автомат, 267 543 км",
    "seller": {
      "name": "Константин",
      "avatar": "👨‍🔧",
      "personality": "kind"
    }
  },
  {
    "id": 122,
    "name": "Skoda Rapid I, 2014",
    "price": 532475,
    "img": "img/122.jpg",
    "desc": "Москва, 1.6 л, 105 л.с., бензин, механика, 104 192 км",
    "seller": {
      "name": "Полина",
      "avatar": "👩‍🦰",
      "personality": "neutral"
    }
  },
  {
    "id": 123,
    "name": "Nissan Qashqai I, 2007",
    "price": 520000,
    "img": "img/123.jpg",
    "desc": "Москва, 2.0 л, 141 л.с., бензин, механика, 232 000 км",
    "seller": {
      "name": "Леонид",
      "avatar": "👨‍💼",
      "personality": "neutral"
    }
  },
  {
    "id": 124,
    "name": "Toyota Corolla X (E140, E150), 2008",
    "price": 575000,
    "img": "img/124.jpg",
    "desc": "Москва, 1.6 л, 124 л.с., бензин, механика, 250 932 км",
    "seller": {
      "name": "Вера",
      "avatar": "👵",
      "personality": "evil"
    }
  },
  {
    "id": 125,
    "name": "Chevrolet Captiva I, 2008",
    "price": 540000,
    "img": "img/125.jpg",
    "desc": "Москва, 3.2 л, 230 л.с., бензин, автомат, 219 172 км",
    "seller": {
      "name": "Григорий",
      "avatar": "🧑‍🦱",
      "personality": "kind"
    }
  },
  {
    "id": 126,
    "name": "Honda N-BOX II Рестайлинг, 2021",
    "price": 700000,
    "img": "img/126.jpg",
    "desc": "Москва, 0.7 л, 58 л.с., бензин, вариатор, 38 500 км",
    "seller": {
      "name": "Алёна",
      "avatar": "👴",
      "personality": "neutral"
    }
  },
  {
    "id": 127,
    "name": "Audi A3 II (8P) Рестайлинг 2, 2011",
    "price": 597700,
    "img": "img/127.jpg",
    "desc": "Москва, 1.4 л, 125 л.с., бензин, робот, 273 296 км",
    "seller": {
      "name": "Фёдор",
      "avatar": "👨",
      "personality": "kind"
    }
  },
  {
    "id": 128,
    "name": "Mercedes-Benz B-Класс 200 I (W245), 2008",
    "price": 515000,
    "img": "img/128.jpg",
    "desc": "Москва, 2.0 л, 136 л.с., бензин, вариатор, 267 000 км",
    "seller": {
      "name": "Людмила",
      "avatar": "👩",
      "personality": "neutral"
    }
  },
  {
    "id": 129,
    "name": "Volvo XC70 I Рестайлинг, 2005",
    "price": 680000,
    "img": "img/129.jpg",
    "desc": "Москва, 2.5 л, 210 л.с., бензин, автомат, 221 096 км",
    "seller": {
      "name": "Ярослав",
      "avatar": "🧔",
      "personality": "evil"
    }
  },
  {
    "id": 130,
    "name": "Mazda 3 II (BL), 2010",
    "price": 600000,
    "img": "img/130.jpg",
    "desc": "Москва, 1.6 л, 105 л.с., бензин, автомат, 116 000 км",
    "seller": {
      "name": "София",
      "avatar": "👩‍💼",
      "personality": "neutral"
    }
  },
  {
    "id": 131,
    "name": "Mitsubishi Outlander I, 2007",
    "price": 535000,
    "img": "img/131.jpg",
    "desc": "Москва, 2.0 л, 136 л.с., бензин, механика, 228 000 км",
    "seller": {
      "name": "Вадим",
      "avatar": "👨‍🔧",
      "personality": "kind"
    }
  },
  {
    "id": 132,
    "name": "Suzuki Grand Vitara II, 2005",
    "price": 560000,
    "img": "img/132.jpg",
    "desc": "Москва, 2.0 л, 140 л.с., бензин, механика, 255 000 км",
    "seller": {
      "name": "Любовь",
      "avatar": "👩‍🦰",
      "personality": "neutral"
    }
  },
  {
    "id": 133,
    "name": "Peugeot Partner II Рестайлинг, 2013",
    "price": 909150,
    "img": "img/133.jpg",
    "desc": "Москва, 1.6 л, 120 л.с., бензин, механика, 107 637 км",
    "seller": {
      "name": "Семён",
      "avatar": "👨‍💼",
      "personality": "neutral"
    }
  },
  {
    "id": 134,
    "name": "Opel Antara I Рестайлинг, 2012",
    "price": 660000,
    "img": "img/134.jpg",
    "desc": "Москва, 2.4 л, 167 л.с., бензин, автомат, 321 670 км",
    "seller": {
      "name": "Ирина",
      "avatar": "👵",
      "personality": "evil"
    }
  },
  {
    "id": 135,
    "name": "Citroen C-Crosser, 2011",
    "price": 799000,
    "img": "img/135.jpg",
    "desc": "Москва, 2.0 л, 147 л.с., бензин, вариатор, 169 000 км",
    "seller": {
      "name": "Анатолий",
      "avatar": "🧑‍🦱",
      "personality": "kind"
    }
  },
  {
    "id": 136,
    "name": "Land Rover Range Rover Supercharged III Рестайлинг, 2005",
    "price": 600000,
    "img": "img/136.jpg",
    "desc": "Москва, 4.2 л, 396 л.с., бензин, автомат, 483 402 км",
    "seller": {
      "name": "Таисия",
      "avatar": "👴",
      "personality": "neutral"
    }
  },
  {
    "id": 137,
    "name": "Ravon R4, 2017",
    "price": 740000,
    "img": "img/137.jpg",
    "desc": "Москва, 1.5 л, 106 л.с., бензин, автомат, 93 327 км",
    "seller": {
      "name": "Руслан",
      "avatar": "👨",
      "personality": "kind"
    }
  },
  {
    "id": 138,
    "name": "Geely Emgrand X7 I Рестайлинг 2, 2019",
    "price": 979900,
    "img": "img/138.jpg",
    "desc": "Москва, 2.0 л, 139 л.с., бензин, автомат, 169 616 км",
    "seller": {
      "name": "Надежда",
      "avatar": "👩",
      "personality": "neutral"
    }
  },
  {
    "id": 139,
    "name": "Lada (ВАЗ) Largus I, 2018",
    "price": 560000,
    "img": "img/139.jpg",
    "desc": "Москва, 1.6 л, 87 л.с., бензин, механика, 136 500 км",
    "seller": {
      "name": "Аркадий",
      "avatar": "🧔",
      "personality": "evil"
    }
  },
  {
    "id": 140,
    "name": "УАЗ Патриот I Рестайлинг, 2012",
    "price": 575000,
    "img": "img/140.jpg",
    "desc": "Москва, 2.7 л, 128 л.с., бензин, механика, 99 827 км",
    "seller": {
      "name": "Лариса",
      "avatar": "👩‍💼",
      "personality": "neutral"
    }
  },
  {
    "id": 141,
    "name": "Zotye T600, 2018",
    "price": 740000,
    "img": "img/141.jpg",
    "desc": "Москва, 1.5 л, 149 л.с., бензин, механика, 132 307 км",
    "seller": {
      "name": "Глеб",
      "avatar": "👨‍🔧",
      "personality": "kind"
    }
  },
  {
    "id": 142,
    "name": "Changan CS35, 2018",
    "price": 726000,
    "img": "img/142.jpg",
    "desc": "Москва, 1.6 л, 113 л.с., бензин, автомат, 104 057 км",
    "seller": {
      "name": "Зоя",
      "avatar": "👩‍🦰",
      "personality": "neutral"
    }
  },
  {
    "id": 143,
    "name": "SsangYong Actyon Sports II, 2012",
    "price": 909000,
    "img": "img/143.jpg",
    "desc": "Москва, 2.0 л, 149 л.с., дизель, автомат, 198 468 км",
    "seller": {
      "name": "Виталий",
      "avatar": "👨‍💼",
      "personality": "neutral"
    }
  },
  {
    "id": 144,
    "name": "Ford Focus III, 2014",
    "price": 790000,
    "img": "img/144.jpg",
    "desc": "Москва, 1.6 л, 125 л.с., бензин, механика, 210 356 км",
    "seller": {
      "name": "Екатерина",
      "avatar": "👵",
      "personality": "evil"
    }
  },
  {
    "id": 145,
    "name": "Renault Duster I Рестайлинг, 2016",
    "price": 955150,
    "img": "img/145.jpg",
    "desc": "Москва, 2.0 л, 143 л.с., бензин, автомат, 123 184 км",
    "seller": {
      "name": "Артём",
      "avatar": "🧑‍🦱",
      "personality": "kind"
    }
  },
  {
    "id": 146,
    "name": "Hyundai Solaris I, 2012",
    "price": 575150,
    "img": "img/146.jpg",
    "desc": "Москва, 1.4 л, 107 л.с., бензин, автомат, 165 501 км",
    "seller": {
      "name": "Оксана",
      "avatar": "👴",
      "personality": "neutral"
    }
  },
  {
    "id": 147,
    "name": "Toyota Chaser Tourer V, 1997",
    "price": 1500000,
    "img": "img/147.jpg",
    "desc": "2.5 л, автомат, 210 000 км, 1JZ-GTE; турбина жива, резина грустит",
    "seller": {
      "name": "Макс",
      "avatar": "🧑‍🎤",
      "personality": "neutral"
    }
  },
  {
    "id": 148,
    "name": "Toyota Supra RZ, 1996",
    "price": 6200000,
    "img": "img/148.jpg",
    "desc": "3.0 л, механика, 128 000 км, 2JZ-GTE; мечта из ночных гонок",
    "seller": {
      "name": "Стас",
      "avatar": "👨‍🔧",
      "personality": "evil"
    }
  },
  {
    "id": 149,
    "name": "Nissan Skyline GT-R V-Spec R34, 1999",
    "price": 13500000,
    "img": "img/149.jpg",
    "desc": "2.6 л, механика, 86 000 км, RB26, полный привод; гаражная легенда",
    "seller": {
      "name": "Ринат",
      "avatar": "🧔",
      "personality": "neutral"
    }
  },
  {
    "id": 150,
    "name": "Mazda RX-7 FD, 1994",
    "price": 4700000,
    "img": "img/150.jpg",
    "desc": "1.3 л, механика, 112 000 км, роторный мотор; масло любит, внимание тоже",
    "seller": {
      "name": "Артур",
      "avatar": "🧑‍🦱",
      "personality": "kind"
    }
  },
  {
    "id": 151,
    "name": "Nissan Silvia Varietta S15, 2000",
    "price": 2900000,
    "img": "img/151.jpg",
    "desc": "2.0 л, автомат, 154 000 км, редкий кабриолет; крыша работает, лето ждёт",
    "seller": {
      "name": "Алиса",
      "avatar": "👩‍🦰",
      "personality": "kind"
    }
  },
  {
    "id": 152,
    "name": "Mitsubishi Lancer Evolution VI, 1999",
    "price": 3400000,
    "img": "img/152.jpg",
    "desc": "2.0 л турбо, механика, 173 000 км, 4WD; раллийное прошлое под вопросом",
    "seller": {
      "name": "Рустам",
      "avatar": "👨‍🔧",
      "personality": "evil"
    }
  },
  {
    "id": 153,
    "name": "BMW M3 E30, 1990",
    "price": 5500000,
    "img": "img/153.jpg",
    "desc": "2.3 л, механика, 198 000 км, S14; расширенные арки и характер из девяностых",
    "seller": {
      "name": "Герман",
      "avatar": "👨‍💼",
      "personality": "neutral"
    }
  },
  {
    "id": 154,
    "name": "Ferrari F40, 1990",
    "price": 85000000,
    "img": "img/154.jpg",
    "desc": "2.9 л битурбо V8, механика, 24 000 км; коллекционная редкость без лишнего комфорта",
    "seller": {
      "name": "Эдуард",
      "avatar": "👨‍💼",
      "personality": "neutral"
    }
  },
  {
    "id": 155,
    "name": "Lamborghini Diablo, 1992",
    "price": 28500000,
    "img": "img/155.jpg",
    "desc": "5.7 л V12, механика, 48 000 км; двери вверх, расходы тоже",
    "seller": {
      "name": "Леонид",
      "avatar": "🧔",
      "personality": "kind"
    }
  },
  {
    "id": 156,
    "name": "Porsche Cayenne GTS без фары, 2008",
    "price": 850000,
    "img": "img/156.png",
    "desc": "4.8 л V8, автомат, 286 000 км; одной фары нет, понты в комплекте",
    "seller": {
      "name": "Денис",
      "avatar": "🧔",
      "personality": "evil"
    }
  }
];
