const puppeteer = require('puppeteer');
const https  = require('https');
const fs = require('fs');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 1200});
    await page.goto('https://www.khsbrno.cz/', {waitUntil: 'networkidle2'});

    // hledání posledního pdf
    const url = await page.evaluate(() => {
      let names = document.querySelectorAll('.zvyrazneni_radku');
      let arr = Array.prototype.slice.call(names);
      for (let i = 0; i < arr.length; i += 1) {

        let link = arr[i].querySelector("a");

        if (link.innerHTML.includes('Aktuální epidemiologická situace v Jihomoravském kraji - COVID-19')) {
          return link.href;
        }
      }
    });

    // stahování pdf
    if (url) {
      const file = fs.createWriteStream("out/02-khsbrno.pdf");
      const request = https.get(url, function (response) {
        response.pipe(file);
      });
    }

    // console.log(url);

    // normalní screen
    await page.screenshot({path: 'out/02-khsbrno.png'});
  
    await browser.close();
  })();
}