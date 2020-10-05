const puppeteer = require('puppeteer');

const save = require('./_save');
const report = require('./_report');

const khs = "06-khslbc";

const obyvatelstvo = {
  "Česká Lípa": 103300,
  "Jablonec nad Nisou": 90667,
  "Liberec": 175626,
  "Semily": 74097
};

module.exports = new Promise((resolve, reject) => {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // přístup na stránku
    await page.setViewport({
      width: 1000,
      height: 1800
    });
    await page.goto('https://www.khslbc.cz/', {
      waitUntil: 'networkidle2'
    });

    // screenshot - check position
    const crawledPosition = await page.evaluate(() => {
      const table = document.querySelector(".main-content table");
      const bound = table.getBoundingClientRect();

      return [bound.left, bound.top, bound.width, bound.height];
    });

    // screenshot - make it
    const timeOffset = 50;
    await page.screenshot({
      path: `out/${khs}.png`,
      clip: {
        x: crawledPosition[0],
        y: crawledPosition[1],
        width: crawledPosition[2],
        height: crawledPosition[3] + timeOffset
      }
    });

    // crawlování dat
    const crawledData = await page.evaluate(() => {
      let tables = document.querySelectorAll(".main-content table");
      let arr = Array.prototype.slice.call(tables);
      let dataKategorie = "";
      let preparedObj = {};
      
      function prepareNumber(string) {
        let preparedNumber = string.replace(/[^0-9]/g, '');
        preparedNumber = parseInt(preparedNumber, 10);
        return preparedNumber;
      }

      try {
        let title = arr[0].innerText;

        if (title !== undefined) {
          if (title.includes('Jablonec n/N')) {

            let rows = arr[0].querySelectorAll("tr");

            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
              const row = rows[rowIndex];
              const tds = row.querySelectorAll("td");

              try {
                let okres = tds[0].innerText;
                let pozitivni = prepareNumber(tds[1].innerText);
                let vyleceni = prepareNumber(tds[2].innerText);
                let umrti = prepareNumber(tds[3].innerText);
                let aktivni = prepareNumber(tds[4].innerText);
                let data = [pozitivni, vyleceni, umrti, aktivni];

                if (okres === "Jablonec n/N") {
                  okres = "Jablonec nad Nisou";
                }

                preparedObj[okres] = data;

              } catch (error) {

              }
            }
            return preparedObj;
          }
        }
      } catch (error) {

      }
    });

    // -------------------------------------------------------------------------

    // příprava dat
    let preparedData = [];

    for (var okres in obyvatelstvo) {
      if (obyvatelstvo.hasOwnProperty(okres)) {
        const position = Object.keys(obyvatelstvo).indexOf(okres);

        const pozitivni = crawledData[okres][0];
        const vyleceni = crawledData[okres][1];
        const umrti = crawledData[okres][2];
        const aktivni = crawledData[okres][3];
        const obyvatel = obyvatelstvo[okres];

        preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
      }
    }

    save('out/data.json', {
      "06": preparedData
    });

    // -------------------------------------------------------------------------

    // crawlování času
    const crawledTime = await page.evaluate(() => {
      const everyDiv = document.querySelectorAll(".entry-content div");
      let time;

      for (let divIndex = 0; divIndex < everyDiv.length; divIndex++) {
        const div = everyDiv[divIndex];
        
        try {
          let text = div.innerText;
  
          if (text !== undefined) {
            if (text.includes('Aktualizace')) {
              time = text;
              return time;
            }
          }
        } catch (error) {
  
        }
      }
    });

    // čištění času
    // Aktualizace 5. 10. 2020 k 8:15
    // odstranění všeho kromě čísel, tečky, čárky a dvojtečky

    let [date, time] = crawledTime.split("k ");

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
      "06": ISODate
    });

    // -------------------------------------------------------------------------

    report(khs, "OK");

    await browser.close();

    resolve();
  })();
});