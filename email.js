const moment = require('moment')
const config = require('./config')

module.exports = function (address, data) {

    const nodemailer = require('nodemailer');
    
    let transporter = nodemailer.createTransport({
      // host: 'smtp.ethereal.email',
      service: 'qq', // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
      port: 465, // SMTP 端口
      secureConnection: true, // 使用了 SSL
      auth: {
        user: 'cuiyongjian@qq.com',
        // 这里密码不是qq密码，是你设置的smtp授权码
        pass: 'vvlackbaoryhbbde',
      }
    });
    
    let mailOptions = {
      from: '"your baby" <cuiyongjian@qq.com>', // sender address
      to: address, // list of receivers
      subject: `【189短信发送统计】广州电信运维部-${config.moment.month() + 1}月${config.moment.date()}日`, // Subject line
      // 发送text或者html格式
      // text: 'Hello world?', // plain text body
      html: data // html body
    };
    
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log('Message sent: %s', info.messageId);
      // Message sent: <04ec7731-cc68-1ef6-303c-61b0f796b78f@qq.com>
    });
}