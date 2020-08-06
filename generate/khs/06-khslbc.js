const puppeteer = require('puppeteer');
const save = require('./_save');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
      width: 510,
      height: 500
    });
    await page.goto('http://www.khslbc.cz/', {
      waitUntil: 'networkidle2'
    });

    // screenshot
    await page.evaluate(() => {
      window.scrollBy(240, 1350);
    });

    await page.screenshot({
      path: 'out/06-khslbc.png'
    });

    // crawlování dat
    const crawledData = await page.evaluate(() => {
      let tables = document.querySelectorAll("table:not(#wp-calendar)");
      let arr = Array.prototype.slice.call(tables);
      let preparedArray = [];

      const obyvatelstvo = {
        "Česká Lípa": 103300,
        "Jablonec nad Nisou": 90667,
        "Liberec": 175626,
        "Semily": 74097
      };

      function prepareNumber(string) {
        let preparedNumber = string.replace(/ /g, '').trim();
        preparedNumber = parseInt(preparedNumber, 10);
        return preparedNumber;
      }

      try {
        let title = arr[0].innerText;

        if (title !== undefined) {
          if (title.includes('počet případů v okrese')) {

            let rows = arr[0].querySelectorAll("tr");

            // přeskakujeme první tři řádky
            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
              const row = rows[rowIndex];
              const tds = row.querySelectorAll("td");

              try {
                let okres = tds[0].innerText;

                if (okres.includes('počet případů v okrese')) {
                  okres = okres.replace('počet případů v okrese', '');
                  okres = okres.trim();

                  // odstranění závorky, kdyby si s tím preparenumber neporadilo
                  let pozitivni = tds[1].innerText;
                  pozitivni.replace(/ *\([^)]*\) */g, "");
                  pozitivni = prepareNumber(pozitivni);

                  const vyleceni = null;
                  const umrti = null;
                  const aktivni = null;
                  const obyvatel = obyvatelstvo[okres];

                  preparedArray.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
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

    save('out/data.json', {
      "06": crawledData
    });

    await browser.close();
  })();
}