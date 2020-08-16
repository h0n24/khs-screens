const puppeteer = require('puppeteer');

const save = require('./_save');
const report = require('./_report');

const khs = "04-khsjih";

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // přístup na stránku
    await page.setViewport({
      width: 1000,
      height: 900
    });
    await page.goto('http://www.khsjih.cz/covid-19.php', {
      waitUntil: 'networkidle2'
    });

    // screenshot
    await page.screenshot({
      path: 'out/04-khsjih.png',
      clip: {
        x: 200,
        y: 120,
        width: 600,
        height: 630
      }
    });

    // crawlování dat
    const crawledData = await page.evaluate(() => {
      let tables = document.querySelectorAll("table.tabulka_covid");
      let arr = Array.prototype.slice.call(tables);
      let preparedArray = [];

      const obyvatelstvo = {
        "Jihlava": 113628,
        "Havlíčkův Brod": 94915,
        "Pelhřimov": 72302,
        "Třebíč": 110810,
        "Žďár nad Sázavou": 118158
      };

      function prepareNumber(string) {
        let preparedNumber = string.replace(/[^0-9]/g, '');
        preparedNumber = parseInt(preparedNumber, 10);
        return preparedNumber;
      }

      try {
        let title = arr[0].querySelectorAll("tr:not(.linka_nahore)");

        if (title[0] !== undefined) {
          title = title[0].innerHTML;

          if (title.includes('z toho v okrese ')) {

            let rows = arr[0].querySelectorAll("tr:not(.linka_nahore)");

            // přeskakujeme první tři řádky
            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
              const row = rows[rowIndex];
              const tds = row.querySelectorAll("td");

              try {
                let okres = tds[0].innerText;
                okres = okres.replace('z toho v okrese ', '');
                okres = okres.replace(":", "").trim();

                const pozitivni = prepareNumber(tds[1].innerText);
                const vyleceni = null;
                const umrti = null;
                const aktivni = null;
                const obyvatel = obyvatelstvo[okres];

                preparedArray.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);

              } catch (error) {

              }
            }

            return preparedArray;
          }
        }
      } catch (error) {

      }
    });

    save('out/data.json', {
      "04": crawledData
    });

    // crawlování času
    const crawledTime = await page.evaluate(() => {
      try {
        const time = document.querySelectorAll(".tucne.stred.odsazeni_30")[0].innerText;
        return time;
      } catch (error) {

      }
    });

    // čištění času
    // ukázka dat: Stav k 16.8.2020 - 18:15
    // odstranění všeho kromě čísel, tečky, čárky a dvojtečky
    let [date, time] = crawledTime.split("-");
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
      "04": ISODate
    });

    // finalizace  -------------------------------------------------------------
    report(khs, "OK");

    await browser.close();
  })();
}