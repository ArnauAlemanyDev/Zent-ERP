import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const out = fileURLToPath(new URL('./generated/', import.meta.url));
mkdirSync(out,{recursive:true});
const languages={en:{tag:'DESKTOP ERP / CUSTOMER PORTAL',sub:'Workshop operations & IT support',metrics:['Security checks passed','Initial JS reduction','Connected interfaces'],foot:'LOCAL PORTFOLIO EDITION · WINDOWS / WEB'},es:{tag:'ERP DE ESCRITORIO / PORTAL DE CLIENTES',sub:'Gestión de taller y soporte informático',metrics:['Pruebas superadas','Reducción JS inicial','Interfaces conectadas'],foot:'EDICIÓN LOCAL DE PORTFOLIO · WINDOWS / WEB'}};
const themes={light:{fg:'#192433',muted:'#506173',accent:'#086b80',line:'#d0dae3',panel:'#eef5f8'},dark:{fg:'#e6edf3',muted:'#a8b7c8',accent:'#49d4e9',line:'#303e4d',panel:'#152432'}};
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
for(const [lang,t] of Object.entries(languages)) for(const [theme,c] of Object.entries(themes)){
 const svg=(h,body,title)=>`<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${h}" viewBox="0 0 760 ${h}" role="img"><title>${esc(title)}</title><style>.s{font-family:system-ui,-apple-system,'Segoe UI',sans-serif}.m{font-family:ui-monospace,Consolas,monospace}</style>${body}</svg>`;
 const text=(x,y,size,color,content,cls='s',weight=400)=>`<text x="${x}" y="${y}" class="${cls}" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(content)}</text>`;
 let header=text(0,20,13,c.muted,'@ARNAUALEMANYDEV / '+t.tag,'m')+text(0,100,75,c.fg,'Zent ERP','s',750)+text(3,140,24,c.muted,t.sub)+`<path transform="translate(644 43) scale(2.8)" d="M2 28 16 2h10L12 28zM18 28l9-17h10l-9 17z" fill="${c.accent}"/><line x1="0" x2="760" y1="165" y2="165" stroke="${c.line}"/>`+text(2,189,12,c.accent,t.foot,'m',600);
 writeFileSync(join(out,`header-${lang}-${theme}.svg`),svg(200,header,'Zent ERP — '+t.sub));
 let metrics=''; for(const [i,v] of ['64/64','−44%','02'].entries()) {let x=i*256;metrics+=`<rect x="${x+.5}" y=".5" width="247" height="109" rx="8" fill="${c.panel}" stroke="${c.line}"/>`+text(x+17,48,36,c.accent,v,'m',700)+text(x+17,78,15,c.fg,t.metrics[i],'s',600);}
 writeFileSync(join(out,`metrics-${lang}-${theme}.svg`),svg(111,metrics,`64/64 · −44% · 02 — ${t.metrics.join(', ')}`));
}
