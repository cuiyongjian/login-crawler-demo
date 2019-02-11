const xlsx = require('xlsx')
const moment = require('moment')


module.exports = function (newData) {

    let workbook = xlsx.readFile('./template.xlsx')
    var first_sheet_name = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[first_sheet_name]
    // let rel = xlsx.utils.sheet_to_json(worksheet, {
    //     defval: null,
    //     raw: false
    // })
    // console.log('rel', rel.length)
    let refer = worksheet['A2']
    worksheet[`A11`] = Object.assign(refer, {
        w: '2/9/13'
    })
    // 写出
    xlsx.writeFile(workbook, `广州电信运维部-${moment().month() + 1}月${moment().date()}号.xlsx`)

}()


