/* 图片在本机扫描；不会上传商品地址或图片列表。 */
(() => {
  'use strict';
  if (globalThis.__imagegrabContent) return;
  globalThis.__imagegrabContent = true;
  const Core = globalThis.ImageGrabCore;
  let busy = false;
  let host;
  let button;
  function mount() {
    const visible = Core.isProductPage(location.href);
    if (!visible) { if (host) host.remove(); host = null; return; }
    if (host && host.isConnected) return;
    host = document.createElement('div');
    host.id = 'imagegrab-float';
    const shadow = host.attachShadow({mode: 'open'});
    const style = document.createElement('style');
    style.textContent = "button{font:600 14px/1.5 system-ui,\"Microsoft YaHei\",sans-serif;color:white;background:#3158e8;border:1px solid #5274ff;border-radius:16px;padding:14px 20px;box-shadow:0 8px 30px #17296345;cursor:pointer;transition:transform .2s,background .2s}button:hover{transform:translateY(-2px);background:#2447c8}button:focus-visible{outline:3px solid #99b5ff;outline-offset:3px}button:disabled{opacity:.75;cursor:wait}small{display:block;font-size:10px;font-weight:400;opacity:.8;letter-spacing:1px}";
    button = document.createElement('button');
    button.type = 'button';
    button.title = '提取当前页面已加载的商品图片';
    resetButton();
    shadow.append(style, button);
    button.addEventListener('click', () => scan().catch(showError));
    document.documentElement.appendChild(host);
  }
  function resetButton() {
    button.textContent = '获取图片';
    const caption = document.createElement('small');
    caption.textContent = 'IMAGEGRAB';
    button.append(caption);
  }
  function showError(error) { window.alert('图提取：' + (error.message || String(error))); }
  function collect() {
    const candidates = [];
    function add(raw, width = 0, height = 0, knownSmall = false) {
      if (knownSmall) return;
      const url = Core.imageURL(raw, location.href);
      if (!url || /(?:favicon|sprite|logo|icon|spacer|transparent|loading|placeholder)(?:[_.\/-]|$)/i.test(new URL(url).pathname) || /\.svg$/i.test(new URL(url).pathname)) return;
      candidates.push({url, width, height});
    }
    for (const img of document.images) {
      const width = img.naturalWidth || 0;
      const height = img.naturalHeight || 0;
      // 已确认的小图片直接过滤；尚未加载的图片保留，预览时再次检查尺寸。
      const small = width > 0 && height > 0 && (width < 100 || height < 100);
      add(img.currentSrc || img.src, width, height, small);
      for (const attr of ['data-src','data-lazy-src','data-original','data-ks-lazyload','data-lazyload','data-url','data-img','lazysrc']) {
        const raw = img.getAttribute(attr);
        if (raw) add(raw);
      }
      for (const attr of ['srcset', 'data-srcset']) for (const raw of Core.srcsetURLs(img.getAttribute(attr))) add(raw);
    }
    for (const source of document.querySelectorAll('picture source')) for (const raw of Core.srcsetURLs(source.getAttribute('srcset') || source.getAttribute('data-srcset'))) add(raw);
    // 背景图片也可能是详情长图；限制扫描量，避免复杂页面长时间卡顿。
    const elements = document.querySelectorAll('body *');
    const backgroundLimit = 20000;
    for (let i = 0; i < Math.min(elements.length, backgroundLimit); i++) {
      const el = elements[i];
      if (el.id === 'imagegrab-float' || ['SCRIPT','STYLE','LINK','META'].includes(el.tagName)) continue;
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === 'none') continue;
      const rect = el.getBoundingClientRect();
      for (const match of bg.matchAll(/url\(\s*['"]?(.*?)['"]?\s*\)/g)) add(match[1], 0, 0, rect.width > 0 && rect.height > 0 && (rect.width < 100 || rect.height < 100));
    }
    return {images: Core.cleanImages(candidates, location.href), truncated: candidates.length > Core.LIMIT || elements.length > backgroundLimit};
  }
  async function scan() {
    if (busy) throw new Error('正在扫描，请稍等。');
    if (!Core.platform(location.hostname)) throw new Error('请在淘宝、天猫、京东或拼多多页面使用。');
    busy = true;
    if (button) {button.disabled = true; button.textContent = '正在获取…';}
    try {
      // 先交还一帧，让“正在获取”状态显示出来。
      await new Promise(resolve => setTimeout(resolve, 30));
      const result = collect();
      if (!result.images.length) throw new Error('没有找到商品图片。请先手动向下滚动，让详情图加载后再试。');
      const response = await chrome.runtime.sendMessage({type: 'SCAN_RESULT', payload: {...result, title: document.title.slice(0, 200)}});
      if (!response || !response.ok) throw new Error(response?.error || '扩展没有响应，请刷新商品页面后重试。');
      return result.images.length;
    } finally {
      busy = false;
      if (button) {button.disabled = false; resetButton();}
    }
  }
  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message.type !== 'SCAN_NOW') return;
    scan().then(count => reply({ok: true, count}), error => reply({ok: false, error: error.message}));
    return true;
  });
  mount();
  let lastURL = location.href;
  // 商品网站常使用单页导航；只在地址或挂载状态变化时更新按钮。
  setInterval(() => {
    if (location.href !== lastURL || (host && !host.isConnected)) {lastURL = location.href; mount();}
  }, 1000);
})();
