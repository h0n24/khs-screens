const puppeteer = require('puppeteer');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 990, height: 900});
    await page.goto('https://www.khspce.cz/aktualni-situace-ve-vyskytu-koronaviru-v-pardubickem-kraji-2/', {waitUntil: 'networkidle2'});
    await page.screenshot({path: 'out/09-khspce.png'});
  
    await browser.close();
  })();
}