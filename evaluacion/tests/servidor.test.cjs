const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const code = 'ABCDEFGH2345';
const hash = crypto.createHash('sha256').update(code).digest('hex');
function fixture() {
  let now = Date.parse('2026-09-28T13:10:00-03:00');
  const opens = '2026-09-28T13:10:00-03:00', closes = '2026-09-28T17:20:00-03:00';
  const data = {id:'test',opens,closes,students:{[hash]:'Estudiante de prueba'},html:'test',practical:{title:'Práctico'},parts:Array.from({length:4},(_,part)=>({title:'M'+(part+1),minutes:35,questions:Array.from({length:10},(_,i)=>({id:'q'+i,topic:'Tema',prompt:'Pregunta '+i,type:'short',accept:['sesión'],feedback:'Explicación',source:'https://example.org'}))}))};
  const props = new Map([['DATA_FILE_ID','private']]);
  const ctx = vm.createContext({Date:class extends Date{static now(){return now;}},console,Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()]},DriveApp:{getFileById:()=>({getBlob:()=>({getDataAsString:()=>JSON.stringify(data)})})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../servidor.gs'),'utf8'),ctx);
  return {data,ctx,props,call:(action='status',extra={})=>ctx.exam({code,action,...extra}),time:v=>now=typeof v==='number'?v:Date.parse(v),now:()=>now};
}
const answers = count => Object.fromEntries(Array.from({length:count},(_,i)=>['q'+i,' SESION ']));
test('panel docente exige PIN, limita intentos y no inicia exámenes',()=>{
  const f=fixture(), pin='test-pin'; f.data.teacherHash=crypto.createHash('sha256').update(pin).digest('hex');
  for(let i=0;i<5;i++) assert.throws(()=>f.ctx.teacherReport('incorrecto'),/incorrecto/);
  assert.throws(()=>f.ctx.teacherReport(pin),/bloqueado/);
  f.time(f.now()+900001);
  const report=f.ctx.teacherReport(pin);
  assert.equal(report.students.length,1); assert.equal(report.students[0].parts[0].status,'ready');
  assert.equal([...f.props.keys()].filter(k=>k.startsWith('attempt:')).length,0);
  assert.equal(JSON.stringify(report).includes(f.data.teacherHash),false);
});
test('panel refleja entrega y vencimiento sin alterar respuestas',()=>{
  const f=fixture(), pin='test-pin'; f.data.teacherHash=crypto.createHash('sha256').update(pin).digest('hex');
  f.call('start',{part:0}); f.call('save',{part:0,revision:0,answers:answers(7)});
  f.time(f.now()+36*60000); const p=f.ctx.teacherReport(pin).students[0].parts[0];
  assert.equal(p.status,'submitted'); assert.equal(p.result.points,7); assert.equal(p.result.passed,true);
});
test('rechaza código incorrecto, acción y parte inválidas',()=>{const f=fixture();assert.throws(()=>f.ctx.exam({code:'ZZZZZZZZZZZZ'}),/incorrecto/);assert.throws(()=>f.call('hack'),/Acción/);assert.throws(()=>f.call('start',{part:8}),/Parte/);});
test('apertura y secuencia se controlan en servidor',()=>{const f=fixture();f.time('2026-09-28T13:09:59-03:00');assert.throws(()=>f.call('start',{part:0}),/habilita/);f.time('2026-09-28T13:10:00-03:00');assert.throws(()=>f.call('start',{part:1}),/anterior/);const s=f.call('start',{part:0});assert.equal(s.parts[0].status,'active');assert.equal(s.parts[0].questions[0].accept,undefined);assert.equal(s.parts[0].questions[0].feedback,undefined);assert.equal(s.practical,null);});
test('retoma en otro cliente sin reiniciar el tiempo; rechaza escritura atrasada',()=>{const f=fixture();const a=f.call('start',{part:0});f.time(f.now()+300000);const b=f.call('save',{part:0,revision:0,answers:answers(3)});assert.equal(b.parts[0].deadline,a.parts[0].deadline);assert.throws(()=>f.call('save',{part:0,revision:0,answers:answers(2)}),/CONFLICT/);const c=f.call('start',{part:0});assert.equal(c.parts[0].revision,1);assert.equal(Object.keys(c.parts[0].answers).length,3);});
test('vencimiento entrega solo respuestas recibidas a tiempo y no admite reintento',()=>{const f=fixture();let s=f.call('start',{part:0});f.call('save',{part:0,revision:0,answers:answers(6)});f.time(s.parts[0].deadline);s=f.call('submit',{part:0,revision:1,answers:answers(10)});assert.equal(s.parts[0].result.points,6);assert.equal(s.parts[0].reason,'tiempo');assert.equal(f.call('start',{part:0}).parts[0].status,'submitted');assert.equal(f.call('submit',{part:0,revision:0,answers:answers(10)}).parts[0].result.points,6);});
test('cierre general recorta una parte iniciada tarde',()=>{const f=fixture();f.time('2026-09-28T17:15:00-03:00');const s=f.call('start',{part:0});assert.equal(s.parts[0].deadline,Date.parse(f.data.closes));f.time(f.data.closes);assert.equal(f.call().parts[0].status,'submitted');assert.throws(()=>f.call('start',{part:1}),/terminó/);});
test('un módulo bajo 70 impide aprobado integral aunque el promedio sea alto; práctico sí se habilita',()=>{const f=fixture();let s;[6,10,10,10].forEach((n,i)=>{f.call('start',{part:i});s=f.call('submit',{part:i,revision:0,answers:answers(n)});});assert.equal(s.total.percent,90);assert.equal(s.total.passed,false);assert.equal(s.parts[0].result.passed,false);assert.equal(s.practical.title,'Práctico');});
test('70 exacto aprueba cada parte y total; normaliza acentos, espacios y mayúsculas',()=>{const f=fixture();let s;for(let i=0;i<4;i++){f.call('start',{part:i});s=f.call('submit',{part:i,revision:0,answers:answers(7)});}assert.equal(s.total.percent,70);assert.equal(s.total.passed,true);assert.equal(s.parts[0].result.review[0].ok,true);});
test('un valor redondeado no alcanza para aprobar',()=>{const f=fixture();f.data.parts[0].questions=Array.from({length:23},(_,i)=>({id:'q'+i,type:'short',accept:['sesión']}));f.call('start',{part:0});const s=f.call('submit',{part:0,revision:0,answers:answers(16)});assert.equal(Math.round(s.parts[0].result.percent),70);assert.equal(s.parts[0].result.passed,false);});
test('ignora IDs ajenos, textos excesivos y opciones inventadas',()=>{const f=fixture();f.data.parts[0].questions[0].type='mc';f.data.parts[0].questions[0].options=['sesión','red'];f.call('start',{part:0});const s=f.call('save',{part:0,revision:0,answers:{q0:'otra',q1:'a'.repeat(121),ajena:'sesión'}});assert.equal(Object.keys(s.parts[0].answers).length,0);});
