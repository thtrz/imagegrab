/* 官网仅用原生 JS，无外部脚本或服务。 */
'use strict';
const header=document.querySelector('.site-header');
const menu=document.querySelector('.menu-toggle');
const nav=document.getElementById('site-nav');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','展开导航');}
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'收起导航':'展开导航');});
nav.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();menu.focus();}});
window.addEventListener('resize',()=>{if(window.innerWidth>=768)closeMenu();});
function updateHeader(){header.classList.toggle('scrolled',window.scrollY>10);}
window.addEventListener('scroll',updateHeader,{passive:true});updateHeader();
if('IntersectionObserver' in window){
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.documentElement.classList.add('has-motion');
    const reveal=new IntersectionObserver(items=>{for(const item of items)if(item.isIntersecting){item.target.classList.add('is-visible');reveal.unobserve(item.target);}},{threshold:.08});
    document.querySelectorAll('.reveal').forEach(el=>reveal.observe(el));
    // 极端情况下脚本或观察器失败时，页面内容仍可读。
    setTimeout(()=>document.documentElement.classList.remove('has-motion'),6500);
  }
  const links=[...nav.querySelectorAll('a[href^="#"]')];
  const sections=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const observer=new IntersectionObserver(items=>{for(const item of items)if(item.isIntersecting){for(const link of links){const active=link.getAttribute('href')==='#'+item.target.id;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}}},{rootMargin:'-15% 0px -55% 0px',threshold:0});
  sections.forEach(section=>observer.observe(section));
}
let toastTimer;
function toast(text){const el=document.getElementById('toast');el.textContent=text;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3500);}
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
  const text=button.dataset.copy;
  try{
    if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
    else{const textarea=document.createElement('textarea');textarea.value=text;textarea.style.position='fixed';textarea.style.opacity='0';document.body.append(textarea);textarea.select();const ok=document.execCommand('copy');textarea.remove();if(!ok)throw new Error('copy failed');}
    toast('已复制，请粘贴到 Chrome 地址栏打开');
  }catch(_){toast('请手动复制：'+text);}
}));
