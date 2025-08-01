async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function toUrl(path) {
  return encodeURI(path).replace(/#/g, '%23');
}

async function loadBooks() {
  const container = qs('#books');
  const tpl = qs('#book-item-tpl');

  try {
    const data = await fetchJSON('/api/novels');
    const books = data.books || [];

    if (books.length === 0) {
      container.innerHTML = '<div style="color:#666;font-size:14px;">没有发现小说目录，请在仓库根目录创建 ./novels 并放入子文件夹与 Markdown 章节。</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    for (const book of books) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      qs('.book-name', node).textContent = book;
      node.href = `/reader.html?book=${encodeURIComponent(book)}`;
      frag.appendChild(node);
    }
    container.innerHTML = '';
    container.appendChild(frag);
  } catch (e) {
    console.error(e);
    container.innerHTML = '<div style="color:#d00;">加载失败，请稍后重试。</div>';
  }
}

document.addEventListener('DOMContentLoaded', loadBooks);