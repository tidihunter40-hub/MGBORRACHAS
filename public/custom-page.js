export function buildCustomQuoteMessage(data) {
  const get = name => String(data.get(name) || '').trim();
  const lines = ['Olá! Vim pelo site da MG Borrachas e gostaria de consultar uma peça sob medida.', '', `Nome: ${get('nome')}`];
  if (get('empresa')) lines.push(`Empresa: ${get('empresa')}`);
  lines.push(`Produto desejado: ${get('produto')}`, `Quantidade: ${get('quantidade')}`);
  if (get('medidas')) lines.push(`Medidas: ${get('medidas')}`);
  if (get('material')) lines.push(`Material: ${get('material')}`);
  if (get('aplicacao')) lines.push(`Aplicação / Observações: ${get('aplicacao')}`);
  lines.push('', 'Aguardo retorno sobre as possibilidades de fabricação e orçamento.');
  return lines.join('\n');
}

if (typeof document !== 'undefined') {
  const form = document.querySelector('[data-custom-form]');
  if (form) {
    const fields = [...form.querySelectorAll('input, select, textarea')];
    const status = form.querySelector('[data-custom-status]');
    const validate = field => {
      const value = field.value.trim();
      let error = '';
      if (field.required && !value) error = 'Preencha este campo para continuar.';
      else if (field.name === 'quantidade' && value && (!field.validity.valid || !Number.isInteger(Number(value)))) error = 'Informe uma quantidade inteira entre 1 e 99.999.';
      else if (!field.validity.valid) error = 'Confira o valor informado.';
      field.setAttribute('aria-invalid', error ? 'true' : 'false');
      const errorNode = form.querySelector(`#custom-${field.name}-error`);
      if (errorNode) errorNode.textContent = error;
      return !error;
    };
    fields.forEach(field => {
      field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') validate(field); status.textContent = ''; });
      field.addEventListener('change', () => { if (field.getAttribute('aria-invalid') === 'true') validate(field); });
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const invalid = fields.filter(field => !validate(field));
      if (invalid.length) {
        status.textContent = 'Confira os campos destacados antes de continuar.';
        invalid[0].focus();
        return;
      }
      status.textContent = '';
      const number = String(document.body.dataset.whatsapp || '').replace(/\D/g, '');
      const message = buildCustomQuoteMessage(new FormData(form));
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    });
  }
}
