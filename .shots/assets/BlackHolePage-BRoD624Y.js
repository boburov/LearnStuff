import{a as e,n as t,t as n}from"./jsx-runtime-B-hcVAMW.js";import{t as r}from"./LabWorkspace-CiCU3BbO.js";import{i}from"./Toolbar-DFu_Heac.js";import{O as a,S as o,b as s}from"./index-BGD3diaV.js";import{Ht as c,L as l,Nn as u,R as d,Ut as f,Xn as p,Yn as m,m as h,y as g}from"./events-156d8d12.esm-CXbV4trU.js";import{n as _}from"./OrbitControls-Do1NFj4e.js";import{t as v}from"./Scene-Cj23ZfeF.js";import{n as y,t as b}from"./Switch-Ba1cof65.js";var x=s(`chevron-down`,[[`path`,{d:`m6 9 6 6 6-6`,key:`qrunsl`}]]),S=e(t());function C(){let e=new d,t=new Float32Array([-1,-1,3,-1,-1,3]);return e.boundingSphere=new u,e.boundingSphere.set(new p,1/0),e.setAttribute(`position`,new l(t,2)),e}var w=S.forwardRef(function({children:e,...t},n){let r=S.useMemo(C,[]);return S.createElement(`mesh`,_({ref:n,geometry:r,frustumCulled:!1},t),e)}),T=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,E=`
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;
uniform vec3 uCamPos;
uniform mat3 uCamBasis;   // right, up, forward
uniform float uTanHalfFov;
uniform float uTime;

uniform float uDiskInner;
uniform float uDiskOuter;
uniform float uDiskBrightness;
uniform float uDiskOpacity;
uniform float uTurbulence;
uniform float uDiskSpeed;
uniform float uExposure;
uniform float uStarBrightness;
uniform float uLensing;   // 1 = real geodesics, 0 = straight lines
uniform float uDoppler;   // 1 = beaming and colour shift on
uniform float uMarkers;   // 1 = draw the photon sphere and ISCO rings
uniform int   uSteps;

const float RS = 2.0;        // event horizon, M = 1
const float PHOTON_R = 3.0;  // photon sphere
const float ISCO_R = 6.0;    // innermost stable circular orbit
const float SKY_R = 90.0;    // far enough away to count as escaped

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * noise2(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

// Rough blackbody ramp: the inner disk runs hotter, so it reads blue-white,
// and the outer edge cools through orange into deep red.
vec3 temperatureColor(float t) {
  vec3 cold = vec3(1.0, 0.22, 0.05);
  vec3 warm = vec3(1.0, 0.62, 0.18);
  vec3 hot = vec3(1.0, 0.94, 0.72);
  vec3 blue = vec3(0.78, 0.89, 1.0);
  vec3 c = mix(cold, warm, smoothstep(0.0, 0.45, t));
  c = mix(c, hot, smoothstep(0.4, 0.8, t));
  return mix(c, blue, smoothstep(0.82, 1.0, t));
}

vec3 starField(vec3 dir) {
  vec3 color = vec3(0.0);

  // Three cell sizes so the sky has a few bright stars over many faint ones.
  for (int layer = 0; layer < 3; layer++) {
    float scale = 90.0 + float(layer) * 110.0;
    vec3 p = dir * scale;
    vec3 cell = floor(p);
    vec3 f = fract(p) - 0.5;
    float seed = hash31(cell + float(layer) * 37.0);
    if (seed > 0.94) {
      vec3 offset = vec3(hash31(cell + 3.1), hash31(cell + 7.7), hash31(cell + 11.3)) - 0.5;
      float d = length(f - offset * 0.7);
      float star = smoothstep(0.16, 0.0, d);
      float mag = pow(fract(seed * 91.7), 6.0);
      vec3 tint = mix(vec3(0.75, 0.84, 1.0), vec3(1.0, 0.86, 0.68), fract(seed * 13.3));
      color += tint * star * (0.35 + mag * 3.0);
    }
  }

  // A faint band of unresolved stars, so the sky is not a flat black.
  float band = exp(-abs(dir.y * 2.6));
  color += vec3(0.022, 0.026, 0.045) * band;
  color += vec3(0.005, 0.006, 0.010);
  return color * uStarBrightness;
}

// One crossing of the equatorial plane inside the disk annulus.
vec3 diskSample(vec3 hit, vec3 rayDir, out float alpha) {
  float r = length(hit.xz);
  alpha = 0.0;

  // The marker rings sit at fixed radii, so they are drawn whether or not the
  // disk reaches that far in - the photon sphere is inside most disks.
  vec3 marks = vec3(0.0);
  float markAlpha = 0.0;
  if (uMarkers > 0.5) {
    float photon = smoothstep(0.07, 0.0, abs(r - PHOTON_R));
    float isco = smoothstep(0.07, 0.0, abs(r - ISCO_R));
    // Kept dim on purpose: bright enough to trace, dark enough to stay green
    // and blue instead of clipping to white.
    marks = vec3(0.16, 0.85, 0.38) * photon * 0.65 + vec3(0.32, 0.55, 1.0) * isco * 0.65;
    markAlpha = max(photon, isco) * 0.85;
  }

  if (r < uDiskInner || r > uDiskOuter) {
    alpha = markAlpha;
    return marks;
  }

  float span = max(uDiskOuter - uDiskInner, 0.001);
  float t = clamp((r - uDiskInner) / span, 0.0, 1.0);
  float heat = 1.0 - t;

  // Keplerian shear: inner rings sweep round faster than outer ones.
  float phi = atan(hit.z, hit.x);
  float omega = uDiskSpeed * pow(max(r, 0.6), -1.5);
  float swirl = phi + omega * uTime * 6.0;
  vec2 q = vec2(swirl * 2.4, r * 1.35 - omega * uTime * 1.2);
  float turb = fbm(q * 1.6) * 0.65 + fbm(q * 4.4) * 0.35;
  float density = mix(1.0, 0.35 + turb * 1.3, clamp(uTurbulence, 0.0, 1.0));

  // Fade both edges so the annulus has no hard rim.
  float edge = smoothstep(0.0, 0.12, t) * smoothstep(1.0, 0.86, t);
  float fall = pow(heat, 2.3) + 0.06;

  vec3 color = temperatureColor(heat) * (uDiskBrightness * fall * density);

  if (uDoppler > 0.5) {
    // Prograde orbital motion, Keplerian speed v = 1/sqrt(r) in units of c.
    vec3 vel = normalize(cross(vec3(0.0, 1.0, 0.0), hit)) / sqrt(max(r, 1.0));
    float beta = length(vel);
    float gamma = 1.0 / sqrt(max(1.0 - beta * beta, 0.02));
    // The ray runs eye -> disk, so -rayDir points back at the observer.
    float mu = dot(normalize(vel), -normalize(rayDir));
    float g = 1.0 / (gamma * (1.0 - beta * mu));
    // Gravitational redshift on top of the motion.
    g *= sqrt(max(1.0 - RS / max(r, RS + 0.01), 0.02));
    // Relativistic beaming: the side turning towards us brightens sharply.
    // The 1.4 only restores the average level the redshift factor removes, so
    // the toggle reads as asymmetry rather than as a dimmer switch.
    float boost = clamp(pow(g, 3.6), 0.04, 16.0);
    color *= boost * 1.4;
    // Approaching side shifts blue, receding side red.
    float shift = clamp((g - 1.0) * 1.8, -0.9, 0.9);
    color *= vec3(1.0 - shift * 0.5, 1.0 + shift * 0.04, 1.0 + shift * 0.62);
  }

  alpha = clamp(uDiskOpacity * edge * density * (0.35 + fall), 0.0, 1.0);

  color += marks;
  alpha = max(alpha, markAlpha);

  return color;
}

vec3 tonemap(vec3 c) {
  c *= uExposure;
  // ACES-ish filmic curve; keeps the hot inner disk from clipping to flat white.
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
}

void main() {
  vec2 ndc = (vUv * 2.0 - 1.0);
  ndc.x *= uResolution.x / uResolution.y;

  vec3 dir = normalize(uCamBasis * vec3(ndc * uTanHalfFov, -1.0));
  vec3 pos = uCamPos;

  // Conserved angular momentum of this ray; it sets how hard the path bends.
  float h2 = dot(cross(pos, dir), cross(pos, dir)) * uLensing;

  vec3 color = vec3(0.0);
  float alpha = 0.0;
  bool captured = false;
  bool escaped = false;

  for (int i = 0; i < 512; i++) {
    if (i >= uSteps || captured || escaped || alpha > 0.995) break;

    float r = length(pos);
    // Small steps near the hole where the path curves, long ones far away.
    float ds = clamp(0.055 * (r - RS) + 0.03, 0.02, 1.6);
    // Never step so far that a thin disk crossing is missed.
    ds = min(ds, max(abs(pos.y) * 0.55 + 0.02, 0.04));

    vec3 prev = pos;
    vec3 acc = -1.5 * h2 * pos / pow(r, 5.0);
    vec3 midVel = dir + acc * (ds * 0.5);
    pos += midVel * ds;
    float r2 = length(pos);
    vec3 acc2 = -1.5 * h2 * pos / pow(r2, 5.0);
    dir = normalize(midVel + acc2 * (ds * 0.5));

    // Equatorial crossing: interpolate the exact hit point.
    if (prev.y * pos.y < 0.0) {
      float f = prev.y / (prev.y - pos.y);
      vec3 hit = mix(prev, pos, f);
      float da;
      vec3 dc = diskSample(hit, normalize(pos - prev), da);
      color += (1.0 - alpha) * da * dc;
      alpha += (1.0 - alpha) * da;
    }

    if (r2 <= RS * 1.001) captured = true;
    if (r2 > SKY_R) escaped = true;
  }

  if (!captured) {
    color += (1.0 - alpha) * starField(normalize(dir));
  }

  gl_FragColor = vec4(tonemap(color), 1.0);
}
`,D=n(),O=({live:e,onCamera:t})=>{let n=(0,S.useRef)(null),r=(0,S.useRef)(0),a=(0,S.useRef)(null),o=(0,S.useRef)(new f),{camera:s,size:l,viewport:u}=g(),{paused:d,controlsRef:_}=i(),v=(0,S.useMemo)(()=>({uResolution:{value:new m(1,1)},uCamPos:{value:new p},uCamBasis:{value:new c},uTanHalfFov:{value:.5},uTime:{value:0},uDiskInner:{value:6},uDiskOuter:{value:18},uDiskBrightness:{value:.85},uDiskOpacity:{value:.9},uTurbulence:{value:.6},uDiskSpeed:{value:1},uExposure:{value:1.1},uStarBrightness:{value:1},uLensing:{value:1},uDoppler:{value:1},uMarkers:{value:0},uSteps:{value:220}}),[]);return h((i,c)=>{let f=n.current?.uniforms;if(!f)return;let{settings:p,viewPosition:m}=e.current;m&&a.current!==m&&(a.current=m,s.position.set(...m),s.lookAt(0,0,0),_?.current?.update?.()),!d&&p.spinning&&(r.current+=c*p.speed),o.current.makeRotationFromQuaternion(s.quaternion),f.uCamBasis.value.setFromMatrix4(o.current),f.uCamPos.value.copy(s.position),f.uResolution.value.set(l.width*u.dpr,l.height*u.dpr),f.uTanHalfFov.value=Math.tan((s.fov??50)*Math.PI/360),f.uTime.value=r.current,f.uDiskInner.value=p.inner,f.uDiskOuter.value=Math.max(p.outer,p.inner+1),f.uDiskBrightness.value=p.brightness,f.uDiskOpacity.value=p.opacity,f.uTurbulence.value=p.turbulence,f.uDiskSpeed.value=p.speed,f.uExposure.value=p.exposure,f.uLensing.value=+!!p.lensing,f.uDoppler.value=+!!p.doppler,f.uMarkers.value=+!!p.markers,f.uSteps.value=p.steps,t?.(s.position.length())}),(0,D.jsx)(w,{children:(0,D.jsx)(`shaderMaterial`,{ref:n,args:[{uniforms:v,vertexShader:T,fragmentShader:E}],depthTest:!1,depthWrite:!1})})},k=`Qora tuynuk`,A=`Shvarcshild qora tuynugi: nur yo'llari real geodezik bo'yicha hisoblanadi.`,j=[{id:`edge`,name:`Qirradan`,position:[0,3.9,27]},{id:`tilt`,name:`Qiya`,position:[14,12,20]},{id:`top`,name:`Tepadan`,position:[0,30,.8]},{id:`near`,name:`Yaqindan`,position:[0,2.2,11]}],M=[{id:`low`,name:`Past`,steps:130},{id:`medium`,name:`O'rta`,steps:220},{id:`high`,name:`Yuqori`,steps:330},{id:`ultra`,name:`Ultra`,steps:460}],N={view:`edge`,quality:`medium`,brightness:.85,inner:6,outer:18,turbulence:.6,speed:1,opacity:.9,exposure:1.1,lensing:!0,doppler:!0,markers:!1,spinning:!0},P=[{id:`horizon`,title:`Hodisalar ufqi`,text:`Markazdagi qop-qora doira - hodisalar ufqi. Uning radiusi Shvarcshild radiusi rs ga teng. Bu yerdan ichkariga tushgan nur hech qachon qaytib chiqa olmaydi, shuning uchun u qora ko'rinadi - u jism emas, chegara.`},{id:`shadow`,title:`Soya ufqdan kattaroq`,text:`Ekrandagi qora doira ufqdan ~2.6 barobar katta: uning radiusi 2.6 rs atrofida. Sabab - ufq yonidan o'tayotgan nurlar ham ichkariga tortilib ketadi, shuning uchun biz ufqning o'zini emas, uning soyasini ko'ramiz.`},{id:`lensing`,title:`Gravitatsion linza`,text:`Disk qora tuynukning orqasida yotadi, lekin biz uning yuqori qismini tepada, pastki qismini esa pastda halqa bo'lib ko'ramiz. Og'irlik nurni egib, diskning orqa tomonini tepaga "ko'taradi". Linzani o'chirib ko'ring - disk oddiy ellipsga aylanadi.`},{id:`photon`,title:`Foton sferasi`,text:`1.5 rs (r = 3M) da nur qora tuynuk atrofida aylana bo'ylab yura oladi. Soya chetidagi ingichka yorqin halqa - o'sha yerda bir necha marta aylanib chiqqan nurlar. Belgilarni yoqsangiz, u yashil halqa bilan ko'rsatiladi.`},{id:`isco`,title:`ISCO - oxirgi barqaror orbita`,text:`3 rs (r = 6M) dan ichkarida barqaror doiraviy orbita yo'q: modda spirally ufqqa tushadi. Shuning uchun akkretsiya diski aynan shu yerda tugaydi. Belgilarda u ko'k halqa.`},{id:`doppler`,title:`Doppler nurlanishi`,text:`Disk ichki qismi yorug'lik tezligining yarmiga yaqin tezlikda aylanadi. Bizga tomon kelayotgan tomon yorqinroq va ko'kroq, uzoqlashayotgani esa xiraroq va qizilroq bo'ladi. Dopplerni o'chirib-yoqib solishtiring.`},{id:`time`,title:`Vaqt sekinlashuvi`,text:`Ufqqa qanchalik yaqin bo'lsangiz, sizning soatingiz uzoqdagi kuzatuvchinikiga nisbatan shunchalik sekin yuradi. Panel tepasida kameraning masofasi va shu masofadagi vaqt sekinlashuvi ko'rsatilgan.`}],F={headset:`Kontroller bilan sahnani aylantiring; chapdagi paneldan disk va effektlarni boshqaring`,phone:`Chapdagi paneldagi tugmaga qarang va ekranga bosing (pultda - A)`},I=({title:e,children:t})=>(0,D.jsxs)(`section`,{className:`space-y-2.5`,children:[(0,D.jsx)(`h3`,{className:`text-xs font-semibold uppercase tracking-wide text-muted-foreground`,children:e}),t]}),L=({label:e,value:t})=>(0,D.jsxs)(`div`,{className:`flex justify-between gap-3 border-b border-border/60 py-1 last:border-0`,children:[(0,D.jsx)(`span`,{className:`text-muted-foreground`,children:e}),(0,D.jsx)(`span`,{className:`text-right font-semibold tabular-nums`,children:t})]}),R=({label:e,value:t,children:n})=>{let r=(0,S.useId)();return(0,D.jsxs)(`div`,{className:`space-y-1.5`,children:[(0,D.jsxs)(`div`,{className:`flex items-center justify-between gap-3 text-sm`,children:[(0,D.jsx)(`label`,{htmlFor:r,className:`text-muted-foreground`,children:e}),t!=null&&(0,D.jsx)(`span`,{className:`font-semibold tabular-nums`,children:t})]}),(0,D.jsx)(`div`,{id:r,children:n})]})},z=({label:e,hint:t,checked:n,onChange:r})=>(0,D.jsxs)(`label`,{className:`flex cursor-pointer items-start justify-between gap-3 rounded-lg bg-secondary/50 px-3 py-2`,children:[(0,D.jsxs)(`span`,{children:[(0,D.jsx)(`span`,{className:`block text-sm font-medium`,children:e}),t&&(0,D.jsx)(`span`,{className:`mt-0.5 block text-xs leading-relaxed text-muted-foreground`,children:t})]}),(0,D.jsx)(b,{checked:n,onCheckedChange:r,className:`mt-0.5 shrink-0`})]}),B=({fact:e,open:t,onToggle:n})=>(0,D.jsxs)(`div`,{className:`overflow-hidden rounded-lg border border-border`,children:[(0,D.jsxs)(`button`,{type:`button`,onClick:n,"aria-expanded":t,className:`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-secondary/60`,children:[e.title,(0,D.jsx)(x,{size:15,className:a(`shrink-0 transition-transform`,t&&`rotate-180`)})]}),t&&(0,D.jsx)(`p`,{className:`border-t border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground`,children:e.text})]}),V=({settings:e,distance:t,onChange:n})=>{let[r,i]=(0,S.useState)(`horizon`),o=e=>t=>n({[e]:t}),s=t/2,c=s>1.01?1/Math.sqrt(1-2/t):null;return(0,D.jsxs)(`div`,{className:`space-y-6 text-sm`,children:[(0,D.jsxs)(`div`,{className:`rounded-lg bg-secondary/50 px-3 py-2`,children:[(0,D.jsx)(L,{label:`Kamera masofasi`,value:`${s.toFixed(1)} rs`}),(0,D.jsx)(L,{label:`Vaqt sekinlashuvi`,value:c?`${c.toFixed(2)}×`:`cheksiz`}),(0,D.jsx)(L,{label:`Foton sferasi`,value:`${(3/2).toFixed(1)} rs`}),(0,D.jsx)(L,{label:`ISCO`,value:`${3 .toFixed(1)} rs`}),(0,D.jsx)(`p`,{className:`pt-2 text-xs leading-relaxed text-muted-foreground`,children:`rs - Shvarcshild radiusi, ya'ni hodisalar ufqi. Quyosh massasidagi qora tuynuk uchun u atigi 3 km, Yer uchun esa 9 mm bo'lardi.`})]}),(0,D.jsx)(I,{title:`Fizika`,children:(0,D.jsxs)(`div`,{className:`space-y-2`,children:[(0,D.jsx)(z,{label:`Gravitatsion linza`,hint:`O'chirilsa, nur to'g'ri chiziq bo'ylab yuradi - disk oddiy ellipsga aylanadi.`,checked:e.lensing,onChange:o(`lensing`)}),(0,D.jsx)(z,{label:`Doppler effekti`,hint:`Bizga tomon aylanayotgan tomon yorqinroq va ko'kroq ko'rinadi.`,checked:e.doppler,onChange:o(`doppler`)}),(0,D.jsx)(z,{label:`Belgilar`,hint:`Foton sferasi (yashil) va ISCO (ko'k) halqalari.`,checked:e.markers,onChange:o(`markers`)}),(0,D.jsx)(z,{label:`Aylanish`,hint:`Disk moddasi orbitada harakatlanadi.`,checked:e.spinning,onChange:o(`spinning`)})]})}),(0,D.jsx)(I,{title:`Akkretsiya diski`,children:(0,D.jsxs)(`div`,{className:`space-y-4`,children:[(0,D.jsx)(R,{label:`Yorqinlik`,value:e.brightness.toFixed(2),children:(0,D.jsx)(y,{min:.1,max:2.5,step:.05,value:[e.brightness],onValueChange:([e])=>o(`brightness`)(e)})}),(0,D.jsx)(R,{label:`Ichki radius`,value:`${(e.inner/2).toFixed(1)} rs`,children:(0,D.jsx)(y,{min:3,max:14,step:.5,value:[e.inner],onValueChange:([e])=>o(`inner`)(e)})}),(0,D.jsx)(R,{label:`Tashqi radius`,value:`${(e.outer/2).toFixed(1)} rs`,children:(0,D.jsx)(y,{min:8,max:30,step:.5,value:[e.outer],onValueChange:([e])=>o(`outer`)(e)})}),(0,D.jsx)(R,{label:`Turbulentlik`,value:e.turbulence.toFixed(2),children:(0,D.jsx)(y,{min:0,max:1,step:.05,value:[e.turbulence],onValueChange:([e])=>o(`turbulence`)(e)})}),(0,D.jsx)(R,{label:`Aylanish tezligi`,value:`${e.speed.toFixed(1)}×`,children:(0,D.jsx)(y,{min:0,max:3,step:.1,value:[e.speed],onValueChange:([e])=>o(`speed`)(e)})}),(0,D.jsx)(R,{label:`Zichlik`,value:e.opacity.toFixed(2),children:(0,D.jsx)(y,{min:.1,max:1,step:.05,value:[e.opacity],onValueChange:([e])=>o(`opacity`)(e)})})]})}),(0,D.jsx)(I,{title:`Tasvir`,children:(0,D.jsxs)(`div`,{className:`space-y-4`,children:[(0,D.jsx)(R,{label:`Ekspozitsiya`,value:e.exposure.toFixed(2),children:(0,D.jsx)(y,{min:.3,max:2.5,step:.05,value:[e.exposure],onValueChange:([e])=>o(`exposure`)(e)})}),(0,D.jsx)(R,{label:`Sifat`,children:(0,D.jsx)(`div`,{className:`flex flex-wrap gap-2`,children:M.map(t=>(0,D.jsx)(`button`,{type:`button`,onClick:()=>n({quality:t.id,steps:t.steps}),className:a(`rounded-full border px-3 py-1 text-xs transition-colors`,e.quality===t.id?`border-primary bg-primary text-primary-foreground`:`border-border hover:bg-secondary`),children:t.name},t.id))})}),(0,D.jsx)(`p`,{className:`text-xs leading-relaxed text-muted-foreground`,children:`Har bir piksel uchun nur yo'li alohida hisoblanadi. Kompyuter sekin ishlayotgan bo'lsa, sifatni pasaytiring.`})]})}),(0,D.jsx)(I,{title:`Nima ko'rinyapti`,children:(0,D.jsx)(`div`,{className:`space-y-2`,children:P.map(e=>(0,D.jsx)(B,{fact:e,open:r===e.id,onToggle:()=>i(r===e.id?null:e.id)},e.id))})})]})},H={minDistance:4,maxDistance:70,enablePan:!1},U=j.map(e=>({id:e.id,name:e.name})),W=M.find(e=>e.id===N.quality),G=()=>{let[e,t]=(0,S.useState)(j[0].position[2]),n=(0,S.useRef)(0),{state:i,view:a,setField:s,setFields:c}=o({...N,steps:W.steps}),l=(0,S.useRef)({settings:i,viewPosition:j[0].position});l.current={settings:i,viewPosition:j.find(e=>e.id===a)?.position??j[0].position};let u=(0,S.useCallback)(e=>{let r=performance.now();r-n.current<120||(n.current=r,t(e))},[]),d=(0,S.useMemo)(()=>(0,D.jsx)(v,{camera:j[0].position,bg:`#05060c`,controls:H,children:(0,D.jsx)(O,{live:l,onCamera:u})}),[u]),f=(0,S.useMemo)(()=>({qora_tuynuk:`Shvarcshild (aylanmaydigan), M = 1 birlikda`,hodisalar_ufqi_rs:2,foton_sferasi_M:3,isco_M:6,kamera_masofasi_rs:(e/2).toFixed(1),disk_ichki_radius_rs:(i.inner/2).toFixed(1),disk_tashqi_radius_rs:(i.outer/2).toFixed(1),gravitatsion_linza:i.lensing?`yoqilgan`:`o'chirilgan`,doppler:i.doppler?`yoqilgan`:`o'chirilgan`}),[e,i.inner,i.outer,i.lensing,i.doppler]);return(0,D.jsx)(r,{title:k,description:A,backTo:`/physics`,backLabel:`Fizika`,items:U,activeId:a,onSelect:e=>s(`view`,e),vrHint:F,aiContext:f,scene:(0,D.jsx)(`div`,{className:`relative h-full w-full bg-[#05060c]`,children:d}),info:(0,D.jsx)(V,{settings:i,distance:e,onChange:c})})};export{G as default};