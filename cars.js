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
  }
];
