const puppeteer = require('puppeteer');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 2600});
    await page.goto('http://www.khshk.cz/news.php', {waitUntil: 'networkidle2'});

    await page.screenshot({
      path: 'out/05-khshk.png',
      clip: {
        x: 220,
        y: 1375,
        width: 710,
        height: 1180
      }
    });
  
    await browser.close();
  })();
}