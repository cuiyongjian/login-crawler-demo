# login-to-get-data

一个包含了登录验证码破解、 excel 操作、邮件发送、模板渲染、node定时任务的工具项目。可以用于参考来抓取某些网站数据

## 依赖

* 验证码 谷歌 tesseract
* 邮件 nodemailer
* excel xlsx
* todo: nightmare UI 操作
* 定时任务 node-schedule

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