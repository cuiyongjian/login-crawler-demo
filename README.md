# login-crawler-demo

一个包含了登录验证码破解、 excel 操作、邮件发送、模板渲染、node定时任务的工具项目。可以用于参考来抓取某些网站数据

## 依赖

* 验证码: [node-tesseract](https://github.com/cuiyongjian/node-tesseract) 谷歌 [tesseract](https://github.com/tesseract-ocr/tesseract/wiki)
* 邮件 nodemailer
* excel xlsx
* todo: nightmare UI 操作
* 定时任务 [node-schedule](http://www.cnblogs.com/zhongweiv/p/node_schedule.html)
* others: [moment](https://momentjs.com/) [md5](https://www.npmjs.com/package/md5) [axios](https://github.com/axios/axios) [cheerio](https://github.com/cheeriojs/cheerio)

## 踩坑

* 由于 [tesseract.js](https://github.com/naptha/tesseract.js) 经测试所使用的训练集对本demo验证码的识别度较低，因此并没有使用该npm包，反而使用了最基础的 [node-tesseract](https://github.com/cuiyongjian/node-tesseract)。不过由于 [tesseract](https://github.com/tesseract-ocr/tesseract) 4.0 已经不支持 `psm`
 参数，因此我对源码有一点改动.

* ocr识别有时候会识别失败，因此在登录过程中加入了30次重试机制

* 提高识别度的方法，其中一种是利用 graphicMagic 去预处理图像，这里demo要求不高因此没有使用。如果需要的话可以参考
 <https://segmentfault.com/a/1190000015134802>
 <https://www.ctolib.com/topics-116770.html>

## 配置

项目根目录下需要有一个 config.js 的配置文件，文件里做如下配置:

```js
const moment = require('moment')

module.exports = {
    host: '带爬取网站的域名',
    user: '登录用户名',
    pass: '登录密码',
    receiver: '接收爬取结果的邮箱',
    moment: moment().subtract(1, 'days') // 这里是要爬取的数据日期，该需求是当前爬取昨天的数据
}
```