(function(){
  const css = `
.theme-apple { color: #1d1d1f; }
.theme-apple h1 { font-size: 22px; font-weight: 700; color: #1d1d1f; margin: 18px 0 14px; line-height: 1.5; letter-spacing: 0.2px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; }
.theme-apple h2 { font-size: 20px; font-weight: 700; color: #1d1d1f; margin: 16px 0 12px; line-height: 1.55; letter-spacing: 0.2px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; }
.theme-apple h3 { font-size: 18px; font-weight: 600; color: #1d1d1f; margin: 14px 0 10px; line-height: 1.6; letter-spacing: 0.15px; }
.theme-apple p { margin: 10px 0 12px; text-align: justify; font-size: 16px; line-height: 1.8; color: #1d1d1f; letter-spacing: 0; }
.theme-apple blockquote { margin: 12px 0; padding: 12px 14px; background: #f5f5f7; border-left: 4px solid #d2d2d7; color: #3a3a3c; border-radius: 8px; }
.theme-apple a { color: #007aff; text-decoration: none; }
.theme-apple a:hover { text-decoration: underline; }
.theme-apple strong { font-weight: 700; color: #1d1d1f; }
.theme-apple em { font-style: italic; color: #3a3a3c; }
.theme-apple ul { margin: 10px 0; padding-left: 22px; list-style: circle; }
.theme-apple ol { margin: 10px 0; padding-left: 22px; }
.theme-apple li { margin: 6px 0; line-height: 1.8; color: #1d1d1f; }
.theme-apple hr { height: 1px; border: none; margin: 16px 0; background: #d2d2d7; }
.theme-apple img { width: 100%; height: auto; margin: 12px 0; border-radius: 8px; }
.theme-apple code { background: #f2f2f7; padding: 2px 6px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 85%; }
`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

