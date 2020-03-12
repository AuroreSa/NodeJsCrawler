const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true, width: 1280, height: 1024 });
const util = require('util');
const fs = require('fs');

//引入JQuery機制
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const $ = require('jquery')(window);

//使工具擁有promise的特性
const writeFile = util.promisify(fs.writeFile);

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
};

//放置網頁元素
let arrLink = []

//初始化設定
async function initialization() {
    try {
        if (!fs.existsSync(`downloads`)) {
            fs.mkdirSync(`downloads`);
        }
    } catch (err) {
        throw err;
    }
}

//引導nightmare至網站
async function gotoUrl() {
    console.log(`進入線上閱讀首頁`)

    //啟動nightmare
    await nightmare
        //進入首頁,附加檔頭
        .goto('https://www.bookwormzz.com/zh/', headers)
        .wait(2000)
        .catch((err) => {
            console.log(err);
        })
}

//整理編排小說名稱至陣列中
async function arrange() {
    console.log(`分析、整理各項資訊...`);

    let html = await nightmare.evaluate(() => {
        return document.documentElement.innerHTML;
    });

    let obj = {};

    $(html)
        .find('div#html.ui-content div.epub.ui-collapsible.ui-collapsible-inset.ui-corner-all.ui-collapsible-themed-content div.ui-collapsible-content.ui-body-b li')
        .each((index, element) => {
            //找出各本書單的連結
            let linkOfBook = $(element).find('a.ui-btn.ui-btn-icon-right.ui-icon-carat-r').attr('href');

            //將連結整理後放到陣列中
            linkOfBook = linkOfBook.replace(/\.\./g, 'https://www.bookwormzz.com')
            linkOfBook = linkOfBook + "#book_toc";
            obj.url = linkOfBook;

            //小說名稱
            let titleOfBook = $(element)
                .find('a.ui-btn.ui-btn-icon-right.ui-icon-carat-r')
                .text();
            titleOfBook = titleOfBook.trim();
            obj.title = titleOfBook;

            let links = [];
            obj.links = links;

            //蒐集、整理各個擷取到的影音連結元素資訊，到全域的陣列變數中
            arrLink.push(obj);

            //變數初始化
            obj = {};
        });
}

//進入各本小說列表取出冊數並陣列化
async function getBookUrl() {
    console.log('取出冊數並陣列化')
    for (let i = 0; i < arrLink.length; i++) {
        let html = await nightmare
            .goto(arrLink[i].url)
            .wait('div.ui-content')
            .evaluate(() => {
                return document.documentElement.innerHTML;
            });

        let obj = {};
        let linksUrl = [];

        $(html)
            .find('div.ui-content li')
            .each((index, element) => {
                //找出各本書冊的連結
                let book = $(element).find('a.ui-link').attr('href');
                //將連結整理後放入陣列中
                book = 'https://www.bookwormzz.com' + book;
                obj.bookUrl = book;

                linksUrl.push(obj);
                arrLink[i].links = linksUrl;


                //變數初始化
                obj = {};
            });
    }
}

//取得內頁的title和content
async function titleAndContent() {
    console.log('取內容')
    for (let i = 0; i < arrLink.length; i++) {
        for (let tac = 0; tac < arrLink[i].links.length; tac++) {
            //console.log(arrLink[i].links[tac].bookUrl)
            let html = await nightmare
                .goto(arrLink[i].links[tac].bookUrl)
                .wait(2000)
                .evaluate(() => {
                    return document.documentElement.innerHTML;
                });

            let obj = {};

            $(html)
                .find('div#html')
                .each((index, element) => {
                    //找出回冊名稱
                    let title = $(element).find('h3').text();
                    //將名稱放入陣列
                    //obj.title = title;

                    //取得並整理內容
                    let content = $(element).find('div:eq(0)').text();
                    content = content.replace(/\s/g, '');
                    //obj.content = content;

                    //建立新屬性
                    arrLink[i].links[tac].title = title;
                    arrLink[i].links[tac].content = content;

                    //console.log(obj)


                    //變數初始化
                    // obj = {};
                });

        }
    }
}

async function step5() {
    for (let i = 0; i < arrLink.length; i++) {
        //前往小說頁面
        let html = await nightmare
            .goto(arrLink[i].link)
            .wait('div.ui-content')
            .evaluate(() => {
                return document.documentElement.innerHTML;
            });

        //取得觀看次數的字串
        let strPageView = $(html)
            .find('div#count.style-scope.ytd-video-primary-info-renderer span.view-count.style-scope.yt-view-count-renderer')
            .text();

        //取得觀看次數
        let pattern = /[0-9,]+/g;
        let match = null;
        match = pattern.exec(strPageView);
        strPageView = match[0];
        strPageView = strPageView.replace(/,/g, '') //去掉字串裡的逗號，剩下數字

        //取得按讚的數量
        let strLikeCount = $(html)
            .find('div#top-level-buttons yt-formatted-string#text:eq(0)')
            .attr('aria-label');
        pattern = /[0-9,]+/g;
        match = null;
        match = pattern.exec(strLikeCount);
        strLikeCount = match[0];
        strLikeCount = strLikeCount.replace(/,/g, '') //去掉字串裡的逗號，剩下數字

        //取得倒讚的數量
        let strUnlikeCount = $(html)
            .find('div#top-level-buttons yt-formatted-string#text:eq(1)')
            .attr('aria-label');
        pattern = /[0-9,]+/g;
        match = null;
        match = pattern.exec(strUnlikeCount);
        strUnlikeCount = match[0];
        strUnlikeCount = strUnlikeCount.replace(/,/g, '') //去掉字串裡的逗號，剩下數字

        //建立新屬性
        arrLink[i].pageView = parseInt(strPageView);
        arrLink[i].likeCount = parseInt(strLikeCount);
        arrLink[i].unlikeCount = parseInt(strUnlikeCount);
    }
}

//關閉 nightmare
async function close() {
    await nightmare.end((err) => {
        if (err) { throw err; }
        console.log(`關閉 nightmare`)
    })
}

async function asyncArray(functionList) {
    for (let func of functionList) {
        await func();
    }
}


try {
    asyncArray([initialization, gotoUrl, arrange, getBookUrl, titleAndContent, close]).then(async () => {
        console.dir(arrLink,{depth:null});

        //若是檔案不存在，則新增檔案，同時寫入內容
        if( !fs.existsSync(`downloads/JinyongNovels.json`)){
            await writeFile(`downloads/JinyongNovels.json`,JSON.stringify(arrLink,null,4));
        }

        console.log('Done');
    });
} catch (err) {

}