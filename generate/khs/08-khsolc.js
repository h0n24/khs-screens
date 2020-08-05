const puppeteer = require('puppeteer');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 600});
    await page.goto('http://www.khsolc.cz/info_verejnost.aspx', {waitUntil: 'networkidle2'});
    await page.screenshot({path: 'out/08-khsolc.png'});
  
    await browser.close();
  })();
}