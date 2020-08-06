const puppeteer = require('puppeteer');
const save = require('./_save');
const clean = require('./_clean');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
      width: 1000,
      height: 2600
    });
    await page.goto('http://www.khshk.cz/news.php', {
      waitUntil: 'networkidle2'
    });

    // screenshot
    await page.screenshot({
      path: 'out/05-khshk.png',
      clip: {
        x: 220,
        y: 1375,
        width: 710,
        height: 1180
      }
    });

    // crawlování dat
    const crawledData = await page.evaluate(() => {
      let tables = document.querySelectorAll("table");
      let arr = Array.prototype.slice.call(tables);
      let preparedArray = [];

      for (let i = 0; i < arr.length; i += 1) {

        try {
          let title = arr[i].querySelectorAll("tr td span");

          if (title[0] !== undefined) {
            title = title[0].innerHTML;

            if (title.includes('Královéhradecký kraj - COVID-19')) {

              let rows = arr[i].querySelectorAll("tr");

              // přeskakujeme první tři řádky
              for (let rowIndex = 3; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex];
                const tds = row.querySelectorAll("td");

                try {
                  const okresHK = tds[2].innerText;
                  const okresJI = tds[3].innerText;
                  const okresNA = tds[4].innerText;
                  const okresRY = tds[5].innerText;
                  const okresTR = tds[6].innerText;

                  preparedArray.push([okresHK, okresJI, okresNA, okresRY, okresTR]);
                } catch (error) {

                }

              }

              return preparedArray;
            }
          }
        } catch (error) {

        }
      }
    });

    // zpracování dat
    const obyvatelstvo = {
      "Hradec Králové": 164283,
      "Jičín": 80045,
      "Náchod": 109958,
      "Rychnov nad Kněžnou": 79383,
      "Trutnov": 117978
    }

    let preparedData = [];

    for (var okres in obyvatelstvo) {
      if (obyvatelstvo.hasOwnProperty(okres)) {

        const position = Object.keys(obyvatelstvo).indexOf(okres);
        const pozitivni = clean.number(crawledData[0][position]);
        const vyleceni = clean.number(crawledData[1][position]);
        const umrti = clean.number(crawledData[2][position]);
        const aktivni = pozitivni - vyleceni - umrti;
        const obyvatel = obyvatelstvo[okres];

        preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
      }
    }

    save('out/data.json', {
      "05": preparedData
    });

    await browser.close();
  })();
}