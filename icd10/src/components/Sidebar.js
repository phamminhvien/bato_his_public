import { store, actions } from '../state/store.js';

export class Sidebar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.isRendered = false;
    this.render();
    
    // Subscribe to state changes (if we need to highlight active chapter)
    store.subscribe((state) => {
      if (state.chapters && state.chapters.length > 0 && !this.isRendered) {
        this.render();
      }
    });
  }

  render() {
    const { chapters } = store.getState();
    this.container.innerHTML = '';
    
    chapters.forEach(chapter => {
      const el = document.createElement('div');
      el.className = 'chapter-item';
      el.title = chapter.name;
      el.innerHTML = `<strong>Chương ${chapter.id}</strong><br><small>${chapter.range}</small>`;
      
      el.addEventListener('click', () => {
        // Scroll to chapter in TreeView
        const target = document.getElementById(`chapter-${chapter.id}`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
      
      this.container.appendChild(el);
    });
    this.isRendered = true;
  }
}
