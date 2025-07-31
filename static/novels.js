async function loadNovels() {
    try {
        const response = await fetch('/api/novels');
        const novels = await response.json();
        
        const novelsList = document.getElementById('novels-list');
        
        if (novels.length === 0) {
            novelsList.innerHTML = '<div class="loading">暂无小说</div>';
            return;
        }
        
        novelsList.innerHTML = novels.map(novel => `
            <div class="novel-item">
                <a href="${novel.url}">
                    <h3>${novel.name}</h3>
                </a>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading novels:', error);
        document.getElementById('novels-list').innerHTML = '<div class="loading">加载失败，请重试</div>';
    }
}

document.addEventListener('DOMContentLoaded', loadNovels);