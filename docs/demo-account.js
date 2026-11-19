(() => {
  'use strict';
  const KEY='ultima.pages.demo.v1';
  let memory=null;
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||memory}catch{return memory}};
  const save=data=>{memory=data;try{if(data)localStorage.setItem(KEY,JSON.stringify(data));else localStorage.removeItem(KEY)}catch{throw new Error('Браузер не разрешает сохранять демопрофиль. Разрешите локальное хранение данных.')}};
  const fail=(status,message)=>{const error=new Error(message);error.status=status;throw error};
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const salons=()=>window.ULTIMA_SALONS;
  const validSalon=id=>salons().find(s=>s.id===id)||fail(400,'Салон не найден.');
  const member=()=>load()||fail(401,'Создайте демопрофиль.');
  const snapshot=data=>{const visits=[...data.visits].sort((a,b)=>b.date.localeCompare(a.date)||b.created.localeCompare(a.created));const completed=visits.filter(v=>v.status==='completed');return {...data,visits,stats:{visits:completed.length,salons:new Set(completed.map(v=>v.salon)).size,reviews:completed.filter(v=>v.review_rating).length,planned:visits.filter(v=>v.status==='planned').length}}};
  window.ULTIMA_DEMO_CREATE=async()=>{if(load())return;save({member:{code:'DEMO-'+crypto.randomUUID().slice(0,8).toUpperCase(),nickname:'Гость Ultima',created:new Date().toISOString()},favorites:[],visits:[]})};
  window.ULTIMA_DEMO_API=async(path,method='GET',body={})=>{
    const url=new URL(path,'https://ultima.local/'),parts=url.pathname.slice(1).split('/'),section=parts[0],id=parts[1];
    if(section==='ratings'&&method==='GET'){
      const groups=new Map();for(const v of load()?.visits||[]){if(v.status==='completed'&&v.review_rating){const g=groups.get(v.salon)||[];g.push(v.review_rating);groups.set(v.salon,g)}}
      return {ratings:[...groups].map(([salon,list])=>({salon,average:Math.round(list.reduce((a,b)=>a+b,0)/list.length*10)/10,count:list.length}))};
    }
    if(section==='reviews'&&method==='GET'){
      const data=load(),salon=url.searchParams.get('salon');validSalon(salon);
      return {reviews:(data?.visits||[]).filter(v=>v.salon===salon&&v.status==='completed'&&v.review_rating).map(v=>({id:v.id,rating:v.review_rating,body:v.review_body||'',created:v.review_created||v.created,author:data.member.nickname})),next:null};
    }
    const data=member();
    if(section==='me'){
      if(method==='DELETE'){save(null);return {ok:true}}
      if(method==='PATCH'){const nickname=String(body.nickname||'').trim();if(!nickname||nickname.length>40)fail(400,'Укажите имя до 40 символов.');data.member.nickname=nickname;save(data)}
      return snapshot(data);
    }
    if(section==='favorites'){
      validSalon(id);if(method==='POST')data.favorites=[...new Set([...data.favorites,id])];else if(method==='DELETE')data.favorites=data.favorites.filter(s=>s!==id);else fail(405,'Метод недоступен.');save(data);return {ok:true};
    }
    if(section==='visits'){
      if(method==='POST'){
        const salon=validSalon(body.salon),date=body.date,status=body.status;
        if(!/^20\d\d-\d\d-\d\d$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)fail(400,'Укажите корректную дату.');
        if(!['completed','planned'].includes(status))fail(400,'Некорректный статус.');
        if(status==='completed'&&date>today())fail(400,'Будущий визит нельзя отметить посещённым.');
        if(body.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time))fail(400,'Проверьте время.');
        if(!Array.isArray(body.services)||!body.services.length||body.services.some(s=>!salon.services.includes(s)))fail(400,'Выберите услуги салона.');
        if(String(body.notes||'').length>300)fail(400,'Комментарий слишком длинный.');
        if(data.visits.some(v=>v.salon===salon.id&&v.date===date))fail(409,'Визит в этот салон на эту дату уже есть в истории.');
        const visit={id:crypto.randomUUID(),salon:salon.id,date,time:body.time||'',status,services:[...new Set(body.services)],silent:body.silent===true,private:body.private===true,notes:String(body.notes||''),created:new Date().toISOString(),source:'self_reported'};
        data.visits.push(visit);save(data);return {id:visit.id};
      }
      const visit=data.visits.find(v=>v.id===id);if(!visit)fail(404,'Визит не найден.');
      if(method==='DELETE')data.visits=data.visits.filter(v=>v.id!==id);
      else if(method==='PATCH'){if(visit.status!=='planned'||!['completed','cancelled'].includes(body.status))fail(409,'Статус визита уже изменён.');if(body.status==='completed'&&visit.date>today())fail(400,'Будущий визит нельзя отметить посещённым.');visit.status=body.status}
      else fail(405,'Метод недоступен.');save(data);return {ok:true};
    }
    if(section==='reviews'){
      const visit=data.visits.find(v=>v.id===id);if(!visit||visit.status!=='completed')fail(409,'Оценить можно только состоявшийся визит.');
      if(method==='DELETE'){delete visit.review_rating;delete visit.review_body;delete visit.review_created}
      else{if(!Number.isInteger(body.rating)||body.rating<1||body.rating>5)fail(400,'Выберите оценку от 1 до 5.');if(String(body.body||'').length>2000)fail(400,'Отзыв слишком длинный.');visit.review_rating=body.rating;visit.review_body=String(body.body||'');visit.review_created=new Date().toISOString()}
      save(data);return {ok:true};
    }
    fail(404,'Раздел не найден.');
  };
})();
