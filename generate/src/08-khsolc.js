const puppeteer = require('puppeteer');

const save = require('./_save');
const report = require('./_report');

const khs = "08-khsolc";

module.exports = new Promise((resolve, reject) => {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // přístup na stránku
    await page.setViewport({
      width: 900,
      height: 600
    });
    await page.goto('http://www.khsolc.cz/info_verejnost.aspx', {
      waitUntil: 'networkidle2'
    });

    // úprava css - očištění od nesmyslů
    await page.evaluate(async () => {
      const style = document.createElement('style');
      style.type = 'text/css';
      const content = `
        #hlavnipanel-obsah {
          background: #FFF !important;
        }
        img[src="images/logo_graf.png"] {
          display: none !important;
        }
      `;
      style.appendChild(document.createTextNode(content));
      const promise = new Promise((resolve, reject) => {
        style.onload = resolve;
        style.onerror = reject;
      });
      document.head.appendChild(style);
      await promise;
    });

    // screenshot
    await page.screenshot({
      path: 'out/08-khsolc.png',
      clip: {
        x: 210,
        y: 140,
        width: 680,
        height: 450
      }
    });

    // crawlování dat
    const crawledData = await page.evaluate(() => {
      let tables = document.querySelectorAll("#hlavnipanel-obsah table");
      let arr = Array.prototype.slice.call(tables);
      let dataKategorie = "";
      let preparedArray = [];
      preparedArray[0] = [];
      preparedArray[1] = [];


      function prepareNumber(string) {
        let preparedNumber = string.replace(/[^0-9]/g, '');
        preparedNumber = parseInt(preparedNumber, 10);
        return preparedNumber;
      }

      try {
        let title = arr[0].innerText;

        if (title !== undefined) {
          if (title.includes('Nákaza COVID-19 v Olomouckém kraji')) {

            let rows = arr[0].querySelectorAll("tr");

            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
              const row = rows[rowIndex];
              const tds = row.querySelectorAll("td");

              try {
                let kategorie = tds[0].innerText;

                // přiřadíme kategorii globální proměnné pokud není prázdná
                if (/\S/.test(kategorie)) {
                  dataKategorie = kategorie;
                }

                if (dataKategorie.includes('Počet potvrzených případů v jednotlivých okresech')) {
                  let okres = tds[1].innerText;
                  okres = okres.replace('Okres', '').trim();

                  const cislo = prepareNumber(tds[2].innerText);
                  preparedArray[0].push([okres, cislo]);
                }

                if (dataKategorie.includes('Počet vyléčených osob v jednotlivých okresech')) {
                  let okres = tds[1].innerText;
                  okres = okres.replace('Okres', '').trim();

                  const cislo = prepareNumber(tds[2].innerText);
                  preparedArray[1].push([okres, cislo]);
                }

              } catch (error) {

              }
            }

            return preparedArray;
          }
        }
      } catch (error) {

      }
    });

    // crawlování času
    const crawledTime = await page.evaluate(() => {
      const caption = document.querySelectorAll("caption")[0].innerText;
      return caption;
    });

    // -------------------------------------------------------------------------

    // příprava dat
    let preparedData = [];

    const obyvatelstvo = {
      "Olomouc": 235472,
      "Prostějov": 108646,
      "Přerov": 129512,
      "Šumperk": 120417,
      "Jeseník": 37968
    };

    for (var okres in obyvatelstvo) {
      if (obyvatelstvo.hasOwnProperty(okres)) {
        const position = Object.keys(obyvatelstvo).indexOf(okres);

        const pozitivni = crawledData[0][position][1];
        const vyleceni = crawledData[1][position][1];
        const umrti = null
        const aktivni = null
        const obyvatel = obyvatelstvo[okres];

        preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
      }
    }

    save('out/data.json', {
      "08": preparedData
    });

    // -------------------------------------------------------------------------

    // čištění času
    // Nákaza COVID-19 v Olomouckém kraji ke dni 16.8.2020 18:00 
    // odstranění všeho kromě čísel, tečky, čárky a dvojtečky
    
    let [, preparedTime] = crawledTime.split("ke dni") 
    preparedTime = preparedTime.trim();

    let [date, time] = preparedTime.split(" ");

    date = date.replace(/[^0-9.]/g, "");
    time = time.replace(/[^0-9:]/g, "");

    let [den, mesic, rok] = date.split(".");

    den = den.replace(".", "");
    mesic = mesic.replace(".", "");

    den = parseInt(den, 10);
    mesic = parseInt(mesic, 10);
    rok = parseInt(rok, 10);

    mesic < 9 ? mesic = `0${mesic}` : mesic;
    den < 9 ? den = `0${den}` : den;

    const tempDate = `${rok}-${mesic}-${den}`;
    dateTime = `${tempDate} ${time}`;
    let ISODate = new Date(dateTime).toISOString();

    save('out/time.json', {
      "08": ISODate
    });

    // -------------------------------------------------------------------------

    report(khs, "OK");

    await browser.close();

    resolve();
  })();
});