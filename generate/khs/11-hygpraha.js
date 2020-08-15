const puppeteer = require('puppeteer');
const save = require('./_save');

module.exports = function () {
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

    await browser.close();
  })();
}