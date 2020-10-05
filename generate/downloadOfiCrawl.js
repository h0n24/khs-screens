const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();

  // stažení dat -------------------------------------------------------------
  const page = await browser.newPage();

  await page.goto('https://onemocneni-aktualne.mzcr.cz/covid-19', {
    waitUntil: 'networkidle2'
  });

  // příprava dat
  const obyvatelstvo = {
    "České Budějovice": 195903,
    "Český Krumlov": 61556,
    "Jindřichův Hradec": 90692,
    "Písek": 71587,
    "Prachatice": 50978,
    "Strakonice": 70772,
    "Tábor": 102595,
    "Brno-město": 381346,
    "Brno-venkov": 224642,
    "Blansko": 109136,
    "Břeclav": 116291,
    "Hodonín": 153943,
    "Vyškov": 92280,
    "Znojmo": 114351,
    "Karlovy Vary": 114818,
    "Sokolov": 88212,
    "Cheb": 91634,
    "Jihlava": 113628,
    "Havlíčkův Brod": 94915,
    "Pelhřimov": 72302,
    "Třebíč": 110810,
    "Žďár nad Sázavou": 118158,
    "Hradec Králové": 164283,
    "Jičín": 80045,
    "Náchod": 109958,
    "Rychnov nad Kněžnou": 79383,
    "Trutnov": 117978,
    "Česká Lípa": 103300,
    "Jablonec nad Nisou": 90667,
    "Liberec": 175626,
    "Semily": 74097,
    "Bruntál": 91597,
    "Opava": 176236,
    "Nový Jičín": 151577,
    "Ostrava": 320145,
    "Karviná": 246324,
    "Frýdek-Místek": 214660,
    "Olomouc": 235472,
    "Prostějov": 108646,
    "Přerov": 129512,
    "Šumperk": 120417,
    "Jeseník": 37968,
    "Chrudim": 104613,
    "Pardubice": 175441,
    "Svitavy": 104333,
    "Ústí nad Orlicí": 138275,
    "Tachov": 54336,
    "Plzeň-sever": 79979,
    "Plzeň-město": 194280,
    "Rokycany": 49349,
    "Plzeň-jih": 63488,
    "Domažlice": 62062,
    "Klatovy": 86405,
    "Praha": 1324277,
    "Rakovník": 55562,
    "Kladno": 166483,
    "Mělník": 109302,
    "Mladá Boleslav": 130365,
    "Nymburk": 100886,
    "Kolín": 102623,
    "Kutná Hora": 75828,
    "Benešov": 99414,
    "Příbram": 115104,
    "Beroun": 95058,
    "Praha-západ": 149338,
    "Praha-východ": 185178,
    "Děčín": 129542,
    "Chomutov": 124946,
    "Most": 111708,
    "Litoměřice": 119668,
    "Louny": 86691,
    "Teplice": 129072,
    "Ústí nad Labem": 119338,
    "Kroměříž": 105343,
    "Uherské Hradiště": 142226,
    "Vsetín": 143334,
    "Zlín": 191652
  };

  // parsování dat
  let data = await page.evaluate(() => {
    return JSON.parse(document.querySelector("#js-relative-isin-districts-last-week-data").dataset.map);
  });

  // uložení jako json
  const stringData = JSON.stringify(data);
  const writeStream = fs.createWriteStream(`out/ofi-crawl.json`);
  writeStream.write(stringData);

  // průchod dat
  const jsonData = data.data;
  const maxValue = parseFloat(data.metadata.maxValue);

  // čištění dat
  let preparedData = [];
  let testKumulativne = 0;

  for (var okres in obyvatelstvo) {
    if (obyvatelstvo.hasOwnProperty(okres)) {

      for (var jsonOkres in jsonData) {
        if (jsonData.hasOwnProperty(jsonOkres)) {
          let name = jsonData[jsonOkres].name;
          const value = jsonData[jsonOkres].value;
          const color = jsonData[jsonOkres].color;
          let [,,,transparency] = color.split(",");
          transparency = parseFloat(transparency);

          // oprava - synchronizace s Gdocs
          if (name === "Hlavní město Praha") {
            name = "Praha";
          }

          if (name === "Ostrava-město") {
            name = "Ostrava";
          }

          // seřazení dle Gdocs
          if (name === okres) {
            // vzorec
            // value = transparency * maxValue;
            // lze teoreticky použít na korekce zaokrouhlování
            const diffValue = value - (transparency * maxValue);

            const obyvatel = obyvatelstvo[okres];
            const hustota = obyvatel / 100000;

            let nakazenych = Math.round(value * hustota);
            let nakazenychCorrected = Math.round((value + diffValue) * hustota);

            testKumulativne = testKumulativne + nakazenychCorrected;
            
            console.log(name, nakazenychCorrected);
            preparedData.push([name, nakazenychCorrected, [value, obyvatel]]);
          }
        }
      }

    }
  }

  // console.log(data.metadata.maxValue);

  const stringData2 = JSON.stringify(preparedData);
  const writeStream2 = fs.createWriteStream(`out/ofi-crawl2.json`);
  writeStream2.write(stringData2);

  await browser.close();
})();