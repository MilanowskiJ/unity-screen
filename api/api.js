
const puppeteer = require("puppeteer");
var fs = require("fs");

var url = "https://www.dndbeyond.com/profile/66tee/characters/5305762";

puppeteer.launch({headless: false})
    .then(browser => browser.newPage())
    .then(page => page.goto(url).then(() => {
        setTimeout(() => {
            page.evaluate(() => {
                console.log(document.querySelector("span").innerHTML);
            });
        }, 5000);
    }));

/*
(async () => {
  try {
    // open the headless browser
    var browser = await puppeteer.launch({ headless: true });
    // open a new page
    var page = await browser.newPage();
    // enter url in page
    await page.goto(`https://news.ycombinator.com/`);
    await page.waitForSelector("a.storylink");

    var news = await page.evaluate(() => {
      var titleNodeList = document.querySelectorAll(`a.storylink`);
      var ageList = document.querySelectorAll(`span.age`);
      var scoreList = document.querySelectorAll(`span.score`);
      var titleLinkArray = [];
      for (var i = 0; i < titleNodeList.length; i++) {
        titleLinkArray[i] = {
          title: titleNodeList[i].innerText.trim(),
          link: titleNodeList[i].getAttribute("href"),
          age: ageList[i].innerText.trim(),
          score: scoreList[i].innerText.trim()
        };
      }
      return titleLinkArray;
    });
    // console.log(news);
    await browser.close();
    // Writing the news inside a json file
    fs.writeFile("hackernews.json", JSON.stringify(news), function(err) {
      if (err) throw err;
      console.log("Saved!");
    });
    console.log(success("Browser Closed"));
  } catch (err) {
    // Catch and display errors
    console.log(error(err));
    await browser.close();
    console.log(error("Browser Closed"));
  }
})();
*/