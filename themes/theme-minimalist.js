(function(){
  const css = `
.theme-minimalist { color: #121212; font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif; letter-spacing: 0.01em; }
.theme-minimalist h1 { font-size: 24px; font-weight: 600; color: #0f0f0f; margin: 32px 0 18px; letter-spacing: 0.06em; }
.theme-minimalist h2 { font-size: 20px; font-weight: 600; color: #111; margin: 28px 0 14px; border-bottom: 1px solid #ebebeb; padding-bottom: 6px; letter-spacing: 0.04em; }
.theme-minimalist h3 { font-size: 18px; font-weight: 500; color: #222; margin: 22px 0 12px; letter-spacing: 0.02em; }
.theme-minimalist p { margin: 18px 0; font-size: 16.5px; line-height: 2; color: #222; text-align: left; }
.theme-minimalist p + p { margin-top: 14px; }
.theme-minimalist blockquote { margin: 26px 0; padding: 14px 20px; background: #f8f8f8; border-left: 4px solid #e6e6e6; color: #1f1f1f; font-size: 16px; line-height: 1.9; }
.theme-minimalist ul,
.theme-minimalist ol { margin: 18px 0; padding-left: 24px; }
.theme-minimalist li { margin: 8px 0; line-height: 1.95; color: #1a1a1a; }
.theme-minimalist a { color: #111; text-decoration: underline; text-decoration-thickness: 1px; }
.theme-minimalist a:hover { text-decoration-thickness: 2px; }
.theme-minimalist hr { height: 1px; border: none; margin: 30px 0; background: linear-gradient(to right, #eaeaea, #dcdcdc, #eaeaea); }
.theme-minimalist strong { font-weight: 600; color: #111; }
.theme-minimalist em { font-style: italic; color: #444; }
.theme-minimalist code { background: #f3f3f3; padding: 2px 4px; border-radius: 4px; font-size: 14px; color: #2d2d2d; }
.theme-minimalist pre code { display: block; padding: 16px; line-height: 1.7; }
`; 
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

