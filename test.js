const puppeteer = require('puppeteer');

// 目標網址
const url = 'https://www.clhs.tyc.edu.tw/ischool/widget/site_news/main2.php?uid=WID_549_2_3e2e399a2649fb6ba9918090490f4741fd4453bf&maximize=1&allbtn=0';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // 打開目標網站
  await page.goto(url, { waitUntil: 'networkidle2' });

  // 等待新聞元素載入（根據具體 class 調整）
  await page.waitForSelector('.news-title');

  // 抓取新聞標題
  const newsTitles = await page.$$eval('.news-title', titles =>
    titles.map(title => title.textContent.trim())
  );

  // 輸出新聞標題
  newsTitles.forEach((title, index) => {
    console.log(`${index + 1}. ${title}`);
  });

  await browser.close();
})();