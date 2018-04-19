//Подключение зависимостей
const puppeteer = require('puppeteer');
const fs = require('fs');

//Главный метод
async function run() {
  let mainPage = 'СТРАНИЦА_С_ОБЪЯВЛЕНИЯМИ';//http://sindom.by/nedvizhimost-prodazha-ofisov-i-magazinov-c48

  let browser = await puppeteer.launch({
    headless: false
  });

  //Берём страницы браузера
  let pages = await browser.pages();
  let parseData = [];

  //Переход на ПЕРВУЮ страницу
  try {
    await pages[0].goto(mainPage + 'ОПЦИОНАЛЬНЫЕ_ПРИСТАВКИ_ИЛИ_ОКОНЧАНИЯ');//'.html'
  }
  catch (error) {
    await pages[0].goto(mainPage + 'ОПЦИОНАЛЬНЫЕ_ПРИСТАВКИ_ИЛИ_ОКОНЧАНИЯ');
  }

  //Вычисление последней страницы
  let lastPage = await pages[0].evaluate(() => {
    return document.querySelector('.last a').getAttribute('href').split('page')[1].split('.html')[0]; //Селектор последней страницы
  });
  console.log('Найдено страниц: '+lastPage);


  //Цикл перехода по страницам
  for (let pageIndex = 1; pageIndex < 5; pageIndex++) {//pageIndex < lastPage - последняя страница

    //Переход на старницу. Обычно mainPage и какие-то метки в url типа /page
    try {
      await pages[0].goto(mainPage + '/page' + pageIndex + '.html');
    }
    catch (error) {
      await pages[0].goto(mainPage + '/page' + pageIndex + '.html');
    }

    //Собираем все заголовки объявлений для переходов по ним
    const hrefs = await pages[0].evaluate(() => {
      let data = [];
      let elements = document.querySelectorAll('СЕЛЕКТОР_ЗАГОЛОВКА');

      //Проверка наф иктивные заголовки (иногда попадаются)
      for (var element of elements) {
        let href = element.getAttribute('href');
        if (href.includes('http:')) {
          data.push(href);
        }
      }
      return data;
    });
    console.log('Ссылки собраны на странице ' + pageIndex);


    //Открываем новые вкладки с полученными ранее ссылками
    for (let i = 0; i < hrefs.length; i++) {//hrefs.length
      let newPage = await browser.newPage();
      try {
        await newPage.goto(hrefs[i]);
      }
      catch (error) {
        try {
          await newPage.goto(hrefs[i]);
        }
        catch (error2) {
          await newPage.goto(hrefs[i]);
        }
      }
    }
    console.log('Вкладки открыты на странице ' + pageIndex);

    pages = await browser.pages();

    //Проходимся по вкладкам
    for (let i = 1; i < pages.length; i++) {
      //Собственно, парсинг обяъвления
      try {

        //Шаблон клика по элементу (например, кнопка "показать телефон")
        await pages[i].click('#phoneLink');
        await pages[i].waitForSelector('.phone');

        const result = await pages[i].evaluate(() => {

          //Метод для определения сегодняшней даты
          function getCurrentDate() {
            let currentTime = new Date();
            let day = currentTime.getDate();
            let month = currentTime.getMonth() + 1;
            let year = currentTime.getFullYear();
            if (day < 10) {
              day = '0' + day;
            }
            if (month < 10) {
              month = '0' + month;
            }

            return day + '.' + month + '.' + year;
          }
          //Для парсинга даты объявления, если она указана не в подходящем формате
          function parseDate(date) {
            if (date === 'Сегодня') {
              return getCurrentDate();
            }
            if (date === 'Вчера') {
              let currentTime = new Date();
              let day = currentTime.getDate() - 1;
              let month = currentTime.getMonth() + 1;
              let year = currentTime.getFullYear();
              if (day < 10) {
                day = '0' + day;
              }
              if (month < 10) {
                month = '0' + month;
              }

              return day + '.' + month + '.' + year;
            }
            else {
              date = date.split(' ');

              let months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',];

              let day = date[0];
              let month = months.indexOf(date[1].toLowerCase()) + 1;
              let year = date[2];

              return day + '.' + month + '.' + year;
            }
          }
          //Методы для парсинга сплошного текста и поиска в нём значений
          function checkForAddress(text, dataObj) {
            //Возможные варианты: кв.м, кв. м, кв м
            let regExpStreet = /(ул\.?|пр\.?|улица|проспект|переулок|пер\.?)[а-яё\s]*/ig;
            let regExpNumber = /(ул\.?|пр\.?|улица|проспект|переулок|пер\.?)[а-яё\s,\.]*(\d|-)*/ig;

            let element = '';
            let street = '';
            if(text.match(regExpStreet)){
              street = text.match(regExpStreet);

              if(street){
                element = street.toString().match(/(ул\.?|пр\.?|улица|проспект|переулок|пер\.?)/)[0];
              }
            }

            let houseNumber='';
            if(text.match(regExpNumber)){
              houseNumber = text.match(regExpNumber).toString().match(/\d+/ig);

              if(houseNumber){
                houseNumber = houseNumber.join('-');
              }
              else{
                houseNumber = '';
              }
            }

            dataObj['Элемент улично-дорожной сети'] = element;
            dataObj['Название элемента улично-дорожной сети'] = street.toString().replace(element, '').trim()
            dataObj['Номер дома'] = houseNumber;
          };
          function checkForSquare(text) {
            //Возможные варианты: кв.м, кв. м, кв м
            let regExp = /\d+([.,]?\d+)?\s?(кв\.?\s?м|га\.?|м\s?2|м\.?\s?кв)+/ig;
            let result = text.match(regExp);
            if (result) {
              let max = Number(result[0].replace(",", ".").match(/\d+([.,]?\d+)?/i)[0]);
              if (result) {
                result.forEach((string) => {
                  let number = (Number(string.replace(",", ".").match(/\d+([.,]?\d+)?/i)[0]));
                  if (number > max) {
                    max = number
                  }
                })
              }
              console.log(max);
              return max;
            }
            else {
              return '';
            }

          };
          function checkForNDS(text) {
            //Возможные варианты: С НДС, Без НДС
            let regExp = /(с|без)\sНДС/ig;
            let result = text.match(regExp);
            if (result) {
              return result;
            }
          };
          function checkForCommunications(text, dataObj) {
            let communication = {
              'Электроснабжение': [' электричество', ' освещени', ' электроснабжени'],
              'Холодное водоснабжение': [' водоснабжени', ' вода '],
              'Горячее водоснабжение': ['горяч'],
              'Водоотведение/канализация': [' канализаци', ' водоотведение '],
              'Отопление': [' отоплени', ' теплоуз',],
            };

            for (let key in communication) {
              communication[key].forEach((item) => {
                let regex = new RegExp("[^\.,:]*" + item + "[^\.,!]*", 'ig');
                if (text.match(regex)) {
                  dataObj[key] = 'Да';
                }
              });
            }


          };
          function checkForUse(text, dataObj) {
            let communication = {
              'Недвижимость связи и телекоммуникации': [
                'Автоматическая телефонная станция(АТС)',
                'Аппаратная',
                'Операторная',
                'Отделение почты',
                'Почта',
                'Почтамт',
                'Почтовое отделение',
                'Телефонная станция',
                'Узел связи',
                'Узел телерадиовещания',
                'Центр телерадиовещания',
                'Отделение связи',
              ],
              'Недвижимость транспортного назначения': [
                'Автовокзал',
                'Автозаправочная станция(АЗС)',
                'Автостанция',
                'Автостоянка',
                'Ангар',
                'Аэровокзал',
                'Аэропорт',
                'Билетная касса',
                'Весовая',
                'Гараж',
                'Гаражно - строительный кооператив(ГСК)',
                'Гаражный массив',
                'Депо',
                'Диагностическая станция',
                'Диспетчерская',
                'Железнодорожная пассажирская станция',
                'Железнодорожная станция',
                'Железнодорожный вокзал',
                'Железнодорожный узел',
                'Индивидуальный гараж',
                'Крытая автостоянка',
                'Мойка',
                'Паркинг',
                'Пассажирская станция',
                'Пассажирская станция водного транспорта',
                'Пассажирская станция городского(коммунального) транспорта',
                'Ремонтная мастерская',
                'Станция технического обслуживания(СТО)',
                'Шиномонтаж',
                'Аккумуляторная',
                'Арочник',
                'Бокс',
                'Дистанционная информационная система контроля',
                'Мастерская',
                'Навес для машин / техники',
                'Пункт технического обслуживания(ПТО)',
                'Хранилище техники',
              ],
              'Складская недвижимость и недвижимость оптовой торговли': [
                'Ангар',
                'Бункер',
                'Камера хранения',
                'Кладовая',
                'Ледник',
                'Логистический центр',
                'Навес',
                'Погреб',
                'Сарай',
                'Склад',
                'Холодильная камера',
                'Хранилище',
                'Клюшечник',
                'Пакгауз',
                'Сушильный навес',
              ],
              'Производственная недвижимость': [
                'Ангар',
                'Бойня',
                'Валяльня',
                'Галерея',
                'Гвоздильня',
                'Гончарня',
                'Док',
                'Завод',
                'Кожевня',
                'Комбинат',
                'Красильня',
                'Кузница',
                'Лаборатория',
                'Мастерская',
                'Мельница',
                'Пекарня',
                'Пилорама',
                'Полиграфия',
                'Производственный корпус',
                'Ремонтная мастерская',
                'Скотобойня',
                'Сушильная камера',
                'Техническая лаборатория',
                'Точильня',
                'Убойный цех',
                'Фабрика',
                'Хлебопекарня',
                'Цех',
                'Цех бортового питания',
                'Элеватор',
                'Производственная база',
                'Производственно-административное здание',
                'Производственно-бытовой корпус',
                'Производственное здание',
                'Производственно-лабораторный корпус',
                'Производственно-складское здание',
                'Производственно-хозяйственное здание',
                'Растворо - бетонный узел',
              ],
              'Сельскохозяйственная недвижимость': [
                'Амбар',
                'Бойня',
                'Бункер',
                'Животноводческая ферма',
                'Зерносушильный комплекс(ЗСК)',
                'Зернохранилище',
                'Инкубатор',
                'Молочная ферма',
                'Овощехранилище',
                'Оранжерея',
                'Парник',
                'Питомник',
                'Погреб',
                'Птичник',
                'Сарай',
                'Сельскохозяйственная ферма',
                'Скотобойня',
                'Сушильная камера',
                'Теплица',
                'Убойный цех',
                'Ферма',
                'Хлев',
                'Элеватор',
                'Гумно',
                'Дезбарьер',
                'Зерносклад',
                'Конюшня',
                'Кормоцех',
                'Коровник',
                'Навес',
                'Свинарник',
                'Склад',
                'Хранилище',
                'Шоха',
                'Яйцесклад',
              ],
              'Недвижимость энергетики': [
                'Артезианская скважина',
                'Вентиляционная камера',
                'Венткамера',
                'Водомерный узел',
                'Водонапорная башня',
                'Газораспределительная станция',
                'Газораспределительный пункт',
                'Градирня',
                'Дизельная',
                'Закрытое распределительное устройство(ЗРУ)',
                'Калориферная',
                'Компрессорная',
                'Котельная',
                'Очистные сооружения',
                'Насосная станция',
                'Общеподстанционный пункт управления(ОПУ)',
                'Станция водоочистки',
                'Станция подкачки',
                'Топочная',
                'Трансформаторная подстанция',
                'Холодильная камера',
                'Центральный тепловой пункт(ЦТП)',
                'Газорегуляторный пункт',
                'Зарядная',
                'Тепловой пункт',
              ],
              'Недвижимость иного или неопределенного назначения': [
                'База',
                'Блок',
                'Бункер',
                'Воинская часть',
                'Вышка',
                'Исправительная колония',
                'Корпус',
                'Крытая площадка',
                'Площадка',
                'Подсобка',
                'Подсобное помещение',
                'Противорадиационное укрытие(ПРУ)',
                'Убежище',
              ],
            };

            for (let key in communication) {
              communication[key].forEach((item) => {
                let regex = new RegExp("[^\.,:]*" + item.toLowerCase() + "[^\.,!]*", 'ig');
                if (text.toLowerCase().match(regex)) {
                  dataObj['Назначение'] = key;
                  dataObj['Наименование'] = item;
                }
              });
            }


          };
          function checkForTechChar(text) {
            let communications = ['полы', 'стен', 'фундамент'];
            let result = [];
            communications.forEach((item) => {
              let regex = new RegExp("[^\.,:]*" + item + "[^\.,!]*", 'ig');
              if (text.match(regex)) {
                result.push(text.match(regex)[0]);
              }
            });
            console.log(result);
            return result;
          };

          //Объект с данными нашего обяъвления
          let data = {};

          // let allTitle = '<h1>'+document.querySelectorAll('#singularBox > div.main-item > h1')[0].innerHTML+'</h1>';
          // let allInfo = document.querySelectorAll('#singularBox > div.main-item > div.block.desc')[0].innerHTML;
          // let allUsersAdv = document.querySelectorAll('#view_user_classifieds')[0].getAttribute('href');
          // allUsersAdv = '<a href="'+allUsersAdv+'">Все объявления пользователя</a>'
          //
          // let allPhotosArr = document.querySelectorAll('.imgmidl');
          // let allPhotos='';
          // allPhotosArr.forEach((item) => {
          //   allPhotos+='<img src="http://sindom.by'+item.getAttribute('src')+'">';
          // });
          //
          // data['HTML'] = allTitle+allInfo+allUsersAdv+'<hr>'+allPhotos;

          // let nodes = Array.prototype.slice.call(document.querySelectorAll('#singularBox > div.main-item > div.block.desc > dl')[0].children);
          //
          // nodes.forEach((node, index) => {
          //   if (node.innerText.includes('ID')) {
          //     data['№ Объявления'] = nodes[index + 1].innerText;
          //   }
          //   if (node.innerText.includes('Контакт')) {
          //     data['Контактное лицо'] = nodes[index + 1].innerText;
          //   }
          //   if (node.innerText.includes('Цена')) {
          //     data['Цена предложения от'] = node.innerText.replace(/\D/g, "");
          //     data['Цена предложения до'] = node.innerText.replace(/\D/g, "");
          //   }
          // });


          //Использование методов выше
          data['Дата обновления'] = parseDate(document.querySelectorAll('.created')[0].innerText.split(',')[0]);
          data['Дата парсинга'] = getCurrentDate();

          //Шаблон доавбления данных
          data['Контактные данные'] = document.querySelectorAll('.phone')[0].innerText;

          let title = document.querySelectorAll('#singularBox > div.main-item > h1')[0].innerText.split('\n')[0];
          data['Описание над объявлением'] = title;
          checkForUse(title, data);
          checkForAddress(title, data);

          return data;
        });

        //Шаблон построения названия страницы и сохранения страницы
        let pageName = result['№ Объявления'] + '_' + result['Дата обновления'] + '.html';
        result['Ссылка на HTML-страницу'] = 'HTMLs/' + pageName.toString();
        parseData.push(result);
        var fs = require('fs');
          fs.writeFile('result/HTMLs/' + pageName, result['HTML'], 'utf8', () => {
        });
        delete result['HTML'];

      } catch (error) {
        console.log("Ошибка при просмотре\nСтраница:ссылка " + pageIndex + ':' + i + '\n' + error);
      }
    }
    //Закрытие всех вкладок, кроме первой
    for (let i = 1; i < pages.length; i++) {
      try {
        pages[i].close();
      }
      catch (error) {
      }
    }
  }

  browser.close();
  return parseData;
}

run().then((value) => {
  //Сохранение в файл. ПРИМЕЧАНИЕ: Если в файле будет найдена запись стаким же значением поля "№ Объявления", распарсенная запись будет проигнорирована
  let json = JSON.stringify(value);
  let filePath = 'result/result.json';
  let encoding = 'utf8';

  fs.readFile(filePath, encoding, function readFileCallback(err, data) {
    let obj;
    if (err) {
      console.log(err);
    } else {
      obj = JSON.parse(data);
      value.forEach((resultData) => {
        let isClone = false;
        obj.forEach((fileData) => {
          if (fileData['№ Объявления'] === resultData['№ Объявления']) {
            isClone = true;
          }
        });
        if (!isClone) {
          obj.push(resultData);
        }
      });
      json = JSON.stringify(obj); //convert it back to json
      fs.writeFile(filePath, json, encoding, () => {
      });
    }
  });
});