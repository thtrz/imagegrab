/* 纯函数供内容脚本、后台及验证脚本复用。 */
(function (root) {
  'use strict';
  const LIMIT = 800;
  function platform(host) {
    host = String(host || '').toLowerCase();
    const match = domain => host === domain || host.endsWith('.' + domain);
    if (match('taobao.com') || match('tmall.com')) return '淘宝 / 天猫';
    if (match('jd.com')) return '京东';
    if (match('pinduoduo.com') || match('yangkeduo.com')) return '拼多多';
    return '';
  }
  function isProductPage(address) {
    try {
      const u = new URL(address);
      const p = platform(u.hostname);
      if (!p) return false;
      if (p === '淘宝 / 天猫') return /\/(?:item|detail)\.(?:htm|html)/i.test(u.pathname) || /\/(?:item|detail)\//i.test(u.pathname);
      if (p === '京东') return /^item\./i.test(u.hostname) && /\/(?:\d+\.html|product\/)/i.test(u.pathname) || /\/(?:product|ware\/view|goods\/detail)/i.test(u.pathname);
      return /\/(?:goods(?:\.html|\/(?:detail|edit|preview|goods_detail))|goods_detail|product\/detail|detail)(?:[/.?]|$)/i.test(u.pathname) || [...u.searchParams.keys()].some(k => /^(goods_id|goodsId|goodsid)$/i.test(k));
    } catch (_) { return false; }
  }
  function imageURL(raw, base) {
    if (typeof raw !== 'string' || !raw.trim() || raw.length > 8192) return '';
    try {
      const u = new URL(raw.trim(), base);
      if (!['https:', 'http:'].includes(u.protocol)) return '';
      if (u.username || u.password) return '';
      // 保留查询参数，避免破坏签名地址。只去掉无关的片段标识。
      u.hash = '';
      return u.href;
    } catch (_) { return ''; }
  }
  function srcsetURLs(value) {
    if (!value || /^data:/i.test(value.trim())) return [];
    return value.split(',').map(part => part.trim().split(/\s+/)[0]).filter(Boolean);
  }
  function cleanImages(items, base) {
    const seen = new Set();
    const result = [];
    for (const item of Array.isArray(items) ? items : []) {
      const url = imageURL(item && item.url, base);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      result.push({url, width: Math.max(0, Math.min(100000, Number(item.width) || 0)), height: Math.max(0, Math.min(100000, Number(item.height) || 0))});
      if (result.length >= LIMIT) break;
    }
    return result;
  }
  root.ImageGrabCore = Object.freeze({LIMIT, platform, isProductPage, imageURL, srcsetURLs, cleanImages});
})(globalThis);
