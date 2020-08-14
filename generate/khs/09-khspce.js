// require
const puppeteer = require('puppeteer');
const save = require('./_save');

// globální proměnné -----------------------------------------------------------
const obyvatelstvo = {
  "Chrudim": 104613,
  "Pardubice": 175441,
  "Svitavy": 104333,
  "Ústí nad Orlicí": 138275
};

let okresZkratky = {
  "PA": "Pardubice",
  "CR": "Chrudim",
  "SY": "Svitavy",
  "UO": "Ústí nad Orlicí"
}

// helpers: pomocné funkce
function prepareNumber(string) {
  let preparedNumber = string.replace(/[^0-9]/g, '');
  preparedNumber = parseInt(preparedNumber, 10);
  return preparedNumber;
}

// čištění dat a finální úprava k uložení --------------------------------------
function prepareDataForSaving(crawledData, crawledHealed) {
  let preparedArray = [];

  // rozdělení dat v případě healed
  let [preparedHealed] = crawledHealed.match(/\(([^()]+)\)/g);
  preparedHealed = preparedHealed.replace("(", "");
  preparedHealed = preparedHealed.replace(")", "");
  preparedHealed = preparedHealed.split(",");

  for (let index = 0; index < crawledData.length; index++) {
    const paragraphText = crawledData[index];

    // začátek vypadá jako: "okres ÚO: 81", potřebujeme jen ÚO
    const substringBefore = 'okres '.length;
    const substringAfter = 2;

    // někdy píší ÚO a někdy UO
    let okresZnacka = paragraphText.substr(substringBefore, substringAfter);
    okresZnacka = okresZnacka.replace("ÚO", "UO");

    // tagy se kříží a nejsou jednotné (bold, strong), nemůžeme použít strukturu DOM
    // nutno rozdělit podle "aktuálně nemocných"
    let paragraphSplit = paragraphText.split("aktuálně nemocných");
    let pozitivni = prepareNumber(paragraphSplit[0]);
    let aktivni = prepareNumber(paragraphSplit[1]);

    // vyléčení
    let vyleceni = null;
    for (let indexHealed = 0; indexHealed < preparedHealed.length; indexHealed++) {
      const healed = preparedHealed[indexHealed];
      let [okresHealed, pocetHealed] = healed.split(":");
      okresHealed = okresHealed.trim();
      pocetHealed = prepareNumber(pocetHealed);

      if (okresHealed === okresZnacka) {
        vyleceni = pocetHealed;
      }
    }

    // vypočtená data
    let umrti = null;
    if (Number.isInteger(pozitivni) && Number.isInteger(aktivni) && Number.isInteger(vyleceni)) {
      umrti = pozitivni - aktivni - vyleceni;
    }

    // data z globálních proměnných
    const okres = okresZkratky[okresZnacka];
    const obyvatel = obyvatelstvo[okres];

    preparedArray.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
  }

  return preparedArray;
}

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
      width: 990,
      height: 900
    });

    await page.goto('https://www.khspce.cz/aktualni-situace-ve-vyskytu-koronaviru-v-pardubickem-kraji-2/', {
      waitUntil: 'networkidle2'
    });

    // screenshot
    await page.screenshot({
      path: 'out/09-khspce.png',
      clip: {
        x: 0,
        y: 150,
        width: 740,
        height: 650
      }
    });

    // crawlování dat: nakažení a aktivní
    const crawledData = await page.evaluate(() => {
      const content = document.querySelectorAll("#content .entry-content");
      const arr = Array.prototype.slice.call(content);
      let preparedArray = [];

      try {
        const title = arr[0].innerText;
        if (title !== undefined && title.includes('okres PA')) {
          const paragraphs = arr[0].querySelectorAll("p");

          for (let rowIndex = 0; rowIndex < paragraphs.length; rowIndex++) {
            const paragraphText = paragraphs[rowIndex].innerText;

            try {
              if (paragraphText.includes('okres ')) {
                preparedArray.push(paragraphText);
              }
            } catch (error) {

            }
          }
          return preparedArray;

        }
      } catch (error) {

      }
    });

    // crawlování dat: vyléčení
    const crawledHealed = await page.evaluate(() => {
      const content = document.querySelectorAll("#content .entry-content");
      const arr = Array.prototype.slice.call(content);

      try {
        const title = arr[0].innerText;

        if (title !== undefined && title.includes('okres PA')) {
          const paragraphs = arr[0].querySelectorAll("p");

          for (let rowIndex = 0; rowIndex < paragraphs.length; rowIndex++) {
            const paragraphText = paragraphs[rowIndex].innerText;

            try {
              if (paragraphText.includes('Počet potvrzených vyléčených ')) {
                return paragraphText;
              }
            } catch (error) {

            }
          }
        }
      } catch (error) {

      }
    });

    // finální tvorba array
    const preparedArray = prepareDataForSaving(crawledData, crawledHealed);

    // finální uložení do souboru
    save('out/data.json', {
      "09": preparedArray
    });

    await browser.close();
  })();
}
