(function(){
  const css = `
.theme-default { color: #1d1d1f; }
.theme-default h1 { font-size: 22px; font-weight: 700; color: #111111; margin: 18px 0 12px; line-height: 1.6; }
.theme-default h2 { font-size: 20px; font-weight: 700; color: #111111; margin: 16px 0 10px; padding-left: 10px; border-left: 3px solid #0a84ff; }
.theme-default h3 { font-size: 18px; font-weight: 600; color: #111111; margin: 14px 0 8px; }
.theme-default p { margin: 10px 0 12px; text-align: justify; font-size: 16px; line-height: 1.9; color: #595959; }
.theme-default blockquote { margin: 14px 0; padding: 12px 14px; color: #3a3a3c; font-size: 15px; line-height: 1.9; background: #f8f9fa; border-left: 4px solid #0a84ff; border-radius: 6px; }
.theme-default ul { margin: 10px 0; padding-left: 22px; list-style: circle; }
.theme-default ol { margin: 10px 0; padding-left: 22px; }
.theme-default li { margin: 6px 0; line-height: 1.9; color: #333; }
.theme-default a { color: #0a84ff; text-decoration: none; }
.theme-default a:hover { text-decoration: underline; }
.theme-default hr { height: 1px; border: none; margin: 16px 0; background: #e9ecef; }
.theme-default strong { font-weight: 700; color: #111111; }
.theme-default em { color: #595959; font-style: italic; }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();
