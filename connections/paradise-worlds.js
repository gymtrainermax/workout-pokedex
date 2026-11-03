// Tamagotchi Paradise world / field taxonomy
// Official collection categories: Land, Water, Sky, Forest, Tropical, Ice, Cosmic Planet, Tamagotchi Planet.
(() => {
  const data = window.CONNECTIONS_SITE_DATA;
  if (!data) return;

  data.paradiseWorlds = [
    {
      id:"land", name:"Land", label:"LAND", type:"Tama Field", symbol:"LAND",
      description:"Ground-dwelling, plant, mammal, reptile and other terrestrial Tamagotchi from the original Paradise field set.",
      officialUrl:"https://tamagotchi-official.com/us/series/paradise/character/?c=land",
      characterNames:["Pochitchi","Gumax","Ratchi","Mametchi","Mimitchi","Molmotchi","Sheeptchi","Leopatchi","Sebiretchi","Elizardotchi","Heavytchi","Furawatchi","Potsunentchi","Tustustchi","Shigemi-san","Chodracotchi","Shyontchi","Carbuclutchi","T-retchi"]
    },
    {
      id:"water", name:"Water", label:"WATER", type:"Tama Field", symbol:"WATER",
      description:"Aquatic and amphibious Tamagotchi spanning dolphins, turtles, amphibians, fish, marine invertebrates and ancient sea life.",
      officialUrl:"https://tamagotchi-official.com/us/series/paradise/character/?c=water",
      characterNames:["Irukatchi","Kametchi","Kujiratchi","Uruotchi","Axolopatchi","Imoritchi","Kawazutchi","Beavertchi","Tachutchi","Sharktchi","Ankotchi","Otototchi","Kuraratchi","Mendakotchi","Amefuratchi","Gusokutchi","Mermarintchi","Platyputchi","Plesiotchi","Ammonotchi"]
    },
    {
      id:"sky", name:"Sky", label:"SKY", type:"Tama Field", symbol:"SKY",
      description:"Flying creatures, birds, insects, minerals and mythic airborne forms from Paradise's original Sky field.",
      officialUrl:"https://tamagotchi-official.com/us/series/paradise/character/?c=sky",
      characterNames:["Horhotchi","Mongatchi","Eagletchi","Batchi","Papillotchi","Kabutotchi","Tentotchi","Hatchitchi","Peacotchi","Batatchi","Kuchipatchi","Kiwitchi","Gemtchi","Oretatchi","Ishikorotchi","Magmatchi","Yayacorntchi","Phoenitchi","Griffintchi","Ptetchi"]
    },
    {
      id:"forest", name:"Forest", label:"FOREST", type:"Tama Field", symbol:"FOREST",
      description:"Woodland animals, fungi, fruit, vegetables and folklore-inspired creatures introduced with the Jade Forest ecosystem.",
      officialUrl:"https://tamagotchi-official.com/us/series/paradise/character/?c=forest",
      characterNames:["Kuchipatchi","Konkotchi","Tigaotchi","Tanoontchi","Lessapantchi","Kanokotchi","Suigyutchi","Panbootchi","Kachitchi","Tokipatchi","Sparrotchi","Shiitaketchi","Peatchi","Nappatchi","Rushraditchi","Forest Horhotchi","Tatsutchi","Kokokonchi","Qilintchi","Luvkappatchi"]
    },
    {
      id:"tropical", name:"Tropical", label:"TROPICAL", type:"Tama Field", symbol:"TROPICAL",
      description:"Warm-climate animals and plants, tropical variants and Southern Paradise characters built around heat, color and lush habitats.",
      officialUrl:"https://tamagotchi-official.com/us/series/paradise/character/?c=tropical",
      characterNames:["Tropical Meowtchi","Madillotchi","Tarantytchi","Crocotchi","Tropical Mametchi","Parorotchi","Tenatchi","Namakemotchi","Kuikuitchi","Poizutchi","Chameleotchi","Iguanatchi","Yashikitchi","Tropical Potsunentchi","Ananatchi","Avovotchi","MANAPATCHI","Koalabutchi","Meertchi","Gorimatchi"]
    },
    {
      id:"ice", name:"Ice", label:"ICE", type:"Tama Field", symbol:"ICE",
      description:"Cold-climate mammals, seabirds, ice forms and deep-sea oddities from the frozen Paradise environment.",
      officialUrl:"https://tamagotchi-official.com/us/series/paradise/character/?c=ice",
      characterNames:["Wolftchi","Okojotchi","Polakumatchi","Azaratchi","Icy Irukatchi","Ginjirotchi","Hoppentchi","Rakkotchi","Moosetchi","Lemmingtchi","Raichotchi","Yukiusatchi","Nerinetchi","Dangouotchi","Yaytytchi","Yukiraratchi","HOBOHORNTCHI","Mothmothtchi","Yukitytchi"]
    },
    {
      id:"cosmic", name:"Cosmic Planet", label:"COSMIC PLANET", type:"Planet", symbol:"COSMIC",
      description:"The space-native roster: alien fauna, celestial bodies, satellites, astronauts, robots and extraterrestrial folklore.",
      officialUrl:"https://tamagotchi-official.com/us/series/paradise/character/?c=cosmicplanet",
      characterNames:["Cosmitchi","Hoshimortchi","Uchutchi","Kumamutchi","Ukiukitchi","Pochipotchi","Takonyatchi","Kumarstchi","Hanawatchi","Nagarebotchi","Planetchi","Quepealetchi","Mamerobotchi","Uchuhikotchi","Satelatchi","Parabolatchi","Flatoohtchi","Zatchi"]
    },
    {
      id:"tamagotchi", name:"Tamagotchi Planet", label:"TAMAGOTCHI PLANET", type:"Planet", symbol:"TAMAGOTCHI",
      description:"Classic Tamagotchi icons and the Neon Planets additions, bringing familiar mascot characters into the Paradise ecosystem.",
      officialUrl:"https://tamagotchi-official.com/us/series/paradise/character/?c=tamagotchiplanet",
      characterNames:["Pochitchi","Mametchi","Mimitchi","Furawatchi","Kuchipatchi","Marutchi","Memetchi","Makiko","Gozarutchi","Lovelitchi","Melodytchi","Moriritchi","Kuromametchi","Milktchi","Neliatchi","Unimarutchi","Weeptchi","Omarutchi","Pooptchi","Shykutchi"]
    }
  ];
})();
