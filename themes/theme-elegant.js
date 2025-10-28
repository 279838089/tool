(function(){
  const css = `
.theme-elegant { color: #2b2b2b; }
.theme-elegant h1 { font-size: 22px; font-weight: 700; color: #3d3d3d; margin: 18px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #e6e2da; text-align: center; letter-spacing: 0.3px; }
.theme-elegant h2 { font-size: 20px; font-weight: 600; color: #4a4a4a; margin: 16px 0 10px; padding-left: 10px; border-left: 3px solid #d4af37; }
.theme-elegant h3 { font-size: 18px; font-weight: 600; color: #5a5a5a; margin: 14px 0 8px; }
.theme-elegant p { margin: 10px 0 12px; text-align: justify; font-size: 16px; line-height: 1.9; color: #444; }
.theme-elegant blockquote { margin: 14px 0; padding: 12px 14px; color: #6b6b6b; background: #faf9f7; border-left: 4px solid #d4af37; border-radius: 6px; }
.theme-elegant ul { margin: 10px 0; padding-left: 22px; list-style: circle; }
.theme-elegant ol { margin: 10px 0; padding-left: 22px; }
.theme-elegant li { margin: 6px 0; line-height: 1.9; }
.theme-elegant a { color: #8b4513; text-decoration: none; }
.theme-elegant a:hover { text-decoration: underline; }
.theme-elegant hr { height: 1px; border: none; background: #efeae1; margin: 16px 0; }
.theme-elegant code { background: #f6f4ee; color: #6b6b6b; padding: 2px 6px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 85%; }
.theme-elegant strong { color: #3d3d3d; font-weight: 700; }
.theme-elegant em { color: #b8860b; }
`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();
