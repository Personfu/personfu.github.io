class CyberOS {
    constructor() {
        this.windows = [];
        this.focusedWindow = null;
        this.zIndex = 1000;
        this.isStartOpen = false;
        
        this.init();
    }

    init() {
        document.addEventListener('mousedown', (e) => {
            const winEl = e.target.closest('.window');
            if (winEl) this.focusWindow(winEl.id);
            
            // Close start menu if clicked outside
            const startBtn = e.target.closest('.start-btn');
            const startMenu = e.target.closest('#start-menu');
            if (!startBtn && !startMenu && this.isStartOpen) {
                this.toggleStart(false);
            }
        });

        // Universal drag handler
        document.addEventListener('mousedown', (e) => {
            const titleBar = e.target.closest('.title-bar');
            if (!titleBar) return;
            
            const winEl = titleBar.closest('.window');
            if (!winEl || winEl.classList.contains('maximized')) return;

            let isDragging = true;
            let offset = {
                x: e.clientX - winEl.offsetLeft,
                y: e.clientY - winEl.offsetTop
            };

            const onMouseMove = (moveE) => {
                if (!isDragging) return;
                winEl.style.left = (moveE.clientX - offset.x) + 'px';
                winEl.style.top = (moveE.clientY - offset.y) + 'px';
            };

            const onMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Initialize Start Button
        const startBtn = document.querySelector('.start-btn');
        if (startBtn) {
            startBtn.onclick = () => this.toggleStart();
        }
    }

    toggleStart(force) {
        this.isStartOpen = (force !== undefined) ? force : !this.isStartOpen;
        const menu = document.getElementById('start-menu');
        if (menu) {
            menu.style.display = this.isStartOpen ? 'flex' : 'none';
        }
    }

    createWindow(id, title, initialHTML, options = {}) {
        // Prevent duplicate windows
        if (this.windows.find(w => w.id === id)) {
            this.restoreWindow(id);
            return;
        }

        const win = document.createElement('div');
        win.id = id;
        win.className = 'window';
        win.style.width = options.width || '600px';
        win.style.height = options.height || '400px';
        win.style.top = options.top || '100px';
        win.style.left = options.left || '100px';
        
        win.innerHTML = `
            <div class="title-bar">
                <div class="title-text" style="display:flex; align-items:center; gap:6px;">
                    <img src="${options.icon || 'https://win98icons.alexmeub.com/icons/png/computer_explorer-4.png'}" width="16">
                    ${title}
                </div>
                <div class="title-controls">
                    <button class="win-minimize">_</button>
                    <button class="win-maximize">□</button>
                    <button class="win-close">X</button>
                </div>
            </div>
            ${options.hasToolbar ? '<div class="window-toolbar"><span><u>F</u>ile</span><span><u>E</u>dit</span><span><u>V</u>iew</span><span><u>H</u>elp</span></div>' : ''}
            ${options.hasAddressBar ? `
                <div class="address-bar">
                    <span style="color:#666">Address:</span>
                    <input type="text" value="${options.url || 'http://'}" readonly>
                    <button class="go-btn">Go</button>
                </div>` : ''}
            <div class="window-content">${initialHTML}</div>
        `;

        document.getElementById('desktop').appendChild(win);
        
        // Setup control buttons
        win.querySelector('.win-minimize').onclick = (e) => {
            e.stopPropagation();
            this.minimizeWindow(id);
        };
        win.querySelector('.win-maximize').onclick = (e) => {
            e.stopPropagation();
            this.toggleMaximize(id);
        };
        win.querySelector('.win-close').onclick = (e) => {
            e.stopPropagation();
            this.closeWindow(id);
        };

        this.windows.push({ id, title, element: win, minimized: false, maximized: false, options });
        this.updateTaskbar();
        this.focusWindow(id);
        
        return win;
    }

    focusWindow(id) {
        this.windows.forEach(w => {
            w.element.classList.remove('focused');
            w.element.querySelector('.title-bar').classList.add('inactive');
            w.element.querySelector('.title-bar').classList.remove('active');
        });

        const win = this.windows.find(w => w.id === id);
        if (win) {
            win.element.classList.add('focused');
            win.element.querySelector('.title-bar').classList.add('active');
            win.element.querySelector('.title-bar').classList.remove('inactive');
            win.element.style.zIndex = ++this.zIndex;
            this.focusedWindow = id;
            this.updateTaskbar();
        }
    }

    toggleMaximize(id) {
        const win = this.windows.find(w => w.id === id);
        if (win) {
            win.maximized = !win.maximized;
            if (win.maximized) {
                win.element.classList.add('maximized');
                win.prevTop = win.element.style.top;
                win.prevLeft = win.element.style.left;
                win.prevWidth = win.element.style.width;
                win.prevHeight = win.element.style.height;
                win.element.style.top = '0';
                win.element.style.left = '0';
                win.element.style.width = '100vw';
                win.element.style.height = 'calc(100vh - 32px)';
            } else {
                win.element.classList.remove('maximized');
                win.element.style.top = win.prevTop;
                win.element.style.left = win.prevLeft;
                win.element.style.width = win.prevWidth;
                win.element.style.height = win.prevHeight;
            }
        }
    }

    minimizeWindow(id) {
        const win = this.windows.find(w => w.id === id);
        if (win) {
            win.minimized = true;
            win.element.classList.add('minimized');
            this.updateTaskbar();
        }
    }

    restoreWindow(id) {
        const win = this.windows.find(w => w.id === id);
        if (win) {
            win.minimized = false;
            win.element.classList.remove('minimized');
            this.focusWindow(id);
        }
    }

    closeWindow(id) {
        const index = this.windows.findIndex(w => w.id === id);
        if (index !== -1) {
            this.windows[index].element.remove();
            this.windows.splice(index, 1);
            this.updateTaskbar();
        }
    }

    updateTaskbar() {
        const container = document.getElementById('task-items');
        if (!container) return;
        
        container.innerHTML = '';
        this.windows.forEach(w => {
            const btn = document.createElement('div');
            btn.className = `task-btn ${this.focusedWindow === w.id && !w.minimized ? 'active' : ''}`;
            btn.innerHTML = `<img src="${w.options.icon || 'https://win98icons.alexmeub.com/icons/png/computer_explorer-4.png'}" width="16"> <span>${w.title}</span>`;
            btn.onclick = () => {
                if (w.minimized) this.restoreWindow(w.id);
                else if (this.focusedWindow === w.id) this.minimizeWindow(w.id);
                else this.focusWindow(w.id);
            };
            container.appendChild(btn);
        });
    }
}

// Digital Clock
function updateClock() {
    const clock = document.getElementById('clock');
    if (clock) {
        const now = new Date();
        clock.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}
setInterval(updateClock, 1000);
window.addEventListener('load', updateClock);

window.OS = new CyberOS();
