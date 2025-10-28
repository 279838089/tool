(function(){
  const css = `
.theme-warm { color: #1f2937; }
.theme-warm h1 { font-size: 22px; font-weight: 700; color: #ea580c; margin: 18px 0 12px; }
.theme-warm h2 { font-size: 20px; font-weight: 700; color: #7c2d12; margin: 16px 0 10px; padding-left: 10px; border-left: 4px solid #f59e0b; }
.theme-warm h3 { font-size: 18px; font-weight: 600; color: #9a3412; margin: 14px 0 8px; }
.theme-warm p { margin: 10px 0 12px; text-align: justify; font-size: 16px; line-height: 1.9; color: #374151; }
.theme-warm blockquote { margin: 12px 0; padding: 12px 14px; background: #fff7ed; color: #7c2d12; border-left: 4px solid #fdba74; border-radius: 6px; }
.theme-warm ul { margin: 10px 0; padding-left: 22px; list-style: circle; }
.theme-warm ol { margin: 10px 0; padding-left: 22px; }
.theme-warm li { margin: 6px 0; line-height: 1.9; }
.theme-warm a { color: #ea580c; text-decoration: none; }
.theme-warm a:hover { text-decoration: underline; }
.theme-warm hr { height: 1px; border: none; background: #fde68a; margin: 16px 0; }
.theme-warm code { background: #fff7ed; color: #9a3412; padding: 2px 6px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 85%; }
.theme-warm strong { color: #7c2d12; font-weight: 700; }
.theme-warm em { color: #ea580c; }
`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();
