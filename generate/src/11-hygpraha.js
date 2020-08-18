const puppeteer = require('puppeteer');

const save = require('./_save');
const report = require('./_report');

const khs = "11-hygpraha";

module.exports = new Promise((resolve, reject) => {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://www.hygpraha.cz/', {
      waitUntil: 'networkidle2'
    });

    // hledání správného odkazu
    const url = await page.evaluate(() => {
      let names = document.querySelectorAll('.vypis-homepage .vypis-item');
      let arr = Array.prototype.slice.call(names);
      for (let i = 0; i < arr.length; i += 1) {
        let link = arr[i].querySelector("a");
        if (link.innerHTML.includes('pozitivních případů onemocnění covid')) {
          return link.href;
        }
      }
    });

    const page2 = await browser.newPage();
    await page2.setViewport({
      width: 800,
      height: 5200
    });
    await page2.goto(url, {
      waitUntil: 'networkidle2'
    });

    // screenshot
    await page2.evaluate(() => {
      window.scrollBy(-220, 190);
    });

    await page2.screenshot({
      path: 'out/11-hygpraha.png'
    });

    // crawlování dat
    const crawledData = await page2.evaluate(() => {
      let tables = document.querySelectorAll("table");
      let arr = Array.prototype.slice.call(tables);
      let preparedArray = [];

      for (let i = 0; i < arr.length; i += 1) {

        try {
          let title = arr[i].querySelectorAll("tr td strong");

          if (title[0] !== undefined) {
            title = title[0].innerHTML;

            if (title.includes('Kumulativní celkový počet potvrzených případů onemocnění')) {

              const rows = arr[i].querySelectorAll("tr");
              const row = rows[1];
              const tds = row.querySelectorAll("td");

              function prepareNumber(string) {
                let preparedNumber = string.replace(/ /g, '').trim();
                preparedNumber = parseInt(preparedNumber, 10);
                return preparedNumber;
              }

              const okres = "Praha";
              const pozitivni = prepareNumber(tds[0].innerText);
              const vyleceni = prepareNumber(tds[3].innerText);
              const umrti = prepareNumber(tds[4].innerText);
              const aktivni = pozitivni - vyleceni - umrti;
              const obyvatel = 1324277; // celá Praha

              preparedArray.push([okres, pozitivni, vyleceni, umrti, aktivni, obyvatel]);

              return preparedArray;
            }
          }
        } catch (error) {

        }
      }
    });

    save('out/data.json', {
      "11": crawledData
    });

    // crawlování času
    const crawledTime = await page2.evaluate(() => {
      try {
        return document.head.querySelector('[name="description"]').content;
      } catch (error) {
        
      }
    });

    // čištění času
    // ukázka: "Hygienická stanice hlavního města Prahy informuje, 
    //    že v Praze je aktuálně celkem 4 003 potvrzených případů onemocnění
    //    covid-19.-● situace k 16.8.2020;18:00 hodin
    let [, preparedTime] = crawledTime.split("situace k");
    preparedTime = preparedTime.trim();

    let [date, time] = preparedTime.split(";");

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
      "11": ISODate
    });

    // finalizace
    report(khs, "OK");

    await browser.close();

    resolve();
  })();
});