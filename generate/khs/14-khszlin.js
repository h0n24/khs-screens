const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1000});
    await page.goto('http://www.khszlin.cz/', {waitUntil: 'networkidle2'});
    // await page.screenshot({path: 'out/14-khszlin.png'});

    const url = await page.evaluate(() => {
      let names = document.querySelectorAll('.pdf');
      let arr = Array.prototype.slice.call(names);
      for (let i = 0; i < arr.length; i += 1) {

        if (arr[i].innerHTML.includes('Informace o výskytu koronaviru ve Zlínském kraji')) {
          return arr[i].href;
        }
      }
    });
    

    console.log(url);

    const file = fs.createWriteStream("out/14-khszlin.pdf");
    const request = http.get(url, function (response) {
      response.pipe(file);
    });
  
    await browser.close();
  })();
}