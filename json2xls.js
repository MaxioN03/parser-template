const json2xls = require('json2xls');
const Excel = require('exceljs');
const fs = require('fs');


let json;
let fielPathJSON = 'result/result.json';
let fielPathXLS = 'result/irrParseData.xlsx';

fs.readFile(fielPathJSON, 'utf8', function readFileCallback(err, data) {
  if (err) {
    console.log(err);
  } else {
    json = JSON.parse(data); //now it an object

    //var xls = json2xls(json);

    var xls = json2xls(json,{
      fields: {
        'ID Объекта':'string',
        'Изменить':'string',
        'Дата обновления':'string',
        'Дата парсинга':'string',
        'Расчетная экспозиция':'string',
        'Тип предложения':'string',
        'Источник':'string',
        'Контактное лицо':'string',
        'Контактные данные':'string',
        'Организация':'string',
        'Тип объекта':'string',
        'Вид объекта':'string',
        'Область':'string',
        'Район':'string',
        'Сельский совет':'string',
        'Категория населенного пункта':'string',
        'Название населенного пункта':'string',
        'Objectstring':'string',
        'Элемент улично-дорожной сети':'string',
        'Название элемента улично-дорожной сети':'string',
        'Номер дома':'string',
        'Корпус':'string',
        'Описание местоположения':'string',
        'Назначение':'string',
        'Наименование':'string',
        'Вспомогательные наименования':'string',
        'Общее состояние':'string',
        'Наружная отделка':'string',
        'Внутренняя отделка':'string',
        'Стеклопакеты':'string',
        'Год постройки':'string',
        'Год реконструкции':'string',
        'Этаж/этажность':'string',
        'Подвал':'string',
        'Мансардный этаж':'string',
        'Общая площадь от, кв м':'string',
        'Общая площадь до, кв м':'string',
        'Нормируемая (полезная) площадь, кв м':'string',
        'Площадь ЗУ, га':'string',
        'Высота потолка':'string',
        'Шаг колонн, м':'string',
        'Материал стен':'string',
        'Материал покрытия пола':'string',
        'Материал дверей и ворот':'string',
        'Погрузочно-разгрузочное оборудование':'string',
        'Электроснабжение':'string',
        'Холодное водоснабжение':'string',
        'Горячее водоснабжение':'string',
        'Водоотведение/канализация':'string',
        'Отопление':'string',
        'Цена предложения от':'string',
        'Цена предложения до':'string',
        'Маркер цены предложения':'string',
        'Цена предложения за кв м от':'string',
        'Цена предложения за кв м до':'string',
        'Маркер цены предложения за кв м':'string',
        'Валюта предложения':'string',
        'НДС в цене сделки':'string',
        'Скидка на торг':'string',
        'Сдается в аренду':'string',
        'Арендная ставка, EUR':'string',
        'НДС в арендной ставке':'string',
        'В аренду включены':'string',
        'Сумма, включенных в арендную ставку платежей, EUR/кв м':'string',
        'Условия сделки':'string',
        'Описание над объявлением':'string',
        'Примечание':'string',
        'Ссылка на HTML-страницу':'string',
        'Xcoord(неправ)':'string',
        'Ycoord(неправ)':'string',
        'Xcoord':'string',
        'Ycoord':'string',
      }
    });

    fs.writeFileSync(fielPathXLS, xls, 'binary');
  }
});

// read from a file
var workbook = new Excel.Workbook();
workbook.xlsx.readFile(fielPathXLS)
    .then(function (book) {
      var worksheet = workbook.getWorksheet('Sheet 1');
      var dobCol = worksheet.getColumn(68);
      //console.log(dobCol);
      dobCol.eachCell(function (cell, rowNumber) {
        if (rowNumber > 1) {
          link = cell.value;
          cell.value = {text: cell.value, hyperlink: link};
        }

      });
      return book;
    }).then(function (book) {
  workbook.xlsx.writeFile(fielPathXLS)
});