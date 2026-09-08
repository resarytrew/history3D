import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pistolControlViews } from './pistol-control-views'
import { writeArtifact } from './write-artifact'

const out=resolve('docs/verification/russian-pistol-1798-1804')
const before=JSON.parse(await readFile(resolve(out,'head-before/metrics.json'),'utf8'))
const after=JSON.parse(await readFile(resolve(out,'metrics.json'),'utf8'))
const sources='../../../assets/source-references/pistol-1798-1804/'
const picture=(src:string,caption:string)=>`<figure><a href="${src}"><img loading="lazy" src="${src}" alt="${caption}"></a><figcaption>${caption}</figcaption></figure>`
const comparisons=[
  {name:'lock',title:'Крупный план замка',source:'detail-3.jpg',note:'Верхняя головка заново построена как округлый объём вокруг наклонной оси: узкая шейка, расширенная верхушка, прорезь с отдельными стенками и дном. Дополнительные ракурсы 27 и 28 показывают глубину. Нейтральное железо без искусственного старения.'},
  {name:'right',title:'Общий силуэт справа',source:'right.jpg',note:'Общий профиль сохранён от предыдущего прохода. Здесь видны локальные изменения рельефа замка в масштабе всего предмета.'},
  {name:'left',title:'Левый вид и ответная накладка',source:'left.jpg',note:'Сохранены левый профиль, накладка и ранее принятая регистрация камеры. Вид помогает оценить объём верхней головки с обратной стороны.'},

]
const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Музейный пистолет · сравнение геометрии</title>
<style>*{box-sizing:border-box}body{margin:0;background:#eeeae2;color:#282a28;font:16px/1.6 system-ui,sans-serif}main{max-width:1600px;margin:auto;padding:32px}h1{font:40px/1.2 Georgia,serif}h2{font:28px Georgia,serif}a{color:#36594d}p{max-width:1100px}section{margin:40px 0;border-top:1px solid #b6b5ad;padding-top:18px}.comparison{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}figure{margin:0;background:#e3dfd5}img{display:block;width:100%;height:auto}figcaption{padding:10px 14px;font-size:13px}.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.overlay{position:relative;max-width:1200px;margin-top:18px}.overlay img+img{position:absolute;inset:0;opacity:.5}.slider{display:flex;align-items:center;gap:16px;max-width:800px;padding:16px 0}.slider input{flex:1}table{border-collapse:collapse}td,th{padding:10px 28px 10px 0;text-align:left;border-bottom:1px solid #beb9ae}@media(max-width:800px){main{padding:20px}.comparison,.gallery{grid-template-columns:1fr}h1{font-size:30px}}</style>
<main><h1>Статическая музейная реконструкция<br>Сопоставление с конкретным экземпляром</h1>
<p>Главные ориентиры — три фотографии, предоставленные пользователем: оба боковых вида и крупный план замка. Рис. 128 Маковской относится к базовому типу и не заменяет очертания данного предмета. Последний проход сосредоточен на объёме и перепадах наружных поверхностей крупного плана. Материал железа замка нейтральный. Тесты и мобильная адаптация в этом проходе не выполнялись. <a href="profile-comparison.json">Проверка выбранных контурных точек</a>.</p>
<p>Рендеры для наложения используют ортографическую камеру и привязку к плоскости правой фотографии; для левого снимка применены отражённый ракурс, наклон камеры 0,86° и вертикальное смещение 7,5 пикселя. Эти одинаковые для «до / после» параметры записаны в photoRegistration.ts; изображение не деформируется. Фотографии сняты с небольшой перспективой, поэтому наложение не является обмером или оценкой точности в процентах. Контрольные крупные планы ниже кадрируются по габаритам каждой версии, чтобы детали не обрезались.</p>
<p><a href="../../PISTOL_REFINEMENT_REPORT.md">Отчёт и ограничения</a> · <a href="head-review.json">Запись текущего визуального прохода</a> · <a href="acceptance-audit.json">Рендеры и контрольные суммы</a> · <a href="/?exhibit=russian-pistol-1798-1804">Экспонат</a></p>
<table><tr><th>Метрика</th><th>До перестройки головки</th><th>После</th></tr><tr><td>Треугольники</td><td>${before.triangles}</td><td>${after.triangles}</td></tr><tr><td>Meshes</td><td>${before.meshes}</td><td>${after.meshes}</td></tr><tr><td>GLB, байты</td><td>${before.bytes}</td><td>${after.bytes}</td></tr></table>
${comparisons.map(({name,title,source,note})=>`<section><h2>${title}</h2><p>${note}</p><div class="comparison">${picture(sources+source,'Музейный оригинал')}${picture(`head-before/photo-${name}.png`,'До перестройки головки')}${picture(`photo-${name}.png`,'После')}</div><div class="overlay"><img src="${sources+source}" alt="Источник"><img id="overlay-${name}" src="photo-${name}.png" alt="Рендер поверх источника"></div><label class="slider">Фото<input data-overlay="overlay-${name}" type="range" min="0" max="100" value="50" aria-label="Прозрачность рендера: ${title}">Модель</label></section>`).join('')}
<section><h2>${pistolControlViews.length} контрольных ракурсов</h2><div class="gallery">${pistolControlViews.map(v=>picture(`${v.name}.png`,v.name==='22-jaws-flint'?'22 · Пустые губки и головка винта':v.name)).join('')}</div></section>
<p>Неизвестные толщины, сечения и невидимые поверхности остаются авторской реконструкцией. Древесные PBR-карты сохранены из предыдущей версии: Искусственное старение железа отключено. Начертание надписи приближённое; индивидуальные повреждения оригинала не скопированы. Стопроцентное сходство не заявляется.</p>
<p>Фотографии: Музей отечественной военной истории, Падиково. Они служат источниками сравнения, не входят в GLB и не перелицензируются под MIT. <a href="makovskaya-fig128.png">Маковская, рис. 128</a>.</p></main>
<script>document.querySelectorAll('[data-overlay]').forEach(input=>input.addEventListener('input',()=>{document.getElementById(input.dataset.overlay).style.opacity=input.value/100}))</script></html>`
await writeArtifact(resolve(out,'refinement.html'),html)
console.log(`Comparison gallery: ${resolve(out,'refinement.html')}`)
