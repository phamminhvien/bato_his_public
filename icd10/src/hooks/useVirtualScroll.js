export class VirtualScroll {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.items = [];
    this.itemHeight = options.itemHeight || 45; // Default height of each row
    this.renderRow = options.renderRow || (() => document.createElement('div'));
    this.onScroll = this.onScroll.bind(this);
    
    // Setup DOM
    this.viewport = document.createElement('div');
    this.viewport.className = 'virtual-scroll-viewport';
    
    this.spacer = document.createElement('div');
    this.spacer.className = 'virtual-scroll-spacer';
    
    this.content = document.createElement('div');
    this.content.className = 'virtual-scroll-content';
    
    this.viewport.appendChild(this.spacer);
    this.viewport.appendChild(this.content);
    this.container.appendChild(this.viewport);
    
    this.viewport.addEventListener('scroll', this.onScroll);
    window.addEventListener('resize', this.onScroll);
    
    this.visibleStartIndex = 0;
    this.visibleEndIndex = 0;
    this.renderedNodes = new Map();
  }

  setItems(items) {
    this.items = items;
    this.spacer.style.height = `${this.items.length * this.itemHeight}px`;
    this.content.innerHTML = ''; // clear all
    this.renderedNodes.clear();
    this.viewport.scrollTop = 0;
    this.onScroll();
  }

  onScroll() {
    const scrollTop = this.viewport.scrollTop;
    const viewportHeight = this.viewport.clientHeight || 600; // fallback height
    
    // Calculate visible range with some buffer (e.g. 5 items above and below)
    const buffer = 5;
    const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - buffer);
    const endIndex = Math.min(
      this.items.length - 1, 
      Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + buffer
    );

    if (startIndex === this.visibleStartIndex && endIndex === this.visibleEndIndex && this.renderedNodes.size > 0) {
      return; // No change in visible range
    }

    this.visibleStartIndex = startIndex;
    this.visibleEndIndex = endIndex;
    
    // Offset the content container
    this.content.style.transform = `translateY(${startIndex * this.itemHeight}px)`;

    // Remove nodes that are out of view to save memory
    for (const [index, node] of this.renderedNodes.entries()) {
      if (index < startIndex || index > endIndex) {
        node.remove();
        this.renderedNodes.delete(index);
      }
    }

    // Add nodes that are in view
    for (let i = startIndex; i <= endIndex; i++) {
      if (!this.renderedNodes.has(i)) {
        const item = this.items[i];
        if (item) {
          const node = this.renderRow(item, i);
          // Insert in correct order
          const existingNodeKeys = Array.from(this.renderedNodes.keys()).sort((a,b) => a-b);
          let inserted = false;
          for (let key of existingNodeKeys) {
            if (key > i) {
              this.content.insertBefore(node, this.renderedNodes.get(key));
              inserted = true;
              break;
            }
          }
          if (!inserted) {
            this.content.appendChild(node);
          }
          this.renderedNodes.set(i, node);
        }
      }
    }
  }

  destroy() {
    this.viewport.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    this.container.innerHTML = '';
  }
}
