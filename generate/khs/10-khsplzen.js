const puppeteer = require('puppeteer');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 2000});
    await page.goto('https://www.khsplzen.cz/', {waitUntil: 'networkidle2'});

    await page.evaluate( () => {
      window.scrollBy(0, 400);
    });

    await page.screenshot({path: 'out/10-khsplzen.png'});
  
    await browser.close();
  })();
}