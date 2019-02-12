// const Nightmare = require('nightmare')
// const nightmare = Nightmare({ show: true })

// nightmare
//   .goto('https://duckduckgo.com')
//   .type('#search_form_input_homepage', 'github nightmare')
//   .click('#search_button_homepage')
//   .wait('#r1-0 a.result__a')
//   .evaluate(() => document.querySelector('#r1-0 a.result__a').href)
//   .end()
//   .then(console.log)
//   .catch(error => {
//     console.error('Search failed:', error)
//   })

const axios = require('axios')
const cheerio = require('cheerio')
const url = require('url')
const path = require('path')
const debug = require('debug')
const fs = require('fs')
const config = require('./config')
const querystring = require('querystring')
const moment = require('moment')
const xlsx = require('xlsx')
const email = require('./email')
const view = require('handlebars');
const schedule = require('node-schedule')

let cookies = '' // 存储共享cookie
let loginCounts = 0 // 登录尝试次数


// 定时器
schedule.scheduleJob('30 0 9 * * *', function(){
    console.log('执行定时任务:' + new Date());
    main()
})


// 主函数
async function main() {
    // 先访问目标页面获取数据
    try {
        let data = await getData()
        data.time = `${config.moment.month() + 1}月${config.moment.date()}日`
        data.unknownPercent = ((data.unknown / data.send) * 100).toFixed(2) + '%'
        data.sendPercent = ((data.success / data.send) * 100).toFixed(0) + '%'
        data.successPercent = ((data.success / data.send) * 100).toFixed(2) + '%'
        console.log('拿到了数据', data)
        // 装入excel
        // 发送到目标邮箱
        var template = view.compile(fs.readFileSync('./template.html', {
            encoding: 'utf-8'
        }))
        var result = template({
            mydata: data
        });
        email(config.receiver, result)
    }
    catch(err) {
        if (err.message === 'no login') {
            // 如果没有登录，则尝试最多30次登录。登录成功后再次获取数据
            let loginRel = await startLogin()
            if (loginRel == true) {
                main()
            }
            else {
                await startLogin()
            }
        }
        else {
            console.log('出错了', err)
        }
    }
}

async function getData() {
    // 选择=下发数0，发送成功=成功数2，发送失败=失败数 3，已提交=未知状态数1
    let url = `http://${config.host}:8080/web-frontkit-wechat/smsmgmt/sendtracking/export?action=doSumTotal`
    let params = {
        exportBy: 1,
        phone: '',
        batchName: '',
        msgState: 0,
        channelId: 0,
        exportSub: 'on',
        mergeSign: 'on',
        batchState: '-1',
        beginTime: config.moment.startOf('day').format('YYYY-MM-DD HH:mm:ss'),
        endTime: config.moment.endOf('day').format('YYYY-MM-DD HH:mm:ss'),
        userId: 0,
        exportType: 0
    }
    let storageCookies = ''
    try {
        storageCookies = fs.readFileSync('./cookie.txt')
    }
    catch(err) {
        console.log('没有cookie.txt文件')
    }

    let axiosInstance = axios.create({
        // 设置 302 也是resolve
        validateStatus: function (status) {
            return status >= 200 && status < 600; // default
        },
        maxRedirects: 0, // 如果不设置为0，axios会自动重定向
        headers: {
            'Origin': `http://${config.host}:8080`,
            'Cookie': storageCookies,
            'Referer': `http://${config.host}:8080/web-frontkit-wechat/main`,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36'
        }
    })

    let pFail = axiosInstance.post(url, querystring.stringify(Object.assign(params, {
        msgState: 3
    }), null, null, {
        encodeURIComponent
    }))

    let pUnknown = axiosInstance.post(url, querystring.stringify(Object.assign(params, {
        msgState: 1
    }), null, null, {
        encodeURIComponent
    }))

    let pSuccess = axiosInstance.post(url, querystring.stringify(Object.assign(params, {
        msgState: 2
    }), null, null, {
        encodeURIComponent
    }))

    let pSend = axiosInstance.post(url, querystring.stringify(Object.assign(params, {
        msgState: 0
    }), null, null, {
        encodeURIComponent
    }))

    return axios.all([pSend, pSuccess, pFail, pUnknown])
    .then(axios.spread(function (relSend, relSuccess, relFail, relUnknown) {
        let args = [].slice.call(arguments, 0)
        if ([].some.call(args, (item => {
            // 接口返回302，说明没有登录
            if (item.status == 302 && (item.headers.location) && (item.headers.location.indexOf('login') >= 0)) {
                return true
            }
            else if (!item.data || !item.data.data || !item.data.data.total) {
                return true
            }
            else {
                return false
            }
        }))) {
            console.log('登录失败 无法访问数据接口，请先登录')
            return Promise.reject(new Error('no login'))
        }
        else {
            // 拿数据
            return {
                send: relSend.data.data.total,
                success: relSuccess.data.data.total,
                fail: relFail.data.data.total,
                unknown: relUnknown.data.data.total
            }
        }
    }))
}

