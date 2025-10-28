(function(){
  const css = `
.theme-lemon { color: #1f2937; }
.theme-lemon h1 { font-size: 22px; font-weight: 700; color: #ca8a04; margin: 18px 0 12px; }
.theme-lemon h2 { font-size: 20px; font-weight: 700; color: #713f12; margin: 16px 0 10px; padding-left: 10px; border-left: 4px solid #facc15; }
.theme-lemon h3 { font-size: 18px; font-weight: 600; color: #854d0e; margin: 14px 0 8px; }
.theme-lemon p { margin: 10px 0 12px; text-align: justify; font-size: 16px; line-height: 1.9; color: #374151; }
.theme-lemon blockquote { margin: 12px 0; padding: 12px 14px; background: #fffbeb; color: #713f12; border-left: 4px solid #fde68a; border-radius: 6px; }
.theme-lemon ul { margin: 10px 0; padding-left: 22px; list-style: circle; }
.theme-lemon ol { margin: 10px 0; padding-left: 22px; }
.theme-lemon li { margin: 6px 0; line-height: 1.9; }
.theme-lemon a { color: #b45309; text-decoration: none; }
.theme-lemon a:hover { text-decoration: underline; }
.theme-lemon hr { height: 1px; border: none; background: #fde68a; margin: 16px 0; }
.theme-lemon code { background: #fffbeb; color: #713f12; padding: 2px 6px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 85%; }
.theme-lemon strong { color: #854d0e; font-weight: 700; }
.theme-lemon em { color: #ca8a04; }
`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();
