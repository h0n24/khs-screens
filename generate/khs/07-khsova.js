const puppeteer = require('puppeteer');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 850});
    await page.goto('http://www.khsova.cz/', {waitUntil: 'networkidle2'});
    await page.screenshot({path: 'out/07-khsova.png'});
  
    await browser.close();
  })();
}