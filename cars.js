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
  }
];
