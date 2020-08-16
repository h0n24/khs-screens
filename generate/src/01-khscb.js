const puppeteer = require('puppeteer');
const fs = require('fs');

const save = require('./_save');
const clean = require('./_clean');
const report = require('./_report');

const khs = "01-khscb";

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // přístup na stránku
    await page.setViewport({
      width: 1000,
      height: 1000
    });

    await page.goto('https://www.khscb.cz/view.php?nazevclanku=aktualni-situace-k-vyskytu-koronaviru-v-jihoceskem-kraji&cisloclanku=2009040010', {
      waitUntil: 'networkidle2'
    });

    // screenshot
    await page.screenshot({
      path: 'out/01-khscb.png'
    });

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

    // crawlování času
    const crawledTime = await page.evaluate(() => {
      let tables = document.querySelectorAll("table");
      let arr = Array.prototype.slice.call(tables);
      let preparedTime;

      for (let i = 0; i < arr.length; i += 1) {
        try {
          const title = arr[i].querySelectorAll("tr td b");

          if (title[0] !== undefined) {
            const testTimeOriginal = title[0].innerHTML.replace(/\s/g,'');
            const testTimeTested = "Údaje k".replace(/\s/g,'');

            if (testTimeOriginal.includes(testTimeTested)) {

              preparedTime = title[0].innerHTML;
              preparedTime = preparedTime.replace("Údaje k", "");
              preparedTime = preparedTime.replace("&nbsp;", "");
              preparedTime = preparedTime.replace("<br>", "");
              preparedTime = preparedTime.trim();

              return preparedTime;
            }
          }
        } catch (error) {

        }
      }
    });

    // zpracování dat ----------------------------------------------------------

    const obyvatelstvo = {
      "České Budějovice": 195903,
      "Český Krumlov": 61556,
      "Jindřichův Hradec": 90692,
      "Písek": 71587,
      "Prachatice": 50978,
      "Strakonice": 70772,
      "Tábor": 102595
    };

    let preparedData = [];

    for (let index = 0; index < crawledData.length; index++) {
      const rowData = crawledData[index];
      const okres = rowData[0];
      const pozitivni = clean.number(rowData[1]);
      const vyleceni = clean.number(rowData[2]);
      const aktivni = clean.number(rowData[3]);
      const obyvatel = obyvatelstvo[okres];
      const umrti = pozitivni - vyleceni - aktivni;

      preparedData.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);
    }

    save('out/data.json', {
      "01": preparedData
    });

    // zpracování času -------------------------------------------------------
    // příklad vstupu: 15. 8. 2020 18:00

    let dateTime = crawledTime;
    let [den, mesic, rok, time] = dateTime.split(" ");

    den = den.replace(".", "");
    mesic = mesic.replace(".", "");

    den = parseInt(den, 10);
    mesic = parseInt(mesic, 10);
    rok = parseInt(rok, 10);

    mesic < 9 ? mesic = `0${mesic}` : mesic;
    den < 9 ? den = `0${den}` : den;

    date = `${rok}-${mesic}-${den}`;
    dateTime = `${date} ${time}`;
    let ISODate = new Date(dateTime).toISOString();

    save('out/time.json', {
      "01": ISODate
    });

    report(khs, "OK");

    await browser.close();
  })();
}