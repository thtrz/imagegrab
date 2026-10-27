'use strict';
const $ = id => document.getElementById(id);
let scan;
let entries = [];
let downloading = false;
let stopRequested = false;
const selected = new Set();
function notice(text, error = false) {$('notice').textContent = text; $('notice').classList.toggle('error', error);}
function visibleEntries() {return entries.filter(e => !e.card.hidden);}
function updateCounts() {
  $('counts').textContent = visibleEntries().length + ' 张可见图片 / 共 ' + entries.length + ' 张 · 已选 ' + selected.size + ' 张';
  $('download').disabled = downloading || selected.size === 0;
  $('download').textContent = downloading ? '正在下载…' : '下载选中图片' + (selected.size ? '（' + selected.size + '）' : '');
  for (const e of entries) {e.checkbox.checked = selected.has(e.index); e.checkbox.disabled = downloading || e.small; e.card.classList.toggle('selected', selected.has(e.index));}
  for (const id of ['select-all','invert','clear','min-size','sort']) $(id).disabled = downloading;
}
function applyFilters() {
  const threshold = Number($('min-size').value);
  for (const e of entries) {
    e.card.hidden = e.small || (e.width > 0 && e.height > 0 && Math.min(e.width, e.height) < threshold);
    if (e.card.hidden) selected.delete(e.index);
  }
  $('empty').hidden = visibleEntries().length > 0;
  if (entries.length) $('empty-message').textContent = '没有符合尺寸条件的图片，请调低最短边筛选值。';
  updateCounts();
}
function makeCard(image, index) {
  const card = document.createElement('li');card.className = 'image-card';
  const wrap = document.createElement('div');wrap.className = 'image-wrap';
  const img = document.createElement('img');img.loading = 'lazy';img.decoding = 'async';img.referrerPolicy = 'no-referrer';img.alt = '商品图 ' + String(index + 1).padStart(3,'0');
  const label = document.createElement('label');label.title = '选择这张图片';
  const checkbox = document.createElement('input');checkbox.type = 'checkbox';checkbox.setAttribute('aria-label','选择商品图 ' + (index + 1));label.append(checkbox);
  const info = document.createElement('div');info.className = 'image-info';
  const details = document.createElement('div');details.className = 'image-details';
  const name = document.createElement('strong');name.textContent = '商品图_' + String(index + 1).padStart(3,'0');
  const size = document.createElement('span');size.className = 'image-size';
  const link = document.createElement('a');link.href = image.url;link.target = '_blank';link.rel = 'noopener noreferrer';link.textContent = '原图 ↗';
  const state = document.createElement('div');state.className = 'image-status';state.hidden = true;
  const e = {card,img,checkbox,size,state,index,width:image.width,height:image.height,small:false,url:image.url};
  function dimensions() {size.textContent = e.width && e.height ? e.width + ' × ' + e.height : '尺寸待读取';}
  dimensions();
  img.addEventListener('load', () => {
    e.width = img.naturalWidth;e.height = img.naturalHeight;e.small = e.width < 100 || e.height < 100;dimensions();applyFilters();
  });
  img.addEventListener('error', () => {
    img.hidden = true;
    const fallback = document.createElement('span');fallback.className = 'image-fallback';fallback.textContent = '暂时无法预览，可打开原图或尝试下载';wrap.prepend(fallback);
    size.textContent = '预览受限';
  }, {once: true});
  checkbox.addEventListener('change', () => {if (checkbox.checked) selected.add(index); else selected.delete(index);updateCounts();});
  wrap.append(img,label);details.append(name,size);info.append(details,link);card.append(wrap,info,state);
  img.src = image.url;
  return e;
}
$('select-all').addEventListener('click', () => {for(const e of visibleEntries()) if(!e.small) selected.add(e.index);updateCounts();});
$('invert').addEventListener('click', () => {for(const e of visibleEntries()) {if(selected.has(e.index)) selected.delete(e.index);else if(!e.small) selected.add(e.index);}updateCounts();});
$('clear').addEventListener('click', () => {selected.clear();updateCounts();});
$('min-size').addEventListener('change', applyFilters);
$('sort').addEventListener('change', () => {
  const list = [...entries].sort($('sort').value === 'size' ? (a,b) => (b.width*b.height-a.width*a.height)||a.index-b.index : (a,b) => a.index-b.index);
  for(const e of list) $('image-grid').append(e.card);
});
$('stop').addEventListener('click', () => {stopRequested = true;$('stop').disabled = true;$('stop').textContent = '完成当前图片后停止';});
function waitForDownload(id) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {cleanup();reject(new Error('等待浏览器下载完成超时，请在下载记录中确认。'));},90000);
    function cleanup() {clearTimeout(timeout);chrome.downloads.onChanged.removeListener(changed);}
    function settle(state, reason) {
      if(state === 'complete') {cleanup();resolve();}
      else if(state === 'interrupted') {cleanup();reject(new Error('浏览器下载中断：' + (reason || '请查看下载记录')));}
    }
    function changed(delta) {if(delta.id===id) settle(delta.state?.current,delta.error?.current);}
    chrome.downloads.onChanged.addListener(changed);
    // 解决极小文件在监听器安装前就已完成的情况。
    chrome.downloads.search({id}).then(items => {if(items[0]) settle(items[0].state,items[0].error);}, error => {cleanup();reject(error);});
  });
}
$('download').addEventListener('click', async () => {
  if (downloading || !selected.size || !scan) return;
  const batch = entries.filter(e => selected.has(e.index) && !e.small);
  const origins = [...new Set(batch.map(e => new URL(e.url).origin + '/*'))];
  downloading = true;updateCounts();
  let succeeded = 0, failed = 0, attempted = 0;
  try {
    // 由用户直接点击触发，只请求当前选中图片实际使用的域名。
    const granted = await chrome.permissions.request({origins});
    if (!granted) {notice('没有获得图片域名访问权限，已取消下载。你可以重新选择后重试。',true);return;}
    stopRequested = false;$('stop').disabled = false;$('stop').textContent = '停止后续下载';
    $('progress-panel').hidden = false;$('progress').max = batch.length;$('progress').value = 0;
    $('error-list').replaceChildren();$('errors').hidden = true;
    for (const e of batch) {
      if (stopRequested) break;
      $('progress-text').textContent = '正在处理 ' + (attempted + 1) + ' / ' + batch.length + ' 张';
      e.state.hidden = false;e.state.classList.remove('failed');e.state.textContent = '转换并下载中…';
      try {
        const response = await chrome.runtime.sendMessage({type:'DOWNLOAD_IMAGE',scanId:scan.id,index:e.index});
        if (!response?.ok) throw new Error(response?.error || '后台没有响应，请重试。');
        await waitForDownload(response.downloadId);
        succeeded++;selected.delete(e.index);e.state.textContent = '已保存为 PNG ✓';
      } catch (error) {
        failed++;e.state.classList.add('failed');e.state.textContent = '下载失败，可重新选择后重试';
        const li = document.createElement('li');li.textContent = '商品图_' + String(e.index + 1).padStart(3,'0') + '：' + error.message;
        $('error-list').append(li);$('errors').hidden = false;
      }
      attempted++;$('progress').value = attempted;
    }
    $('progress-text').textContent = (stopRequested ? '已停止' : '处理完成') + ' · 成功 ' + succeeded + ' 张 · 失败 ' + failed + ' 张' + (attempted<batch.length ? ' · 未处理 ' + (batch.length-attempted) + ' 张' : '');
    $('errors-title').textContent = failed + ' 张图片下载失败，展开查看原因';
    notice(succeeded ? '已保存到默认下载目录下的 ImageGrab 文件夹。失败或尚未处理的图片保留勾选，方便重试。' : '没有下载成功。可展开下方失败原因，或回到商品页面刷新后重新提取。',!succeeded);
  } catch (error) {notice('下载未能完成：' + error.message,true);}
  finally {downloading = false;$('stop').disabled = true;updateCounts();}
});
window.addEventListener('beforeunload', event => {if(downloading) {event.preventDefault();event.returnValue='';}});
(async () => {
  try {
    const id = new URL(location.href).searchParams.get('id');
    if (!id || !/^[a-z0-9-]{10,64}$/i.test(id)) throw new Error('请从商品页面点击“获取图片”进入本页。');
    scan = (await chrome.storage.session.get('scan:' + id))['scan:' + id];
    if (!scan) throw new Error('扫描记录已过期。浏览器重启或较旧的扫描记录清理后，请重新获取。');
    $('source-title').textContent = scan.platform + ' · ' + scan.title;
    $('source-link').href = scan.sourceURL;$('source-link').hidden = false;
    entries = scan.images.map(makeCard);
    const fragment = document.createDocumentFragment();for(const e of entries) fragment.append(e.card);$('image-grid').append(fragment);
    applyFilters();
    notice(scan.truncated ? '页面内容较多，本次扫描限制为 800 张图片和 20,000 个背景元素。建议先滚动到需要的位置再提取。' : '仅显示最短边至少 100 px 的图片。未加载的图片会在预览后继续检查尺寸；预览受限的图片仍可尝试下载。');
  } catch(error) {$('source-title').textContent = '还没有可用的扫描记录';$('empty-message').textContent = error.message;$('empty').hidden = false;notice(error.message,true);}
})();
