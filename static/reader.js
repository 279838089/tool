class NovelReader {
    constructor() {
        this.novelName = window.NOVEL_NAME;
        this.currentChapter = window.CHAPTER_FILE;
        this.chapters = [];
        this.currentIndex = 0;
        
        this.init();
    }
    
    async init() {
        await this.loadChapters();
        this.bindEvents();
        
        if (this.currentChapter) {
            this.loadChapter(this.currentChapter);
        } else if (this.chapters.length > 0) {
            this.loadChapter(this.chapters[0].fileName);
        }
    }
    
    async loadChapters() {
        try {
            const response = await fetch(`/api/novel/${encodeURIComponent(this.novelName)}`);
            this.chapters = await response.json();
            this.updateTOC();
        } catch (error) {
            console.error('Error loading chapters:', error);
        }
    }
    
    async loadChapter(chapterFile) {
        try {
            const response = await fetch(`/api/chapter/${encodeURIComponent(this.novelName)}/${encodeURIComponent(chapterFile)}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            document.getElementById('chapter-content').innerHTML = `
                <h2>${data.title}</h2>
                ${this.formatContent(data.content)}
            `;
            
            document.getElementById('chapter-title').textContent = data.title;
            
            this.currentChapter = chapterFile;
            this.currentIndex = this.chapters.findIndex(c => c.fileName === chapterFile);
            
            this.updateNavigation();
            this.updateURL();
            
            window.scrollTo(0, 0);
        } catch (error) {
            console.error('Error loading chapter:', error);
            document.getElementById('chapter-content').innerHTML = '<div class="loading">加载失败，请重试</div>';
        }
    }
    
    formatContent(content) {
        return content
            .split('\n\n')
            .map(paragraph => `<p>${paragraph.trim()}</p>`)
            .join('');
    }
    
    updateNavigation() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        prevBtn.disabled = this.currentIndex <= 0;
        nextBtn.disabled = this.currentIndex >= this.chapters.length - 1;
    }
    
    updateURL() {
        const url = `/novel/${encodeURIComponent(this.novelName)}/${encodeURIComponent(this.currentChapter)}`;
        history.replaceState(null, null, url);
    }
    
    updateTOC() {
        const tocList = document.getElementById('toc-list');
        tocList.innerHTML = this.chapters.map((chapter, index) => `
            <a href="#" class="toc-item ${chapter.fileName === this.currentChapter ? 'active' : ''}" 
               data-chapter="${chapter.fileName}">
                ${chapter.title}
            </a>
        `).join('');
    }
    
    bindEvents() {
        document.getElementById('prev-btn').addEventListener('click', () => {
            if (this.currentIndex > 0) {
                this.loadChapter(this.chapters[this.currentIndex - 1].fileName);
            }
        });
        
        document.getElementById('next-btn').addEventListener('click', () => {
            if (this.currentIndex < this.chapters.length - 1) {
                this.loadChapter(this.chapters[this.currentIndex + 1].fileName);
            }
        });
        
        document.getElementById('menu-btn').addEventListener('click', () => {
            document.getElementById('toc-overlay').classList.add('active');
        });
        
        document.getElementById('close-toc').addEventListener('click', () => {
            document.getElementById('toc-overlay').classList.remove('active');
        });
        
        document.getElementById('toc-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'toc-overlay') {
                document.getElementById('toc-overlay').classList.remove('active');
            }
        });
        
        document.getElementById('toc-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('toc-item')) {
                e.preventDefault();
                const chapterFile = e.target.dataset.chapter;
                this.loadChapter(chapterFile);
                document.getElementById('toc-overlay').classList.remove('active');
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && this.currentIndex > 0) {
                this.loadChapter(this.chapters[this.currentIndex - 1].fileName);
            } else if (e.key === 'ArrowRight' && this.currentIndex < this.chapters.length - 1) {
                this.loadChapter(this.chapters[this.currentIndex + 1].fileName);
            }
        });
        
        let touchStartX = 0;
        let touchEndX = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });
        
        const handleSwipe = () => {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0 && this.currentIndex < this.chapters.length - 1) {
                    this.loadChapter(this.chapters[this.currentIndex + 1].fileName);
                } else if (diff < 0 && this.currentIndex > 0) {
                    this.loadChapter(this.chapters[this.currentIndex - 1].fileName);
                }
            }
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NovelReader();
});