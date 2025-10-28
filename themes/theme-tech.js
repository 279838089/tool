(function(){
  const css = `
.theme-tech { color: #1f2937; }
.theme-tech h1 { font-size: 22px; font-weight: 700; color: #0ea5e9; margin: 18px 0 12px; line-height: 1.5; letter-spacing: 0.2px; }
.theme-tech h2 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 16px 0 10px; padding-left: 10px; border-left: 4px solid #3b82f6; }
.theme-tech h3 { font-size: 18px; font-weight: 600; color: #0f172a; margin: 14px 0 8px; }
.theme-tech p { margin: 10px 0 12px; text-align: justify; font-size: 16px; line-height: 1.9; color: #374151; }
.theme-tech blockquote { margin: 12px 0; padding: 12px 14px; background: #f0f9ff; color: #0c4a6e; border-left: 4px solid #38bdf8; border-radius: 6px; }
.theme-tech ul { margin: 10px 0; padding-left: 22px; list-style: circle; }
.theme-tech ol { margin: 10px 0; padding-left: 22px; }
.theme-tech li { margin: 6px 0; line-height: 1.9; }
.theme-tech a { color: #2563eb; text-decoration: none; }
.theme-tech a:hover { text-decoration: underline; }
.theme-tech hr { height: 1px; border: none; background: #e5e7eb; margin: 16px 0; }
.theme-tech code { background: #eef2ff; color: #1e3a8a; padding: 2px 6px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 85%; }
.theme-tech strong { color: #0f172a; font-weight: 700; }
.theme-tech em { color: #0ea5e9; }
`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();
