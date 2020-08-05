const puppeteer = require('puppeteer');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 900});
    await page.goto('http://www.khsjih.cz/covid-19.php', {waitUntil: 'networkidle2'});
    await page.screenshot({path: 'out/04-khsjih.png'});
  
    await browser.close();
  })();
}