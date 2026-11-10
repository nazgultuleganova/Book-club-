import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { books } from './books';
import './style.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const voterKey = 'club-voter-id';
const voterId = localStorage.getItem(voterKey) || (() => { const id = crypto.randomUUID(); localStorage.setItem(voterKey,id); return id; })();

function App(){
  const [selected,setSelected] = useState(null);
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState('Все');
  const [ratings,setRatings] = useState({});
  const [myVotes,setMyVotes] = useState({});
  const [randomBook,setRandomBook] = useState(null);
  const [toast,setToast] = useState('');
  const [tab,setTab] = useState('catalog');

  useEffect(()=>{ document.title='Между строк — книжный клуб'; loadRatings(); },[]);
  async function loadRatings(){
    if(!supabase) return;
    const {data,error}=await supabase.from('book_ratings').select('book_id,rating');
    if(error){ console.error(error); return; }
    const grouped={}; data.forEach(v=>{(grouped[v.book_id] ||= []).push(v.rating)});
    const result={}; Object.entries(grouped).forEach(([id,arr])=>result[id]={avg:arr.reduce((a,b)=>a+b,0)/arr.length,count:arr.length});
    setRatings(result);
    const {data:mine}=await supabase.from('book_ratings').select('book_id,rating').eq('voter_id',voterId);
    const own={}; (mine||[]).forEach(v=>own[v.book_id]=v.rating); setMyVotes(own);
  }
  async function rate(bookId,rating){
    if(!supabase){setToast('Подключите Supabase, чтобы общий рейтинг сохранялся для всех.');return;}
    const {error}=await supabase.from('book_ratings').upsert({book_id:bookId,voter_id:voterId,rating},{onConflict:'book_id,voter_id'});
    if(error){setToast('Не удалось сохранить оценку. Попробуйте ещё раз.');return;}
    setToast('Оценка сохранена — спасибо!');
    await loadRatings();
  }
  const categories=['Все',...new Set(books.map(b=>b.category.split(' · ')[0]))];
  const filtered=useMemo(()=>books.filter(b=>(filter==='Все'||b.category.startsWith(filter)) && (b.title+' '+b.author+' '+b.vibes.join(' ')).toLowerCase().includes(query.toLowerCase())),[filter,query]);
  function chooseRandom(){const pool=filtered.length?filtered:books;setRandomBook(pool[Math.floor(Math.random()*pool.length)]);}
  const avg=(id)=>ratings[id]?.avg ? ratings[id].avg.toFixed(1).replace('.',',') : '—';
  return <div className="page">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark">мс</span><span>между строк<small>книжный клуб</small></span></a><nav><button onClick={()=>{setTab('catalog');window.scrollTo({top:0,behavior:'smooth'})}}>Книги</button><a href="#about">О клубе</a><a href="#monthly">Новые поступления</a></nav><span className="top-note">Читаем, чтобы жить чуть внимательнее</span></header>
    <main>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow">НЕБОЛЬШОЙ КЛУБ БОЛЬШИХ ИСТОРИЙ</div><h1>Книги, в которых<br/><em>узнаёшь себя.</em></h1><p>Читаем о любви и свободе, дружбе и выборе, смешном и сложном. Без строгих жанровых рамок — с любопытством к женскому опыту и к жизни во всех её оттенках.</p><div className="hero-actions"><button className="primary" onClick={chooseRandom}>Выбрать книгу за нас ↗</button><a className="text-link" href="#catalog">Смотреть весь список ↓</a></div></div>
        <div className="hero-art"><div className="sun"></div><div className="art-note">a little<br/>more story</div><div className="book-stack"><div className="book book-one">READ<br/>WOMEN<br/>READ</div><div className="book book-two">the art<br/>of living</div><div className="flower">✳</div></div><div className="hero-caption">том I · истории о нас</div></div>
      </section>
      <section className="manifesto" id="about"><div className="section-kicker">ЗАЧЕМ МЫ ЗДЕСЬ</div><h2>Не список обязательного чтения.<br/><em>А место для хороших историй.</em></h2><p>Мы читаем классику и современную прозу, романы, повести и рассказы. Нам интересны героини и их миры, отношения и общество, частная жизнь и большие перемены. Фем-оптика — один из способов смотреть на текст, но не клетка для выбора книг.</p><div className="manifesto-stamps"><span>любопытство</span><span>разговор</span><span>удовольствие</span><span>своя оптика</span></div></section>
      {randomBook && <section className="random-result"><div><div className="section-kicker">КНИЖНАЯ РУЛЕТКА ВЫБРАЛА</div><h2>{randomBook.title}</h2><p>{randomBook.author} · {randomBook.year}</p></div><button onClick={()=>setSelected(randomBook)}>Открыть книгу ↗</button><button className="quiet" onClick={chooseRandom}>Ещё раз ↻</button></section>}
      <section className="catalog" id="catalog"><div className="catalog-head"><div><div className="section-kicker">НАША ПОЛКА</div><h2>Все книги <span>({books.length})</span></h2></div><div className="search-wrap"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Название, автор или настроение…"/></div></div>
        <div className="filters">{categories.map(c=><button className={filter===c?'active':''} key={c} onClick={()=>setFilter(c)}>{c}</button>)}</div>
        <div className="book-grid">{filtered.map((b,i)=><button className="book-card" key={b.id} onClick={()=>setSelected(b)}><div className={'cover cover-'+(i%6)}><span className="cover-small">{b.category.split(' · ')[0]}</span><span className="cover-title">{b.title}</span><span className="cover-author">{b.author}</span><span className="cover-ornament">{['✳','❧','✺','◌','✴','❋'][i%6]}</span></div><div className="book-meta"><div><h3>{b.title}</h3><p>{b.author}</p></div><div className="rating-mini"><span>★</span> {avg(b.id)} <small>({ratings[b.id]?.count||0})</small></div></div></button>)}</div>
        {filtered.length===0&&<p className="empty">Ничего не нашлось. Попробуйте другой запрос.</p>}
      </section>
      <section className="monthly" id="monthly"><div className="monthly-ornament">✳</div><div><div className="section-kicker">ПОПОЛНЕНИЕ ПОЛКИ</div><h2>Каждый месяц —<br/><em>новая история.</em></h2><p>Новые книги будем добавлять небольшими тематическими подборками: по настроению, темам и литературному родству с тем, что уже есть на полке. Это редакционная рубрика, а не автоматическая лента.</p></div><div className="monthly-side"><span>01 / НАСТРОЕНИЕ</span><span>02 / ТЕМЫ</span><span>03 / ПОХОЖИЕ ИСТОРИИ</span><small>скоро на этой странице</small></div></section>
      <footer><a className="brand" href="#"><span className="brand-mark">мс</span><span>между строк<small>книжный клуб</small></span></a><span>Сделано для чтения, разговоров и нас.</span><span>© 2026</span></footer>
    </main>
    {selected&&<div className="overlay" onClick={()=>setSelected(null)}><article className="detail" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}>×</button><div className="detail-top"><div className="detail-cover"><span>{selected.title}</span><small>{selected.author}</small></div><div className="detail-info"><div className="section-kicker">{selected.category}</div><h2>{selected.title}</h2><p className="detail-author">{selected.author} · {selected.year}</p><p>{selected.description}</p><div className="vibes">{selected.vibes.map(v=><span key={v}>{v}</span>)}</div></div></div><div className="detail-section"><h3>Об авторе</h3><p>{selected.author} — {authorBio(selected.author)}</p></div><div className="detail-section"><h3>Экранизации</h3><p>{selected.adaptations}</p></div><div className="detail-section rating-section"><div><h3>Оценка книжного клуба</h3><p>{ratings[selected.id]?.count ? `Средняя оценка ${avg(selected.id)} · ${ratings[selected.id].count} голос(а)` : 'Пока нет оценок. Станьте первыми!'}</p></div><div className="stars">{[1,2,3,4,5].map(n=><button className={myVotes[selected.id]>=n?'chosen':''} key={n} onClick={()=>rate(selected.id,n)} aria-label={`Оценить на ${n}`}>★</button>)}</div></div><div className="detail-section links"><h3>Почитать и посмотреть</h3><a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(selected.title+' '+selected.author+' отзывы ЛитРес')}`}>Найти отзывы и издания ↗</a><a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(selected.title+' '+selected.author+' экранизация')}`}>Найти кадры и экранизации ↗</a></div></article></div>}
    {toast&&<div className="toast" onClick={()=>setToast('')}>{toast} <b>×</b></div>}
    {!supabase&&<div className="dev-note">Демо-режим: общий рейтинг включится после настройки Supabase.</div>}
  </div>;
}
function authorBio(name){
 const bios={
 'Элизабет Гилберт':'американская писательница и журналистка, работающая в жанрах художественной и документальной прозы.',
 'Луиза Мэй Олкотт':'американская писательница XIX века, известная прежде всего романом «Маленькие женщины».',
 'Джейн Остин':'английская писательница рубежа XVIII–XIX веков, мастер социального романа и тонкой иронии.',
 'Александр Пушкин':'русский поэт и прозаик, одна из центральных фигур русской литературы.',
 'Хелен Филдинг':'британская писательница и журналистка, создательница героини Бриджит Джонс.',
 'Гюстав Флобер':'французский писатель-реалист, известный вниманием к стилю и психологической точностью.',
 'Антон Чехов':'русский писатель и драматург, мастер короткого рассказа и психологической детали.',
 'Сомерсет Моэм':'английский прозаик и драматург, известный ясным стилем, иронией и наблюдениями за человеческими характерами.',
 'Эллисон Пирсон':'британская журналистка и писательница, автор романов о современной жизни и работе.',
 'Татьяна Браткова':'автор сборника, библиографические сведения которого нужно сверить с выбранным изданием.',
 'Софи Кинселла':'британская писательница, автор популярных романтических комедий и серии о шопоголике.',
 'Михаил Булгаков':'русский и советский писатель и драматург, автор сатирической и философской прозы.',
 'Александр Островский':'русский драматург, чьи пьесы исследуют общество, семейные отношения и власть денег.',
 'Иван Тургенев':'русский писатель XIX века, автор романов и повестей о любви, поколениях и переменах.',
 'Николай Лесков':'русский писатель XIX века, известный самобытным языком и вниманием к нравственным конфликтам.',
 'Маргарет Митчелл':'американская писательница, автор романа «Унесённые ветром».'
 }; return bios[name]||'писатель, чьё творчество представлено в нашей книжной подборке.';
}
createRoot(document.getElementById('root')).render(<App/>);
