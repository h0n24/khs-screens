const puppeteer = require('puppeteer');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 510, height: 500});
    await page.goto('http://www.khslbc.cz/', {waitUntil: 'networkidle2'});
    await page.evaluate( () => {
      window.scrollBy(240, 1350);
    });

    await page.screenshot({path: 'out/06-khslbc.png'});

    await browser.close();
  })();
}