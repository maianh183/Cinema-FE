export function validateFields(fields, values) {
  const errors = {};
  for (const f of fields) {
    const value = values[f.name];
    const text = String(value ?? '').trim();
    if (f.required && !text) errors[f.name] = 'Vui lòng nhập ' + f.label.toLowerCase() + '.';
    else if (text && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))
      errors[f.name] = 'Email không hợp lệ.';
    else if (
      f.type === 'number' &&
      text &&
      (!Number.isFinite(Number(value)) ||
        (f.integer && !Number.isInteger(Number(value))) ||
        (f.min !== undefined && Number(value) < f.min) ||
        (f.max !== undefined && Number(value) > f.max))
    )
      errors[f.name] =
        'Giá trị không hợp lệ' + (f.min !== undefined ? ' (tối thiểu ' + f.min + ')' : '') + '.';
    else if (f.maxLength && text.length > f.maxLength)
      errors[f.name] = 'Tối đa ' + f.maxLength + ' ký tự.';
    else if (f.name === 'slug' && text && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text))
      errors[f.name] = 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.';
  }
  return errors;
}
export function validateImage(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
  if (file.size === 0 || file.size > 5 * 1024 * 1024)
    throw new Error('Ảnh phải có dung lượng từ 1 byte đến 5 MB.');
}
export function safeImageUrl(value) {
  if (!value) return '';
  if (value.startsWith('/')) return value.startsWith('//') ? '' : value;
  try {
    const u = new URL(value);
    return ['http:', 'https:', 'blob:'].includes(u.protocol) ||
      /^data:image\/(png|jpeg|webp);base64,/.test(value)
      ? value
      : '';
  } catch {
    return '';
  }
}
