const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const whatsapp = document.body.dataset.whatsapp || '5571981417081';
const quoteKey = 'mg-borrachas-orcamento-v1';
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// A failed upload must remain clearly marked instead of showing a broken-image icon.
$$('.product-visual > img, .category-image > img, .category-directory__image > img, .detail-main-image img, .site-banner img').forEach(img => {
  const showMissing = () => {
    if (!img.isConnected) return;
    const detail = img.closest('.detail-main-image');
    const placeholder = document.createElement('span');
    placeholder.className = detail ? 'image-missing large' : 'image-missing';
    placeholder.innerHTML = '<span class="missing-glyph" aria-hidden="true">◇</span><small>Fotografia ainda não disponível</small>';
    if (detail) detail.replaceChildren(placeholder);
    else img.replaceWith(placeholder);
  };
  img.addEventListener('error', showMissing, { once: true });
  if (img.complete && !img.naturalWidth) showMissing();
});

function getQuote() {
  try { const saved = JSON.parse(localStorage.getItem(quoteKey) || '[]'); return Array.isArray(saved) ? saved.filter(x => x && typeof x.sku === 'string').slice(0, 100) : []; } catch { return []; }
}
function saveQuote(items, rerender = true) {
  try { localStorage.setItem(quoteKey, JSON.stringify(items)); } catch { toast('Não foi possível salvar a lista neste navegador.'); }
  updateCount();
  if (rerender && $('[data-quote-items]')) renderQuote();
}
function updateCount() {
  const count = getQuote().length;
  $$('[data-quote-count]').forEach(node => { node.textContent = count; node.hidden = count === 0; });
}
let toastTimer;
function toast(message) {
  let el = $('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.textContent = message; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}
function addQuote({ sku, name, image, quantity = 1, note = '' }) {
  const items = getQuote(); const index = items.findIndex(item => item.sku === sku);
  if (index >= 0) { items[index].quantity = Math.min(99999, Number(items[index].quantity || 1) + Number(quantity)); if (note) items[index].note = note; }
  else items.push({ sku, name, image: image || '', quantity: Math.min(99999, Math.max(1, Number(quantity) || 1)), note });
  saveQuote(items); toast(`${name} adicionado à lista de orçamento.`);
}

const menuToggle = $('.menu-toggle');
if (menuToggle) {
  const menu = $('#mobile-menu');
  menuToggle.addEventListener('click', () => { const open = menuToggle.getAttribute('aria-expanded') !== 'true'; menuToggle.setAttribute('aria-expanded', String(open)); menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu'); menu.hidden = !open; document.body.classList.toggle('menu-open', open); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { menuToggle.click(); menuToggle.focus(); } });
  $$('a', menu).forEach(link => link.addEventListener('click', () => { menu.hidden = true; menuToggle.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); }));
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-add-quote]');
  if (!button) return;
  const card = button.closest('.product-card');
  addQuote({ sku: button.dataset.sku, name: button.dataset.name, image: $('img', card)?.getAttribute('src') || '' });
});

const detailButton = $('[data-detail-add]');
if (detailButton) detailButton.addEventListener('click', () => {
  const quantity = Number($('[data-detail-qty]').value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99999) { toast('Informe uma quantidade válida.'); return; }
  addQuote({ sku: detailButton.dataset.sku, name: detailButton.dataset.name, image: $('[data-main-image]')?.getAttribute('src') || '', quantity, note: $('[data-detail-note]').value.trim() });
});
$$('[data-gallery-src]').forEach(button => button.addEventListener('click', () => { const main = $('[data-main-image]'); if (main) main.src = button.dataset.gallerySrc; const zoom = $('[data-image-zoom-preview]'); if (zoom) zoom.src = button.dataset.gallerySrc; }));
const zoomDialog = $('[data-image-zoom-dialog]');
if (zoomDialog) {
  $('[data-image-zoom]')?.addEventListener('click', () => zoomDialog.showModal());
  $('[data-image-zoom-close]')?.addEventListener('click', () => zoomDialog.close());
  zoomDialog.addEventListener('click', event => { if (event.target === zoomDialog) zoomDialog.close(); });
}
const detailWhatsapp = $('[data-detail-whatsapp]');
if (detailWhatsapp) detailWhatsapp.addEventListener('click', event => {
  const quantity = Number($('[data-detail-qty]').value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99999) { event.preventDefault(); toast('Informe uma quantidade válida.'); return; }
  const note = $('[data-detail-note]').value.trim();
  const message = `Olá! Vim pelo site da MG Borrachas e gostaria de solicitar um orçamento para o produto ${detailWhatsapp.dataset.name}, referência ${detailWhatsapp.dataset.sku}.\nQuantidade: ${quantity}.${note ? `\nMedidas ou especificações: ${note}` : ''}`;
  detailWhatsapp.href = `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
});

const catalog = $('[data-catalog]');
if (catalog) {
  const grid = $('[data-product-grid]', catalog), all = $$('[data-product-card]', grid);
  const search = $('[data-search-input]', catalog), sort = $('[data-sort]', catalog), custom = $('[data-custom-only]', catalog);
  const empty = $('[data-empty-state]', catalog), count = $('[data-result-count]', catalog), more = $('[data-load-more]', catalog);
  let visibleLimit = 16;
  const category = () => $('input[name="category"]:checked', catalog)?.value || '';
  function applyFilters() {
    const query = normalize(search.value.trim());
    const matches = all.filter(card => (!query || normalize(card.dataset.search).includes(query)) && (!category() || card.dataset.category === category()) && (!custom.checked || card.dataset.custom === 'true'));
    matches.sort((a, b) => {
      if (sort.value === 'az') return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent, 'pt-BR');
      if (sort.value === 'za') return b.querySelector('h3').textContent.localeCompare(a.querySelector('h3').textContent, 'pt-BR');
      if (sort.value === 'recent') return Number(b.dataset.order) - Number(a.dataset.order);
      return Number(b.dataset.featured === 'true') - Number(a.dataset.featured === 'true') || Number(a.dataset.order) - Number(b.dataset.order);
    });
    matches.forEach(card => grid.append(card));
    all.forEach(card => { card.hidden = !matches.includes(card) || matches.indexOf(card) >= visibleLimit; });
    count.textContent = `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'}`;
    empty.hidden = matches.length > 0;
    more.hidden = matches.length <= visibleLimit;
  }
  search.addEventListener('input', () => { visibleLimit = 16; applyFilters(); });
  sort.addEventListener('change', applyFilters);
  custom.addEventListener('change', () => { visibleLimit = 16; applyFilters(); });
  $$('input[name="category"]', catalog).forEach(input => input.addEventListener('change', () => { visibleLimit = 16; applyFilters(); }));
  $$('[data-clear-filters]', catalog).forEach(button => button.addEventListener('click', () => { search.value = ''; custom.checked = false; $('input[name="category"][value=""]', catalog).checked = true; sort.value = 'featured'; visibleLimit = 16; applyFilters(); }));
  more.addEventListener('click', () => { visibleLimit += 16; applyFilters(); });
  $$('[data-view]', catalog).forEach(button => button.addEventListener('click', () => {
    grid.classList.toggle('is-list', button.dataset.view === 'list');
    $$('[data-view]', catalog).forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
  const filterToggle = $('.filter-toggle', catalog), filters = $('.filters', catalog);
  filterToggle.addEventListener('click', () => { const open = filters.classList.toggle('open'); filterToggle.setAttribute('aria-expanded', String(open)); });
  const params = new URLSearchParams(location.search);
  if (params.has('q')) search.value = params.get('q');
  applyFilters();
}

function safeImage(value) {
  try { const url = new URL(value, location.origin); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
const quoteCatalog = (() => {
  try { return JSON.parse($('#quote-catalog')?.textContent || '{}'); } catch { return {}; }
})();
const quoteDocumentIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2h9l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M15 2v5h5M8 11h8M8 15h7M8 19h4"/></svg>';
const quoteBoxIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10"/></svg>';
const quoteTrashIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></svg>';
const clampQuantity = value => {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 ? Math.min(number, 99999) : 1;
};
function changeQuoteItem(sku, field, value, rerender = true) {
  const items = getQuote();
  const item = items.find(entry => entry.sku === sku);
  if (!item) return;
  item[field] = value;
  saveQuote(items, rerender);
}
function renderQuote() {
  const host = $('[data-quote-items]'); if (!host) return;
  const items = getQuote();
  host.replaceChildren();
  $('[data-quote-total]').textContent = items.length;
  $('[data-send-quote]').disabled = items.length === 0;
  $('[data-clear-quote]').disabled = items.length === 0;
  if (!items.length) {
    const empty = document.createElement('div'); empty.className = 'quote-empty';
    empty.innerHTML = `<div class="quote-empty__icon">${quoteDocumentIcon}<span aria-hidden="true">+</span></div><h2>Sua lista está vazia</h2><p>Explore nosso catálogo e adicione os produtos que deseja consultar.</p><a href="/produtos" class="btn btn-primary">${quoteBoxIcon}<span>EXPLORAR PRODUTOS</span><span class="quote-arrow" aria-hidden="true">→</span></a>`;
    host.append(empty); return;
  }
  items.forEach((item, index) => {
    const meta = quoteCatalog[item.sku] || {};
    const name = meta.name || item.name || 'Produto';
    const row = document.createElement('article'); row.className = 'quote-item';
    const head = document.createElement('div'); head.className = 'quote-item__head';
    const image = document.createElement('div'); image.className = 'quote-item-image';
    const imageUrl = safeImage(meta.image || item.image);
    if (imageUrl) { const img = document.createElement('img'); img.src = imageUrl; img.alt = name; img.loading = index < 3 ? 'eager' : 'lazy'; image.append(img); } else image.textContent = '▦';
    const copy = document.createElement('div'); copy.className = 'quote-item__copy';
    const metadata = document.createElement('div'); metadata.className = 'quote-item__meta';
    if (meta.category) { const category = document.createElement('span'); category.textContent = meta.category; metadata.append(category); }
    if (item.sku) { const sku = document.createElement('span'); sku.className = 'quote-item__sku'; sku.textContent = `CÓDIGO ${item.sku}`; metadata.append(sku); }
    const title = document.createElement('h2'); title.textContent = name;
    copy.append(metadata, title);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'quote-remove'; remove.innerHTML = `${quoteTrashIcon}<span>Remover</span>`; remove.setAttribute('aria-label', `Remover ${name}`);
    remove.addEventListener('click', () => { saveQuote(getQuote().filter(entry => entry.sku !== item.sku)); toast(`${name} removido da lista.`); });
    head.append(image, copy, remove);
    const fields = document.createElement('div'); fields.className = 'quote-fields';
    const qtyLabel = document.createElement('label'); qtyLabel.textContent = 'Quantidade';
    const qtyId = `quote-quantity-${index}`;
    const qtyControls = document.createElement('div'); qtyControls.className = 'quote-qty';
    const qtyMinus = document.createElement('button'); qtyMinus.type = 'button'; qtyMinus.textContent = '−'; qtyMinus.setAttribute('aria-label', `Diminuir quantidade de ${name}`); qtyMinus.disabled = clampQuantity(item.quantity) <= 1;
    qtyMinus.addEventListener('click', () => changeQuoteItem(item.sku, 'quantity', Math.max(1, clampQuantity(item.quantity) - 1)));
    const qty = document.createElement('input'); qty.id = qtyId; qty.type = 'number'; qty.inputMode = 'numeric'; qty.min = '1'; qty.max = '99999'; qty.step = '1'; qty.value = clampQuantity(item.quantity); qty.setAttribute('aria-label', `Quantidade para ${name}`);
    qty.addEventListener('input', () => {
      const valid = /^[1-9]\d*$/.test(qty.value) && Number(qty.value) <= 99999;
      if (valid) changeQuoteItem(item.sku, 'quantity', Number(qty.value), false);
      qtyMinus.disabled = !valid || Number(qty.value) <= 1;
      qtyPlus.disabled = !valid || Number(qty.value) >= 99999;
    });
    qty.addEventListener('blur', () => { const valid = /^[1-9]\d*$/.test(qty.value) && Number(qty.value) <= 99999; if (!valid) toast('Informe uma quantidade inteira entre 1 e 99999.'); changeQuoteItem(item.sku, 'quantity', clampQuantity(qty.value)); });
    const qtyPlus = document.createElement('button'); qtyPlus.type = 'button'; qtyPlus.textContent = '+'; qtyPlus.setAttribute('aria-label', `Aumentar quantidade de ${name}`); qtyPlus.disabled = clampQuantity(item.quantity) >= 99999;
    qtyPlus.addEventListener('click', () => changeQuoteItem(item.sku, 'quantity', Math.min(99999, clampQuantity(item.quantity) + 1)));
    qtyControls.append(qtyMinus, qty, qtyPlus); qtyLabel.append(qtyControls);
    const measureLabel = document.createElement('label'); measureLabel.textContent = 'Medidas (se necessário)';
    const measure = document.createElement('input'); measure.type = 'text'; measure.maxLength = 300; measure.placeholder = 'Ex.: comprimento, largura, espessura'; measure.value = item.measures ?? item.note ?? ''; measure.setAttribute('aria-label', `Medidas para ${name}`);
    measure.addEventListener('input', () => changeQuoteItem(item.sku, 'measures', measure.value, false)); measureLabel.append(measure);
    const observationLabel = document.createElement('label'); observationLabel.textContent = 'Observações (opcional)';
    const observation = document.createElement('textarea'); observation.rows = 1; observation.maxLength = 500; observation.placeholder = 'Informações adicionais sobre este produto'; observation.value = item.observations || ''; observation.setAttribute('aria-label', `Observações para ${name}`);
    observation.addEventListener('input', () => changeQuoteItem(item.sku, 'observations', observation.value, false)); observationLabel.append(observation);
    fields.append(qtyLabel, measureLabel, observationLabel);
    row.append(head, fields); host.append(row);
  });
}

function openWhatsapp(message) { window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer'); }
const sendQuote = $('[data-send-quote]');
if (sendQuote) {
  renderQuote();
  sendQuote.addEventListener('click', () => {
    const items = getQuote(); if (!items.length) { toast('Adicione um produto antes de solicitar o orçamento.'); return; }
    const lines = ['Olá, MG Borrachas!', '', 'Gostaria de solicitar um orçamento dos seguintes produtos:', ''];
    items.forEach((item, index) => {
      const name = quoteCatalog[item.sku]?.name || item.name || 'Produto';
      lines.push(`${index + 1}. ${name}`);
      if (item.sku) lines.push(`Código: ${item.sku}`);
      lines.push(`Quantidade: ${clampQuantity(item.quantity)}`);
      const measures = String(item.measures ?? item.note ?? '').trim();
      const observations = String(item.observations || '').trim();
      if (measures) lines.push(`Medidas: ${measures}`);
      if (observations) lines.push(`Observações: ${observations}`);
      lines.push('');
    });
    lines.push('Aguardo o retorno da equipe comercial.');
    openWhatsapp(lines.join('\n'));
  });
  const clearDialog = $('[data-clear-dialog]');
  $('[data-clear-quote]').addEventListener('click', () => { if (getQuote().length) clearDialog.showModal(); });
  $('[data-clear-cancel]').addEventListener('click', () => clearDialog.close());
  $('[data-clear-confirm]').addEventListener('click', () => { saveQuote([]); clearDialog.close(); toast('Itens removidos da sua lista de orçamento.'); });
  clearDialog.addEventListener('click', event => { if (event.target === clearDialog) clearDialog.close(); });
}

updateCount();

const categoryRail = $('[data-category-rail]');
if (categoryRail) {
  const distance = () => categoryRail.querySelector('.category-card')?.getBoundingClientRect().width * 2 + 18 || 320;
  $('[data-category-prev]')?.addEventListener('click', () => categoryRail.scrollBy({ left: -distance(), behavior: 'smooth' }));
  $('[data-category-next]')?.addEventListener('click', () => categoryRail.scrollBy({ left: distance(), behavior: 'smooth' }));
}
