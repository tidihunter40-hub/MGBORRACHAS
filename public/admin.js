const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const slugify = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let state = { products: [], categories: [], banners: [], documents: [], settings: {} };

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: { ...(body && !(body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body == null ? undefined : body instanceof Blob ? body : JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Erro ${response.status}`);
  return result;
}
function alertMessage(message, error = false) {
  const el = $('[data-admin-alert]'); if (!el) return;
  el.textContent = message; el.classList.toggle('error', error); el.hidden = false;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function field(form, name) { return form.elements.namedItem(name); }
function option(value, text) { const el = document.createElement('option'); el.value = value; el.textContent = text; return el; }
function button(text, action) { const el = document.createElement('button'); el.type = 'button'; el.textContent = text; el.addEventListener('click', action); return el; }
async function reload() { state = await request('/api/admin/data'); render(); }

const loginForm = $('[data-login-form]');
if (loginForm) loginForm.addEventListener('submit', async event => {
  event.preventDefault(); const submit = $('button[type=submit]', loginForm), error = $('[data-form-error]', loginForm);
  submit.disabled = true; error.hidden = true;
  try { await request('/api/admin/login', { method: 'POST', body: { email: field(loginForm, 'email').value, password: field(loginForm, 'password').value } }); location.href = '/admin'; }
  catch (cause) { error.textContent = cause.message; error.hidden = false; submit.disabled = false; }
});
$$('[data-logout]').forEach(el => el.addEventListener('click', async () => { try { await request('/api/admin/logout', { method: 'POST' }); } finally { location.href = '/admin/login'; } }));
const mobileMenu = $('[data-admin-menu]');
if (mobileMenu) mobileMenu.addEventListener('click', () => { const nav = $('#admin-nav'); nav.hidden = !nav.hidden; mobileMenu.setAttribute('aria-expanded', String(!nav.hidden)); });

function renderStats() {
  const host = $('[data-admin-stats]'); if (!host) return;
  const values = [state.products.length, state.products.filter(x => x.status === 'published').length, state.products.filter(x => x.status === 'draft').length, state.categories.filter(x => x.is_active).length, state.products.filter(x => !x.product_images?.length).length];
  $$('strong', host).forEach((el, i) => { el.textContent = values[i]; });
}
function fillCategoryOptions(select, selected = '') {
  select.replaceChildren(option('', 'Selecione uma categoria'), ...state.categories.map(c => option(c.id, c.name)));
  select.value = selected;
}
function openProduct(product) {
  const dialog = $('[data-product-dialog]'), form = $('[data-product-form]'); if (!dialog) return;
  form.reset();
  $('[data-product-dialog-title]').textContent = product ? 'Editar produto' : 'Novo produto';
  field(form, 'id').value = product?.id || '';
  fillCategoryOptions(field(form, 'category_id'), product?.category_id || '');
  for (const key of ['sku', 'name', 'slug', 'short_description', 'description', 'applications', 'sort_order']) field(form, key).value = product?.[key] ?? '';
  field(form, 'status').value = product?.status ?? 'draft';
  field(form, 'featured').checked = Boolean(product?.featured); field(form, 'custom').checked = Boolean(product?.custom);
  field(form, 'features').value = product?.features?.join('\n') || '';
  field(form, 'technical').value = Object.entries(product?.technical || {}).map(([key, value]) => `${key}: ${value}`).join('\n');
  dialog.showModal();
}
function renderProducts() {
  const table = $('[data-products-table]'); if (!table) return; table.replaceChildren();
  const allToggle = $('[data-select-all]'); if (allToggle) { allToggle.checked = false; allToggle.indeterminate = false; }
  state.products.forEach(product => {
    const row = document.createElement('tr');
    const selection = document.createElement('td'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.dataset.productSelect = product.id; checkbox.setAttribute('aria-label', `Selecionar ${product.name}`); checkbox.addEventListener('change', updateBulkSelection); selection.append(checkbox);
    const sku = document.createElement('td'); sku.textContent = product.sku;
    const name = document.createElement('td'); name.textContent = product.name;
    const category = document.createElement('td'); category.textContent = state.categories.find(c => c.id === product.category_id)?.name || '—';
    const statusCell = document.createElement('td'); const status = document.createElement('span'); status.className = `status ${product.status}`; status.textContent = ({ draft: 'Rascunho', published: 'Publicado', archived: 'Arquivado' })[product.status] || product.status; statusCell.append(status);
    const actions = document.createElement('td');
    const publishAction = product.status === 'published' ? 'unpublish' : 'publish';
    const publishLabel = product.status === 'published' ? 'Voltar a rascunho' : 'Publicar';
    actions.append(
      button('Editar', () => openProduct(product)),
      button(publishLabel, async () => {
        try {
          const result = await request('/api/admin/products/bulk', { method: 'PATCH', body: { ids: [product.id], action: publishAction } });
          if (result.updated !== 1) throw new Error('O produto não foi atualizado. Recarregue a página.');
          await reload(); alertMessage(product.status === 'published' ? 'Produto voltou a rascunho.' : 'Produto publicado no catálogo.');
        } catch (error) { alertMessage(error.message, true); }
      }),
      button('Excluir', async () => { if (!confirm(`Excluir ${product.name}? Essa ação também removerá suas imagens e não pode ser desfeita.`)) return; try { await request(`/api/admin/products/${product.id}`, { method: 'DELETE' }); await reload(); alertMessage('Produto excluído.'); } catch (error) { alertMessage(error.message, true); } })
    );
    row.append(selection, sku, name, category, statusCell, actions); table.append(row);
  });
  const categorySelect = $('[data-bulk-category]');
  if (categorySelect) categorySelect.replaceChildren(option('', 'Selecione uma categoria'), ...state.categories.map(c => option(c.id, c.name)));
  updateBulkSelection();
}
function selectedProductIds() { return $$('[data-product-select]:checked').map(input => input.dataset.productSelect); }
function updateBulkSelection() {
  const selected = selectedProductIds(), all = $$('[data-product-select]');
  const count = $('[data-selected-count]'); if (count) count.textContent = `${selected.length} selecionado${selected.length === 1 ? '' : 's'}`;
  const apply = $('[data-bulk-apply]'); if (apply) apply.disabled = !selected.length;
  const master = $('[data-select-all]'); if (master) { master.checked = Boolean(all.length) && selected.length === all.length; master.indeterminate = selected.length > 0 && selected.length < all.length; }
}
const bulkAction = $('[data-bulk-action]');
if (bulkAction) {
  const categoryWrap = $('[data-bulk-category-wrap]');
  bulkAction.addEventListener('change', () => { categoryWrap.hidden = bulkAction.value !== 'move'; });
  $('[data-select-all]').addEventListener('change', event => { $$('[data-product-select]').forEach(input => { input.checked = event.target.checked; }); updateBulkSelection(); });
  $('[data-bulk-apply]').addEventListener('click', async event => {
    const ids = selectedProductIds(), action = bulkAction.value;
    if (!ids.length || !action) { alertMessage('Selecione produtos e uma ação.', true); return; }
    const categoryId = $('[data-bulk-category]').value;
    if (action === 'move' && !categoryId) { alertMessage('Selecione a nova categoria.', true); return; }
    if (action === 'delete' && !confirm(`Excluir permanentemente ${ids.length} produto${ids.length === 1 ? '' : 's'} e suas imagens? Esta ação não pode ser desfeita.`)) return;
    event.currentTarget.disabled = true;
    try {
      const result = await request('/api/admin/products/bulk', { method: action === 'delete' ? 'DELETE' : 'PATCH', body: { ids, action, category_id: categoryId } });
      const changed = action === 'delete' ? result.deleted : result.updated;
      if (changed !== ids.length) throw new Error(`Somente ${changed} de ${ids.length} produtos foram alterados. Recarregue a página.`);
      await reload();
      alertMessage(`${changed} produto${changed === 1 ? '' : 's'} ${action === 'delete' ? 'excluído' : 'atualizado'}${changed === 1 ? '' : 's'}.${result.orphaned_files ? ` ${result.orphaned_files} arquivo(s) não puderam ser removidos do armazenamento.` : ''}`, Boolean(result.orphaned_files));
    } catch (error) { alertMessage(error.message, true); updateBulkSelection(); }
  });
}
const productDialog = $('[data-product-dialog]');
if (productDialog) {
  $('[data-new-product]').addEventListener('click', () => openProduct());
  $$('[data-close-dialog]', productDialog).forEach(el => el.addEventListener('click', () => productDialog.close()));
  productDialog.addEventListener('click', event => { if (event.target === productDialog) productDialog.close(); });
  const form = $('[data-product-form]');
  field(form, 'name').addEventListener('input', () => { if (!field(form, 'id').value) field(form, 'slug').value = slugify(field(form, 'name').value); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); const id = field(form, 'id').value;
    const technical = Object.fromEntries(field(form, 'technical').value.split('\n').map(line => line.split(/:(.*)/s).slice(0, 2).map(x => x.trim())).filter(pair => pair.length === 2 && pair[0] && pair[1]));
    const payload = Object.fromEntries(['sku', 'name', 'slug', 'category_id', 'status', 'short_description', 'description', 'applications', 'sort_order'].map(key => [key, field(form, key).value]));
    payload.features = field(form, 'features').value.split('\n').map(x => x.trim()).filter(Boolean); payload.technical = technical; payload.featured = field(form, 'featured').checked; payload.custom = field(form, 'custom').checked;
    try { await request(id ? `/api/admin/products/${id}` : '/api/admin/products', { method: id ? 'PATCH' : 'POST', body: payload }); productDialog.close(); await reload(); alertMessage('Produto salvo.'); }
    catch (error) { alert(error.message); }
  });
}

function renderCategories() {
  const host = $('[data-categories-list]'); if (!host) return; host.replaceChildren();
  state.categories.forEach(category => {
    const row = document.createElement('div'); row.className = 'admin-category-row';
    const info = document.createElement('div'); const title = document.createElement('strong'); title.textContent = category.name; const detail = document.createElement('small'); detail.textContent = `${category.slug} · ${category.is_active ? 'Ativa' : 'Inativa'}`; info.append(title, detail);
    const actions = document.createElement('div'); actions.append(button('Editar', () => editCategory(category)), button('Excluir', async () => { if (!confirm(`Excluir a categoria ${category.name}?`)) return; try { await request(`/api/admin/categories/${category.id}`, { method: 'DELETE' }); await reload(); alertMessage('Categoria excluída.'); } catch (error) { alertMessage(error.message, true); } }));
    row.append(info, actions); host.append(row);
  });
}
function editCategory(category) {
  const form = $('[data-category-form]'); if (!form) return;
  field(form, 'id').value = category.id; for (const key of ['name', 'slug', 'description', 'sort_order']) field(form, key).value = category[key] ?? '';
  const images = state.products.filter(product => product.category_id === category.id && product.status === 'published').flatMap(product => (product.product_images || []).map(image => ({ id: image.id, label: `${product.sku} — ${product.name}` })));
  field(form, 'image_id').replaceChildren(option('', 'Sem imagem'), ...images.map(image => option(image.id, image.label)));
  field(form, 'image_id').value = category.image_id || '';
  field(form, 'is_active').checked = category.is_active; $('[data-category-form-title]').textContent = 'Editar categoria'; form.scrollIntoView({ behavior: 'smooth' });
}
const categoryForm = $('[data-category-form]');
if (categoryForm) {
  field(categoryForm, 'name').addEventListener('input', () => { if (!field(categoryForm, 'id').value) field(categoryForm, 'slug').value = slugify(field(categoryForm, 'name').value); });
  $('[data-reset-category]').addEventListener('click', () => { categoryForm.reset(); field(categoryForm, 'id').value = ''; field(categoryForm, 'image_id').replaceChildren(option('', 'Salve a categoria primeiro')); $('[data-category-form-title]').textContent = 'Nova categoria'; });
  categoryForm.addEventListener('submit', async event => {
    event.preventDefault(); const id = field(categoryForm, 'id').value;
    const payload = Object.fromEntries(['name', 'slug', 'description', 'sort_order', 'image_id'].map(key => [key, field(categoryForm, key).value])); payload.is_active = field(categoryForm, 'is_active').checked;
    try { await request(id ? `/api/admin/categories/${id}` : '/api/admin/categories', { method: id ? 'PATCH' : 'POST', body: payload }); categoryForm.reset(); field(categoryForm, 'id').value = ''; $('[data-category-form-title]').textContent = 'Nova categoria'; await reload(); alertMessage('Categoria salva.'); } catch (error) { alertMessage(error.message, true); }
  });
}

function renderBanners() {
  const host = $('[data-banners-list]'); if (!host) return; host.replaceChildren();
  const imageSelect = $('[data-banner-image]');
  const selected = imageSelect.value;
  const photos = state.products.filter(product => product.status === 'published').flatMap(product => (product.product_images || []).map(image => ({ id: image.id, label: `${product.sku} — ${product.name}` })));
  imageSelect.replaceChildren(option('', 'Sem foto'), ...photos.map(photo => option(photo.id, photo.label)));
  imageSelect.value = selected;
  (state.banners || []).forEach(banner => {
    const row = document.createElement('div'); row.className = 'admin-category-row';
    const info = document.createElement('div'); const title = document.createElement('strong'); title.textContent = banner.title;
    const detail = document.createElement('small'); detail.textContent = `${banner.is_active ? 'Ativo' : 'Inativo'} · ordem ${banner.sort_order}`; info.append(title, detail);
    const actions = document.createElement('div'); actions.append(button('Editar', () => editBanner(banner)), button('Excluir', async () => {
      if (!confirm(`Excluir o banner ${banner.title}?`)) return;
      try { await request(`/api/admin/banners/${banner.id}`, { method: 'DELETE' }); await reload(); alertMessage('Banner excluído.'); } catch (error) { alertMessage(error.message, true); }
    }));
    row.append(info, actions); host.append(row);
  });
}
function editBanner(banner) {
  const form = $('[data-banner-form]'); if (!form) return;
  for (const key of ['id', 'title', 'description', 'image_id', 'cta_label', 'cta_href', 'sort_order']) field(form, key).value = banner[key] ?? '';
  field(form, 'is_active').checked = Boolean(banner.is_active);
  $('[data-banner-form-title]').textContent = 'Editar banner'; form.scrollIntoView({ behavior: 'smooth' });
}
const bannerForm = $('[data-banner-form]');
if (bannerForm) {
  $('[data-reset-banner]').addEventListener('click', () => { bannerForm.reset(); field(bannerForm, 'id').value = ''; $('[data-banner-form-title]').textContent = 'Novo banner'; });
  bannerForm.addEventListener('submit', async event => {
    event.preventDefault(); const id = field(bannerForm, 'id').value;
    const payload = Object.fromEntries(['title', 'description', 'image_id', 'cta_label', 'cta_href', 'sort_order'].map(key => [key, field(bannerForm, key).value]));
    payload.is_active = field(bannerForm, 'is_active').checked;
    try { await request(id ? `/api/admin/banners/${id}` : '/api/admin/banners', { method: id ? 'PATCH' : 'POST', body: payload }); bannerForm.reset(); field(bannerForm, 'id').value = ''; $('[data-banner-form-title]').textContent = 'Novo banner'; await reload(); alertMessage('Banner salvo.'); }
    catch (error) { alertMessage(error.message, true); }
  });
}

function renderSettings() {
  const form = $('[data-settings-form]'); if (!form) return;
  for (const key of ['company_name', 'whatsapp', 'instagram', 'hero_title', 'hero_description', 'about_text', 'seo_title', 'seo_description']) field(form, key).value = state.settings[key] || '';
  const candidates = state.products.filter(product => product.status === 'published' && product.product_images?.length);
  for (let index = 1; index <= 4; index++) {
    const select = field(form, `hero_sku_${index}`);
    select.replaceChildren(option('', 'Automática'), ...candidates.map(product => option(product.sku, `${product.sku} — ${product.name}`)));
    select.value = state.settings.hero_skus?.[index - 1] || '';
  }
}
const settingsForm = $('[data-settings-form]');
if (settingsForm) settingsForm.addEventListener('submit', async event => {
  event.preventDefault();
  const payload = Object.fromEntries(['company_name', 'whatsapp', 'instagram', 'hero_title', 'hero_description', 'about_text', 'seo_title', 'seo_description'].map(key => [key, field(settingsForm, key).value]));
  payload.hero_skus = Array.from({ length: 4 }, (_, index) => field(settingsForm, `hero_sku_${index + 1}`).value).filter(Boolean);
  try { await request('/api/admin/settings', { method: 'PATCH', body: payload }); await reload(); alertMessage('Configurações salvas.'); } catch (error) { alertMessage(error.message, true); }
});

function renderMedia() {
  const upload = $('[data-upload-product]'), picker = $('[data-image-product]'); if (!upload || !picker) return;
  const selected = picker.value, selectedUpload = upload.value;
  upload.replaceChildren(option('', 'Selecione um produto'), ...state.products.map(p => option(p.id, `${p.sku} — ${p.name}`)));
  picker.replaceChildren(option('', 'Selecione um produto'), ...state.products.map(p => option(p.id, `${p.sku} — ${p.name}`)));
  upload.value = selectedUpload;
  picker.value = selected;
  renderImages();
}
function renderImages() {
  const picker = $('[data-image-product]'), host = $('[data-image-list]'); if (!host) return;
  host.replaceChildren(); const product = state.products.find(p => p.id === picker.value); if (!product) return;
  [...(product.product_images || [])].sort((a,b) => a.sort_order - b.sort_order).forEach(image => {
    const row = document.createElement('div'); row.className = 'admin-image-row'; const img = document.createElement('img'); img.src = `/api/admin/media/${image.id}`; img.alt = image.alt_text || '';
    const controls = document.createElement('div'); const altLabel = document.createElement('label'); altLabel.textContent = 'Texto alternativo'; const alt = document.createElement('input'); alt.value = image.alt_text || ''; alt.maxLength = 200; altLabel.append(alt);
    const orderLabel = document.createElement('label'); orderLabel.textContent = 'Ordem'; const order = document.createElement('input'); order.type = 'number'; order.value = image.sort_order || 0; orderLabel.append(order);
    const primaryLabel = document.createElement('label'); const primary = document.createElement('input'); primary.type = 'checkbox'; primary.checked = image.is_primary; primaryLabel.append(primary, document.createTextNode(' Imagem principal'));
    const save = button('Salvar', async () => { try { if (primary.checked) for (const other of product.product_images.filter(x => x.id !== image.id && x.is_primary)) await request(`/api/admin/images/${other.id}`, { method: 'PATCH', body: { alt_text: other.alt_text, sort_order: other.sort_order, is_primary: false } }); await request(`/api/admin/images/${image.id}`, { method: 'PATCH', body: { alt_text: alt.value, sort_order: Number(order.value), is_primary: primary.checked } }); await reload(); alertMessage('Imagem atualizada.'); } catch (error) { alertMessage(error.message, true); } });
    const remove = button('Excluir', async () => { if (!confirm('Excluir esta imagem?')) return; try { await request(`/api/admin/images/${image.id}`, { method: 'DELETE' }); await reload(); alertMessage('Imagem excluída.'); } catch (error) { alertMessage(error.message, true); } });
    controls.append(altLabel, orderLabel, primaryLabel, save, remove); row.append(img, controls); host.append(row);
  });
}
const picker = $('[data-image-product]'); if (picker) picker.addEventListener('change', renderImages);
function uploadFile(file, progress, endpoint = '/api/admin/upload') {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open('POST', endpoint); xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress.value = Math.round(event.loaded / event.total * 100); };
    xhr.onload = () => { let value; try { value = JSON.parse(xhr.responseText); } catch { value = {}; } if (xhr.status >= 200 && xhr.status < 300) resolve(value); else reject(new Error(value.error || 'Falha no upload.')); };
    xhr.onerror = () => reject(new Error('Falha de conexão durante o upload.')); xhr.send(file);
  });
}
const uploadForm = $('[data-upload-form]');
if (uploadForm) uploadForm.addEventListener('submit', async event => {
  event.preventDefault(); const productId = field(uploadForm, 'product_id').value, files = [...field(uploadForm, 'files').files], progress = $('[data-upload-progress]');
  if (!productId || !files.length) return; progress.hidden = false;
  try {
    for (const file of files) {
      if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 4_000_000) throw new Error(`Arquivo inválido ou maior que 4 MB: ${file.name}`);
      progress.value = 0; const uploaded = await uploadFile(file, progress);
      const product = state.products.find(p => p.id === productId);
      await request('/api/admin/images', { method: 'POST', body: { product_id: productId, storage_path: uploaded.storage_path, alt_text: field(uploadForm, 'alt_text').value || product.name, sort_order: product.product_images?.length || 0, is_primary: !product.product_images?.length } });
      await reload();
    }
    $('[data-image-product]').value = productId; renderImages(); uploadForm.reset(); alertMessage('Imagens enviadas e vinculadas ao produto.');
  } catch (error) { alertMessage(error.message, true); } finally { progress.hidden = true; }
});

function renderDocuments() {
  const product = $('[data-document-product]'), picker = $('[data-document-picker]'), host = $('[data-document-list]'); if (!product || !picker || !host) return;
  const selected = picker.value;
  const options = state.products.map(p => option(p.id, `${p.sku} — ${p.name}`));
  product.replaceChildren(option('', 'Selecione um produto'), ...options);
  picker.replaceChildren(option('', 'Selecione um produto'), ...state.products.map(p => option(p.id, `${p.sku} — ${p.name}`)));
  picker.value = selected;
  host.replaceChildren();
  (state.documents || []).filter(doc => doc.product_id === picker.value).forEach(doc => {
    const row = document.createElement('div'); row.className = 'admin-category-row';
    const title = document.createElement('strong'); title.textContent = doc.title;
    const remove = button('Excluir', async () => {
      if (!confirm(`Excluir o PDF ${doc.title}?`)) return;
      try { const result = await request(`/api/admin/documents/${doc.id}`, { method: 'DELETE' }); await reload(); alertMessage(result.orphaned_files ? 'Documento excluído, mas o arquivo não pôde ser removido do armazenamento.' : 'Documento excluído.', Boolean(result.orphaned_files)); } catch (error) { alertMessage(error.message, true); }
    });
    row.append(title, remove); host.append(row);
  });
}
const documentPicker = $('[data-document-picker]');
if (documentPicker) documentPicker.addEventListener('change', renderDocuments);
const documentForm = $('[data-document-form]');
if (documentForm) documentForm.addEventListener('submit', async event => {
  event.preventDefault(); const file = field(documentForm, 'file').files[0], progress = $('[data-document-progress]');
  if (!file || file.type !== 'application/pdf' || file.size > 4_000_000) { alertMessage('Selecione um PDF de até 4 MB.', true); return; }
  progress.hidden = false; progress.value = 0;
  try {
    const uploaded = await uploadFile(file, progress, '/api/admin/upload-document');
    const productId = field(documentForm, 'product_id').value;
    await request('/api/admin/documents', { method: 'POST', body: { product_id: productId, title: field(documentForm, 'title').value, storage_path: uploaded.storage_path } });
    await reload(); $('[data-document-picker]').value = productId; renderDocuments(); documentForm.reset(); alertMessage('PDF vinculado ao produto.');
  } catch (error) { alertMessage(error.message, true); } finally { progress.hidden = true; }
});

function render() { renderStats(); renderProducts(); renderCategories(); renderBanners(); renderSettings(); renderMedia(); renderDocuments(); }
if ($('.admin-content')) reload().catch(error => alertMessage(error.message, true));
