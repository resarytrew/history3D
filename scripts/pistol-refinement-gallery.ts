import { access, copyFile, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pistolControlViews } from './pistol-control-views'

const out=resolve('docs/verification/russian-pistol-1798-1804')
try { await access(resolve(out,'makovskaya-fig128.png')) }
catch { await copyFile('artifacts/references/makovskaya-page-183.png',resolve(out,'makovskaya-fig128.png')) }
const before=JSON.parse(await readFile(resolve(out,'refinement-before/metrics.json'),'utf8'))
const after=JSON.parse(await readFile(resolve(out,'metrics.json'),'utf8'))
const comparisons=[
  {title:'Замок целиком',view:'09-lock',crop:[290,25,350,220],note:'Снижена визуальная масса наружных деталей. Работоспособность механизма не проверялась.'},
  {title:'Курок',view:'10-cock',crop:[361,32,126,187],note:'Более тонкая шейка и компактное основание; поперечный объём сохранён.'},
  {title:'Губки и кремень',view:'22-jaws-flint',crop:[393,54,92,97],note:'Губки короче и тоньше, головка винта проще. Кремень — авторское дополнение; на фото музейного прототипа его нет.'},
  {title:'Батарея',view:'23-frizzen',crop:[499,44,96,159],note:'Наклонённый наружный силуэт вместо высокой вертикальной пластины. Поза статическая.'},
  {title:'Полка',view:'24-pan',crop:[443,131,94,66],note:'Мелкая асимметричная выемка вместо глубокой чашки. Вид сверху по рисунку не подтверждён.'},
  {title:'Замочная доска',view:'26-lockplate',crop:[279,135,355,109],note:'Контур ниже и компактнее; уменьшены округлый затылок и переднее продолжение.'},
  {title:'Боковая накладка',view:'14-sideplate',crop:[600,650,348,86],note:'Площадь поверхности уменьшена на 18,7%. Сохранена змеевидная форма; убран прямоугольный след в дереве.'},
  {title:'Окончание рукояти',view:'19-buttcap',crop:[63,234,150,172],note:'Боковые оболочки уменьшены примерно на 45% по площади. Сам силуэт дерева сохранён.'},
  {title:'Спусковая скоба',view:'15-trigger',crop:[296,202,145,105],note:'Небольшая асимметрия контура и сечения. Спуск сохранён: недостаточно оснований для дальнейшей правки.'},
] as const
const picture=(src:string,caption:string)=>`<figure><a href="${src}"><img loading="lazy" src="${src}" alt="${caption}"></a><figcaption>${caption}</figcaption></figure>`
const rows=comparisons.map(({title,view,crop,note})=>`<section><h2>${title}</h2><p>${note}</p><div class="comparison"><figure><svg role="img" aria-label="Маковская, рис. 128: ${title}" viewBox="${crop.join(' ')}"><image href="makovskaya-fig128.png" width="1888" height="1336"/></svg><figcaption>Маковская · рис. 128 · фрагмент</figcaption></figure>${picture(`refinement-before/${view}.png`,'Текущая модель до этого прохода')}${picture(`${view}.png`,'Уточнённая модель')}</div></section>`).join('\n')
const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Пистолет 1798/1804 · визуальная доработка</title>
<style>*{box-sizing:border-box}body{margin:0;background:#eeeae2;color:#282a28;font:16px/1.6 system-ui,sans-serif}main{max-width:1600px;margin:auto;padding:32px}h1{font:42px/1.15 Georgia,serif;max-width:900px}h2{font:29px Georgia,serif}a{color:#36594d}p{max-width:1050px}section{margin:40px 0;border-top:1px solid #b6b5ad;padding-top:18px}.comparison{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}figure{margin:0;background:#e3dfd5}img,svg{display:block;width:100%;height:270px;object-fit:contain}figcaption{padding:10px 14px;font-size:13px}.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.gallery img{height:auto}.reference img{height:auto;max-height:850px}.notice{border-left:3px solid #8b704c;padding:14px 20px;background:#e4ded2}table{border-collapse:collapse}td,th{padding:10px 28px 10px 0;text-align:left;border-bottom:1px solid #beb9ae}@media(max-width:800px){main{padding:20px}.comparison,.gallery{grid-template-columns:1fr}h1{font-size:32px}}</style>
<main><h1>Пистолет 1798/1804<br>Точечная визуальная доработка</h1><p>Сравнение наружного облика: источник → версия на начало задачи → уточнённый GLB. Основная длина, геометрия ствола, силуэт ложи и древесные карты сохранены.</p>
<p class="notice">Это статическая музейная визуализация. Пункты о работоспособной кинематике, воспламенении и функциональном согласовании винтов не приняты. Обмер конкретного экземпляра и независимая экспертиза отсутствуют.</p>
<p>Рисунок 128 показывает базовый образец 1798 года. Длину его ствола нельзя сравнивать с укороченной моделью. Фрагменты источника масштабированы отдельно для чтения формы; рендеры «до / после» используют одинаковые камеры и свет, без скрытия соседних деталей.</p>
<p><a href="../../PISTOL_REFINEMENT_REPORT.md">Отчёт</a> · <a href="refinement-audit.json">Проверка сохранённых частей</a> · <a href="metrics.json">Метрики</a> · <a href="/?exhibit=russian-pistol-1798-1804">Открыть экспонат в приложении</a></p>
<table><tr><th>Метрика</th><th>До</th><th>После</th></tr><tr><td>Треугольники</td><td>${before.triangles}</td><td>${after.triangles}</td></tr><tr><td>Meshes</td><td>${before.meshes}</td><td>${after.meshes}</td></tr><tr><td>Draw calls, hero</td><td>${before.calls}</td><td>${after.calls}</td></tr><tr><td>GLB, байты</td><td>${before.bytes}</td><td>${after.bytes}</td></tr></table>
${rows}<section><h2>Все контрольные ракурсы</h2><div class="gallery">${pistolControlViews.map(v=>picture(`${v.name}.png`,v.name)).join('')}</div></section>
<section><h2>Источник без обрезки</h2><figure class="reference"><a href="makovskaya-fig128.png"><img loading="lazy" src="makovskaya-fig128.png" alt="Маковская, рис. 128, полная страница"></a><figcaption>Л. К. Маковская, 1990, рис. 128, PDF страница 183. Репродукция для сравнения, не часть MIT-лицензии кода.</figcaption></figure><p><a href="https://militera.org/books/pdf/tw/makovskaya_lk01.pdf">Маковская, каталог</a> · <a href="https://www.reenactor.ru/ARH/PDF/Yrkevich_10.pdf">Юркевич, с. 679</a> · <a href="https://www.kskdivniy.ru/museum/eksponaty/pistolet-kirasirskiy-i-dragunskiy-ukorochennyy-1798-1804-gg/">Музейный прототип, Тула, 1803</a></p></section></main></html>`
await writeFile(resolve(out,'refinement.html'),html)
console.log(`Comparison gallery: ${resolve(out,'refinement.html')}`)
