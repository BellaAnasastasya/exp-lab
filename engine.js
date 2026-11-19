'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.EXP_ENGINE=api;})(typeof window!=='undefined'?window:globalThis,function(){
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function signal(names,data){
 const out={heal:0,regen:0,vamp:0,shield:0,basic:0,attackSpeed:0,skillPhysical:0,magicBurst:0,magicDot:0,dive:0,hardCC:0,engage:0,antiEngage:0,tank:0,front:0,physical:0,magic:0,burst:0,mobility:0};
 const heroes=new Map(data.heroes.map(h=>[h.name,h]));
 for(const n of names){const h=heroes.get(n);if(!h)continue;const mech=data.profiles?.[n]?.mechanics||data.mechanics[n]||{};for(const [k,v] of Object.entries(mech))if(k in out)out[k]+=v; const t=h.traits||{};out.tank+=(t.T||0);out.front+=(t.F||0);out.physical+=(t.A||0)+(t.B||0)*.3;out.magic+=(t.G||0);out.burst+=(t.B||0);out.mobility+=(data.profiles?.[n]?.mobility??t.M??0); const tags=h.mechanics||{};if((tags.healing||[]).includes('ally_heal'))out.heal+=.6;if((tags.healing||[]).includes('spell_vamp'))out.vamp+=.5;if((tags.protection||[]).some(x=>String(x).includes('shield')))out.shield+=.5;}
 return out;
}
function analyze(hero,enemy,ally,data){
 if(!['Ruby','Sora'].includes(hero))throw Error('Hero EXP tidak valid');
 const e=signal(enemy,data),a=signal(ally,data),ruby=hero==='Ruby';
 const heal=e.heal*1.7+e.regen*1+e.vamp*1.2;
 const physical=e.skillPhysical+e.basic*.58+e.attackSpeed*.36;
 const magic=e.magicBurst+e.magicDot*.8;
 const dive=e.dive+e.engage*.6;
 const cc=e.hardCC+e.engage*.2;
 const tank=e.tank*.65+e.front*.23;
 const armorRisk=e.tank*.45+e.front*.18;
 const setup=a.hardCC+a.engage*.4+ally.reduce((sum,n)=>sum+(data.profiles?.[n]?.setup||0)*.25,0);
 const tough=cc>=3.6||magic>physical*1.22;
 const boots=tough?'tough':'warrior';
 const scores={
  waraxe:100, queen:ruby?85:65, hunter:ruby?25:78, brute:ruby?41:66+(a.tank<2?6:0)+Math.min(8,e.mobility*.6),
  dominance:16+(heal+e.shield*.55)*8+e.attackSpeed*2, sea:10+(heal+e.shield*.55)*(ruby?6:7),
  antique:19+e.skillPhysical*7, blade:10+e.basic*5+e.attackSpeed*3,
  athena:17+e.magicBurst*9,radiant:16+e.magicDot*9,
  oracle:ruby?53+magic*.4:35+magic*.5, immortality:45+dive*1.5+(a.tank<2?7:0),
  malefic:22+armorRisk*8+(tank>=5?11:0),despair:22+(tank<4?8:0)+Math.min(8,setup*.6),
  rose:17+e.magicBurst*5, thunder:19+(ruby?12:5), guardian:8,
  endless:ruby?22:30, heptaseas:ruby?5:23, chastise:8+e.attackSpeed*2
 };
 // Core identities are distinct. Ruby: War Axe+Queen's Wings; Sora: War Axe+Hunter Strike.
 const core=ruby?['waraxe','queen']:['waraxe','hunter'];
 const highHeal=heal+e.shield*.55>=3.6,highPhys=e.skillPhysical>=3.5,highBurst=e.magicBurst>=3,highDot=e.magicDot>=3;
 const urgent=[];
 if(highHeal)urgent.push([ruby?'dominance':'sea',heal+e.shield*.55]);
 if(e.basic+e.attackSpeed>=6)urgent.push(['blade',e.basic+e.attackSpeed*.5]);
 if(highPhys)urgent.push(['antique',e.skillPhysical]);
 if(highBurst)urgent.push(['athena',e.magicBurst]);
 if(highDot)urgent.push(['radiant',e.magicDot]);
 urgent.sort((x,y)=>y[1]-x[1]);
 const flex=[];
 for(const [id] of urgent)if(flex.length<3&&!flex.includes(id)&&!core.includes(id))flex.push(id);
 const rank=Object.keys(scores).filter(x=>!core.includes(x)&&!(highHeal&&(x==='sea'||x==='dominance')&&urgent.some(y=>y[0]!==x&&(y[0]==='sea'||y[0]==='dominance')))).sort((x,y)=>scores[y]-scores[x]||x.localeCompare(y));
 for(const id of rank)if(flex.length<3&&!flex.includes(id))flex.push(id);
 // Order four flex slots? one boot + two core + 3 situational items = six.
 flex.sort((x,y)=>scores[y]-scores[x]);
 const early=urgent.find(([id,v])=>flex.includes(id)&&v>=6)?.[0];
 const order=early?[boots,core[0],early,core[1],...flex.filter(id=>id!==early)]:[boots,...core,...flex];
 const suppress=enemy.some(n=>['Franco','Barats'].includes(n)||data.heroes.find(h=>h.name===n)?.cc?.includes('suppress'));
 const cleanse=enemy.reduce((sum,n)=>sum+(data.heroes.find(h=>h.name===n)?.cc?.some(c=>['stun','freeze','immobilize','silence','taunt','polymorph','fear'].includes(c))?1:0),0);
 const spell=!suppress&&cleanse>=3&&cc>=6?'Purify':(!ruby&&physical>=8&&e.basic>=5&&cc<5?'Vengeance':'Flicker');
 const emblem=ruby?['Fighter Emblem','Firmness','Festival of Blood','Brave Smite']:['Fighter Emblem','Firmness','Festival of Blood','Brave Smite'];
 const focus=ruby?'Sustain + tarik/CC + skill vamp':'Bruiser + mode Thunder/Torrent + chase / frontline';
 const mode=ruby?'Ruby: gunakan dash pasif antar-skill, tarik target dekat rekan tim, dan jaga HP melalui spell vamp.':(e.burst+e.basic>=6?'Sora: prioritaskan Torrent saat tim butuh menahan damage dan mengacaukan formasi; Thunder saat ada kesempatan menghabisi target.':'Sora: Thunder untuk menekan target, Torrent untuk CC/frontline; pilih mode sesuai posisi musuh dan follow-up tim.');
 const signals={heal,physical,magic,cc,tank,dive,armorRisk,setup};
 return {order,spell,emblem,focus,mode,scores,signals,enemySignals:e,allySignals:a,hero};
}
return {analyze,signal};
});