async function startLogin() {
    loginCounts++
    if (loginCounts > 30) {
        process.exit(-1)
        return
    }
    // 访问登录页，获取验证码图片，获取sessionCookie
    const loginPageUrl = `http://${config.host}:8080/web-frontkit-wechat/login`
    const loginUrl = ''
    const recordUrl = ''
    let loginPageResult = await axios.get(loginPageUrl)
    const $ = cheerio.load(loginPageResult.data)
    let codeImgUrl = $('#codeImg').attr('src') // cheerio 不能直接用src属性
    let headers = loginPageResult.headers
    let cks = headers['set-cookie']
    cks.forEach(c => {
        cookie = c.match(/\w+=[A-z0-9]+/)
        cookies ? (cookies += '; ' + cookie) : (cookies += cookie)
    })

    // 破解验证码
    let parsedLoginPageUrl = url.parse(loginPageUrl)
    codeImgUrl = `${parsedLoginPageUrl.protocol}//${parsedLoginPageUrl.hostname}:${parsedLoginPageUrl.port}${path.isAbsolute(codeImgUrl) ? '' : `${path.dirname(parsedLoginPageUrl.pathname)}`}/${codeImgUrl}`
    const downloadCodeImgPath = path.join(__dirname, './code.jpg')
    await _getCodeImg(codeImgUrl, downloadCodeImgPath)
    let codeText = ''
    try {
        codeText = await _recognizeImg(downloadCodeImgPath)
    }
    catch (err) {
        console.log('recognizeImg出错', err)
        process.exit(-2)
    }
    codeText = codeText.toUpperCase()
    codeText = codeText.replace(/\s+/g, '').slice(0,4)
    console.log('验证码是', codeText)
    // 登录
    let loginRet = await _login(codeText)
    console.log('登录结果', loginRet)
    return loginRet
}

async function _getCodeImg(url, path) {
    path = path || './code.jpg'
    axios({
        method:'get',
        url,
        responseType:'stream'
    })
    .then(function (response) {
      response.data.pipe(fs.createWriteStream(path))
    });
}

function _recognizeImg(imgPath) {
    return new Promise((resolve, reject) => {
        const tesseract = require('node-tesseract')
        var options = {
            l: 'eng'
        };
        tesseract.process(imgPath, options, function(err, text) {
            if(err) {
                reject(err);
            } else {
                console.log('_recognizeImg: ', text, text.length);
                resolve(text.toString().trim())
            }
        });
    })
}

// async function _recognizeImg(imgPath) {
//     // refer: https://github.com/naptha/tesseract.js#tesseractjs
//     const Tesseract = require('tesseract.js')
//     Tesseract.recognize(imgPath)
//     .progress(function(message){console.log('progress is: ', message)})
//     .then(res => {
//         console.log('出来结果了', res.text)
//     })
//     .catch(err => {
//         console.log('ocr解析出错', err)
//     })
// }


async function _login(randomCode) {
    // 创建点击按钮的随机坐标 宽80 高30
    let x = 1 + Math.random() * 79
    let y = 1 + Math.random() * 29
    const md5 = require('md5')
    let password = md5(config.pass)
    let result = await axios.post(`http://${config.host}:8080/web-frontkit-wechat/login`, querystring.stringify({
        username: config.user,
        password,
        randomCode,
        x: Math.floor(x),
        y: Math.floor(y)
    }), {
        // 设置 302 也是resolve
        validateStatus: function (status) {
            return status >= 200 && status < 600; // default
        },
        maxRedirects: 0, // 如果不设置为0，axios会自动重定向
        headers: {
            'Cookie': cookies,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Origin': `http://${config.host}:8080`,
            'Referer': `http://${config.host}:8080/web-frontkit-wechat/login`,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36'
        }
    })
    // console.log('result', result)
    console.log('result.status', result.status)
    if (result.status == 302) {
        // 登录成功
        let cks = result.headers['set-cookie']
        console.log('登录cookie', cks)
        cks.forEach(c => {
            cookie = c.match(/\w+=[A-z0-9]+/)
            cookies ? (cookies += '; ' + cookie) : (cookies += cookie)
        })
        console.log('cookies result', cookies)
        fs.writeFileSync('./cookie.txt', cookies)
        return true
    }
    else {
        // fs.writeFileSync('./result.html', result.data)
        let $ = cheerio.load(result.data)
        let resultEle = $('table.login_in_board tr:nth-child(1) > td > span')
        console.log('登录失败: ', resultEle.text())
        return false
    }
}
