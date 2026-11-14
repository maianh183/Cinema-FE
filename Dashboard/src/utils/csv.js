export function downloadCsv(name, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const escape = (value) => {
    let text = String(value ?? '');
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const content = [
    keys.map(escape).join(','),
    ...rows.map((r) => keys.map((k) => escape(r[k])).join(',')),
  ].join('\r\n');
  const url = URL.createObjectURL(
    new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
