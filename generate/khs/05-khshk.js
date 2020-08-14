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
    await page.goto('http://www.khshk.cz/articles.php?article_id=2030', {
      waitUntil: 'networkidle2'
    });

    // screenshot
    await page.screenshot({
      path: 'out/05-khshk.png',
      clip: {
        x: 220,
        y: 375,
        width: 710,
        height: 780
      }
    });

    // crawlování dat
    const crawledData = await page.evaluate(() => {
      let tables = document.querySelectorAll("table");
      let arr = Array.prototype.slice.call(tables);
      let preparedArray = [];

      for (let i = 0; i < arr.length; i += 1) {

        try {
          const title = arr[i].querySelectorAll("tr td span");

          if (title[0] !== undefined) {
            const testTitleOriginal = title[0].innerHTML.replace(/\s/g,'');
            const testTitleTested = 'Královéhradecký kraj - COVID-19'.replace(/\s/g,'');

            if (testTitleOriginal.includes(testTitleTested)) {

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

    // crawlování času
    const crawledTime = await page.evaluate(() => {
      let tables = document.querySelectorAll("table");
      let arr = Array.prototype.slice.call(tables);
      let preparedTime;

      for (let i = 0; i < arr.length; i += 1) {

        try {
          const title = arr[i].querySelectorAll("tr td span");

          if (title[0] !== undefined) {

            const testTimeOriginal = title[1].innerHTML.replace(/\s/g,'');
            const testTimeTested = "Situace k ".replace(/\s/g,'');

            if (testTimeOriginal.includes(testTimeTested)) {
              preparedTime = title[1].innerHTML;
              preparedTime = preparedTime.replace("Situace k", "");
              preparedTime = preparedTime.replace("hodin*", "");
              preparedTime = preparedTime.trim();

              return preparedTime;
            }
          }
        } catch (error) {

        }
      }
    });

    // zpracování dat -------------------------------------------------------
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

    // zpracování času -------------------------------------------------------
    // příklad vstupu: 14.8.2020, 15:45

    let dateTime = crawledTime;
    let [date, time] = dateTime.split(",");

    let [den, mesic, rok] = date.split(".");
    den = parseInt(den, 10);
    mesic = parseInt(mesic, 10);
    rok = parseInt(rok, 10);

    mesic < 9 ? mesic = `0${mesic}` : mesic;
    den < 9 ? den = `0${den}` : den;

    date = `${rok}-${mesic}-${den}`;
    dateTime = `${date} ${time}`;
    let ISODate = new Date(dateTime).toISOString();

    // console.log(ISODate);

    save('out/time.json', {
      "05": ISODate
    });

    await browser.close();
  })();
}