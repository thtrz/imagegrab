/* Manifest V3 后台：接收扫描结果，取得图片并真正编码为 PNG。 */
'use strict';
importScripts('lib/core.js');
const Core = globalThis.ImageGrabCore;
const MAX_BYTES = 35 * 1024 * 1024;
function isGallery(sender) {
  try {
    const u = new URL(sender.url);
    const extension = new URL(chrome.runtime.getURL('/'));
    return u.protocol === extension.protocol && u.host === extension.host && u.pathname === '/gallery.html';
  } catch (_) { return false; }
}
async function saveScan(payload, sender) {
  if (!sender.tab?.id || !Core.platform(new URL(sender.tab.url).hostname)) throw new Error('扫描必须来自支持的商品网站。');
  const images = Core.cleanImages(payload?.images, sender.tab.url);
  if (!images.length) throw new Error('没有有效的图片地址。');
  const id = crypto.randomUUID();
  const key = 'scan:' + id;
  await chrome.storage.session.set({[key]: {id, images, title: String(payload.title || '商品图片').slice(0,200), sourceURL: sender.tab.url, platform: Core.platform(new URL(sender.tab.url).hostname), createdAt: Date.now(), truncated: !!payload.truncated}});
  // 保留最近五次扫描；图片文件本身不写入扩展存储。
  const stored = await chrome.storage.session.get(null);
  const oldKeys = Object.keys(stored).filter(k => k.startsWith('scan:')).sort((a,b) => stored[b].createdAt - stored[a].createdAt).slice(5);
  if (oldKeys.length) await chrome.storage.session.remove(oldKeys);
  await chrome.tabs.create({url: chrome.runtime.getURL('gallery.html?id=' + encodeURIComponent(id))});
  return {id, count: images.length};
}
async function readImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, {credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal});
    if (!response.ok) throw new Error('图片请求失败（HTTP ' + response.status + '），可能需要登录或网站限制了下载。');
    if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('单张图片超过 35 MB，请单独保存。');
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {await reader.cancel(); throw new Error('单张图片超过 35 MB，请单独保存。');}
      chunks.push(value);
    }
    if (!size) throw new Error('图片内容为空。');
    return new Blob(chunks, {type: response.headers.get('content-type') || 'application/octet-stream'});
  } finally {clearTimeout(timer);}
}
async function downloadImage(message, sender) {
  if (!isGallery(sender)) throw new Error('请从图提取的预览页开始下载。');
  const data = await chrome.storage.session.get('scan:' + message.scanId);
  const scan = data['scan:' + message.scanId];
  const index = Number(message.index);
  if (!scan || !Number.isInteger(index) || index < 0 || index >= scan.images.length) throw new Error('扫描记录已过期，请回到商品页面重新获取。');
  const url = scan.images[index].url;
  let bitmap;
  try {
    bitmap = await createImageBitmap(await readImage(url));
    if (bitmap.width < 100 || bitmap.height < 100) throw new Error('这张图片小于 100×100，已跳过。');
    if (bitmap.width * bitmap.height > 40000000) throw new Error('这张图片超过 4000 万像素，请单独保存。');
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法创建图片转换画布。');
    context.drawImage(bitmap, 0, 0);
    const png = await canvas.convertToBlob({type: 'image/png'});
    if (png.size > MAX_BYTES) throw new Error('转换后的 PNG 超过 35 MB，请单独保存。');
    const bytes = new Uint8Array(await png.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    const sequence = String(index + 1).padStart(3, '0');
    const date = new Date(scan.createdAt).toISOString().slice(0,10);
    const downloadId = await chrome.downloads.download({url: 'data:image/png;base64,' + btoa(binary), filename: 'ImageGrab/' + date + '/商品图_' + sequence + '.png', conflictAction: 'uniquify', saveAs: false});
    return {downloadId};
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('图片请求超时，请重试。');
    if (/failed to fetch|fetch failed/i.test(error.message)) throw new Error('无法获取图片：请确认已允许图片域名权限，或在商品页面登录后重试。网站也可能限制外部下载。');
    throw error;
  } finally {if (bitmap) bitmap.close();}
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!message || !['SCAN_RESULT','DOWNLOAD_IMAGE'].includes(message.type)) return;
  const task = message.type === 'SCAN_RESULT' ? saveScan(message.payload, sender) : downloadImage(message, sender);
  task.then(data => reply({ok: true, ...data}), error => reply({ok: false, error: error.message || String(error)}));
  return true;
});
chrome.action.onClicked.addListener(async tab => {
  if (!tab.id || !tab.url) return;
  let supported = false;
  try {supported = !!Core.platform(new URL(tab.url).hostname);} catch (_) {}
  if (!supported) {
    await chrome.tabs.create({url: chrome.runtime.getURL('help.html')});
    return;
  }
  try {
    // 扩展刚安装而页面尚未刷新时，工具栏入口也能启动扫描。
    await chrome.scripting.insertCSS({target: {tabId: tab.id}, files: ['content.css']});
    await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['lib/core.js','content.js']});
    const response = await chrome.tabs.sendMessage(tab.id, {type: 'SCAN_NOW'});
    if (!response?.ok) throw new Error(response?.error || '扫描失败');
  } catch (error) {
    await chrome.tabs.create({url: chrome.runtime.getURL('help.html?error=' + encodeURIComponent(error.message))});
  }
});
