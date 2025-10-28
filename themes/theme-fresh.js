(function(){
  const css = `
.theme-fresh { color: #1f2937; }
.theme-fresh h1 { font-size: 22px; font-weight: 700; color: #22c55e; margin: 18px 0 12px; }
.theme-fresh h2 { font-size: 20px; font-weight: 700; color: #14532d; margin: 16px 0 10px; padding-left: 10px; border-left: 4px solid #34d399; }
.theme-fresh h3 { font-size: 18px; font-weight: 600; color: #065f46; margin: 14px 0 8px; }
.theme-fresh p { margin: 10px 0 12px; text-align: justify; font-size: 16px; line-height: 1.9; color: #374151; }
.theme-fresh blockquote { margin: 12px 0; padding: 12px 14px; background: #ecfdf5; color: #065f46; border-left: 4px solid #34d399; border-radius: 6px; }
.theme-fresh ul { margin: 10px 0; padding-left: 22px; list-style: circle; }
.theme-fresh ol { margin: 10px 0; padding-left: 22px; }
.theme-fresh li { margin: 6px 0; line-height: 1.9; }
.theme-fresh a { color: #059669; text-decoration: none; }
.theme-fresh a:hover { text-decoration: underline; }
.theme-fresh hr { height: 1px; border: none; background: #e5e7eb; margin: 16px 0; }
.theme-fresh code { background: #f0fdf4; color: #065f46; padding: 2px 6px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 85%; }
.theme-fresh strong { color: #064e3b; font-weight: 700; }
.theme-fresh em { color: #10b981; }
`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();
