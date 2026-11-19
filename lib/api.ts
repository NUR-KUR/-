import {salons} from './catalog';
type User={userId:string}|null;
const catalog=new Map(salons.map(s=>[s.id,s]));
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
class Failure extends Error{constructor(public status:number,message:string){super(message)}}
const fail=(status:number,message:string):never=>{throw new Failure(status,message)};
const moscowToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function string(v:unknown,max:number,required=false){if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail(400,'Проверьте заполненные поля.');return (v as string).trim();}
function salonID(v:unknown){if(typeof v!=='string'||!catalog.has(v))fail(400,'Салон не найден.');return v as string;}
function dateValue(v:unknown){const d=string(v,10,true);if(!/^20\d\d-\d\d-\d\d$/.test(d)||Number.isNaN(Date.parse(d+'T12:00:00Z'))||new Date(d+'T12:00:00Z').toISOString().slice(0,10)!==d)fail(400,'Укажите корректную дату.');return d;}
function record(r:any){return {...r,services:JSON.parse(r.services),silent:!!r.silent,private:!!r.private,source:'self_reported'};}
export async function handleAPI(request:Request,db:D1Database,user:User):Promise<Response>{
 try{
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean),method=request.method,now=new Date().toISOString();
  if(!['GET','POST','PATCH','DELETE'].includes(method))return json({error:'Метод недоступен.'},405);
  if(method!=='GET'){
   if(request.headers.get('Origin')!==url.origin)fail(403,'Запрос отклонён. Откройте сайт заново.');
   if(method!=='DELETE'&&!request.headers.get('Content-Type')?.startsWith('application/json'))fail(415,'Нужен формат JSON.');
   if(Number(request.headers.get('Content-Length')||0)>12000)fail(413,'Слишком большой запрос.');
  }
  let body:any={};if(method==='POST'||method==='PATCH'){const raw=await request.text();if(raw.length>12000)fail(413,'Слишком большой запрос.');try{body=JSON.parse(raw)}catch{fail(400,'Некорректные данные.')}if(!body||Array.isArray(body)||typeof body!=='object')fail(400,'Некорректные данные.');}
  if(path[0]==='ratings'&&method==='GET'){
   const result=await db.prepare('SELECT salon, ROUND(AVG(rating),1) AS average, COUNT(*) AS count FROM reviews GROUP BY salon').all();return json({ratings:result.results});
  }
  if(path[0]==='reviews'&&method==='GET'){
   const salon=salonID(url.searchParams.get('salon'));const before=url.searchParams.get('before');if(before&&(!/^\d{4}-\d\d-\d\dT[\d:.Z]+~[a-f\d-]{36}$/.test(before)||before.length>70))fail(400,'Некорректная страница.');const [cursorDate,cursorId]=(before||'9999~zzzz').split('~');
   const rs=await db.prepare('SELECT r.id,r.rating,r.body,r.created,r.updated,m.nickname AS author FROM reviews r JOIN members m ON m.id=r.user_id WHERE r.salon=? AND (r.created<? OR (r.created=? AND r.id<?)) ORDER BY r.created DESC,r.id DESC LIMIT 21').bind(salon,cursorDate,cursorDate,cursorId).all();
   return json({reviews:rs.results.slice(0,20),next:rs.results.length>20?(rs.results[19] as any).created+'~'+(rs.results[19] as any).id:null});
  }
  if(!user)fail(401,'Войдите через ChatGPT, чтобы открыть единый профиль.');const uid=user!.userId;
  await db.prepare('INSERT OR IGNORE INTO members (id,code,nickname,created) VALUES (?,?,?,?)').bind(uid,'U-'+crypto.randomUUID().replace(/-/g,'').slice(0,12).toUpperCase(),'Участник Ultima',now).run();
  if(path[0]==='me'){
   if(method==='PATCH'){const name=string(body.nickname,40,true);await db.prepare('UPDATE members SET nickname=? WHERE id=?').bind(name,uid).run();}
   if(method==='DELETE'){await db.batch([db.prepare('DELETE FROM reviews WHERE user_id=?').bind(uid),db.prepare('DELETE FROM favorites WHERE user_id=?').bind(uid),db.prepare('DELETE FROM visits WHERE user_id=?').bind(uid),db.prepare('DELETE FROM members WHERE id=?').bind(uid)]);return json({ok:true});}
   if(!['GET','PATCH'].includes(method))fail(405,'Метод недоступен.');
   const [member,vs,fs]=await Promise.all([db.prepare('SELECT code,nickname,created FROM members WHERE id=?').bind(uid).first(),db.prepare('SELECT v.*,r.rating AS review_rating,r.body AS review_body FROM visits v LEFT JOIN reviews r ON r.visit_id=v.id WHERE v.user_id=? ORDER BY v.date DESC,v.created DESC').bind(uid).all(),db.prepare('SELECT salon FROM favorites WHERE user_id=?').bind(uid).all()]);
   const list=vs.results.map(record);return json({member,visits:list,favorites:fs.results.map((r:any)=>r.salon),stats:{visits:list.filter(v=>v.status==='completed').length,salons:new Set(list.filter(v=>v.status==='completed').map(v=>v.salon)).size,reviews:list.filter(v=>v.review_rating).length,planned:list.filter(v=>v.status==='planned').length}});
  }
  if(path[0]==='favorites'){
   const salon=salonID(path[1]);if(method==='POST')await db.prepare('INSERT OR IGNORE INTO favorites (user_id,salon,created) VALUES (?,?,?)').bind(uid,salon,now).run();else if(method==='DELETE')await db.prepare('DELETE FROM favorites WHERE user_id=? AND salon=?').bind(uid,salon).run();else fail(405,'Метод недоступен.');return json({ok:true});
  }
  if(path[0]==='visits'){
   if(method==='POST'){
    const salon=salonID(body.salon),date=dateValue(body.date),status=body.status==='completed'?'completed':body.status==='planned'?'planned':fail(400,'Некорректный статус.');
    if(status==='completed'&&date>moscowToday())fail(400,'Будущий визит нельзя отметить посещённым.');
    const time=string(body.time??'',5);if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))fail(400,'Проверьте время.');
    if(!Array.isArray(body.services)||!body.services.length||body.services.length>12||body.services.some((s:any)=>!catalog.get(salon)!.services.includes(s)))fail(400,'Выберите услуги салона.');
    const id=crypto.randomUUID();await db.prepare('INSERT INTO visits (id,user_id,salon,date,time,services,status,silent,private,notes,created) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,uid,salon,date,time,JSON.stringify([...new Set(body.services)]),status,body.silent===true?1:0,body.private===true?1:0,string(body.notes??'',300),now).run();return json({id},201);
   }
   const id=string(path[1],50,true),visit=await db.prepare('SELECT * FROM visits WHERE id=? AND user_id=?').bind(id,uid).first<any>();if(!visit)fail(404,'Визит не найден.');
   if(method==='DELETE'){await db.batch([db.prepare('DELETE FROM reviews WHERE visit_id=? AND user_id=?').bind(id,uid),db.prepare('DELETE FROM visits WHERE id=? AND user_id=?').bind(id,uid)]);return json({ok:true});}
   if(method==='PATCH'){if(!['completed','cancelled'].includes(body.status))fail(400,'Некорректный статус.');if(visit.status!=='planned')fail(409,'Статус этого визита уже изменён.');if(body.status==='completed'&&visit.date>moscowToday())fail(400,'Будущий визит нельзя отметить посещённым.');await db.prepare('UPDATE visits SET status=? WHERE id=? AND user_id=? AND status=?').bind(body.status,id,uid,'planned').run();return json({ok:true});}
   fail(405,'Метод недоступен.');
  }
  if(path[0]==='reviews'){
   const visitId=string(path[1],50,true),visit=await db.prepare('SELECT salon,status FROM visits WHERE id=? AND user_id=?').bind(visitId,uid).first<any>();if(!visit)fail(404,'Визит не найден.');if(visit.status!=='completed')fail(409,'Оценить можно только состоявшийся визит.');
   if(method==='DELETE'){await db.prepare('DELETE FROM reviews WHERE visit_id=? AND user_id=?').bind(visitId,uid).run();return json({ok:true});}
   if(!['POST','PATCH'].includes(method))fail(405,'Метод недоступен.');if(!Number.isInteger(body.rating)||body.rating<1||body.rating>5)fail(400,'Выберите оценку от 1 до 5.');
   await db.prepare('INSERT INTO reviews (id,visit_id,user_id,salon,rating,body,created,updated) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(visit_id) DO UPDATE SET rating=excluded.rating,body=excluded.body,updated=excluded.updated WHERE reviews.user_id=excluded.user_id').bind(crypto.randomUUID(),visitId,uid,visit.salon,body.rating,string(body.body??'',2000),now,now).run();return json({ok:true});
  }
  return json({error:'Раздел не найден.'},404);
 }catch(e:any){if(e instanceof Failure)return json({error:e.message},e.status);if(String(e?.message).includes('UNIQUE constraint'))return json({error:'Визит в этот салон на эту дату уже есть в истории.'},409);console.error('Ultima API error',e?.message);return json({error:'Не удалось сохранить данные. Попробуйте ещё раз.'},500);}
}
