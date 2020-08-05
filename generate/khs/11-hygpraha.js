const puppeteer = require('puppeteer');

module.exports = function () {
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://www.hygpraha.cz/', {waitUntil: 'networkidle2'});

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
    await page2.setViewport({ width: 800, height: 5200});
    await page2.goto(url, {waitUntil: 'networkidle2'});

    await page2.evaluate( () => {
      window.scrollBy(-220, 190);
    });

    await page2.screenshot({path: 'out/11-hygpraha.png'});
  
    await browser.close();
  })();
}