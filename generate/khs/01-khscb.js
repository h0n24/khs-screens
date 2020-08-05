const puppeteer = require('puppeteer');
const fs = require('fs');
const save = require('./_save');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1000});
    await page.goto('https://www.khscb.cz/view.php?nazevclanku=aktualni-situace-k-vyskytu-koronaviru-v-jihoceskem-kraji&cisloclanku=2009040010', {waitUntil: 'networkidle2'});

    // screenshot
    // await page.screenshot({path: 'out/01-khscb.png'});

    // crawlování dat
    const crawledData = await page.evaluate(() => {
      let tables = document.querySelectorAll("table");
      let arr = Array.prototype.slice.call(tables);
      let preparedArray = [];

      for (let i = 0; i < arr.length; i += 1) {

        try {
          let title = arr[i].querySelectorAll("td[colspan='5'] b");

          if (title[0] !== undefined) {
            title = title[0].innerHTML;
            
            if (title.includes('Pozitivní případy v&nbsp;regionu po&nbsp;okresech')) {
              // return JSON.stringify(arr[i]);

              let rows = arr[i].querySelectorAll("tr");
              // přeskakujeme první dva řádky
              for (let rowIndex = 2; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex];
                const tds = row.querySelectorAll("td");

                const okres = tds[1].innerText;
                const pozitivni = tds[2].innerText;
                const vyleceni = tds[3].innerText;
                const aktivni = tds[4].innerText;

                preparedArray.push([okres, pozitivni, vyleceni, aktivni]);
              }

              return preparedArray;
            }
          }
        } catch (error) {
          
        }
      }
    });

    // zpracování dat
    let obyvatelstvo = {"České Budějovice": 195903, "Český Krumlov": 61556, "Jindřichův Hradec": 90692, "Písek": 71587, "Prachatice": 50978, "Strakonice": 70772, "Tábor": 102595};

    let preparedData = [];

    for (let index = 0; index < crawledData.length; index++) {
      const rowData = crawledData[index];
      const okres = rowData[0];
      const pozitivni = parseInt(rowData[1], 10);
      const vyleceni = parseInt(rowData[2], 10);
      const aktivni = parseInt(rowData[3], 10);
      const obyvatel = obyvatelstvo[okres];
      const testAktivni = pozitivni - vyleceni;

      if (testAktivni !== aktivni) {
        const error = `V okresu ${okres} nesedí rozdíl (${pozitivni} pozitivní - ${vyleceni} vyléčení) = ${aktivni} aktivní.`
        console.warn(error);
        save('out/errors.json', error);
      }

      preparedData.push([okres, pozitivni, vyleceni, null, obyvatel]);
    }

    save('out/data.json', {"01":preparedData});
  
    await browser.close();
  })();
}