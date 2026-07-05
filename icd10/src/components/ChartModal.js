import { store } from '../state/store.js';

export class ChartModal {
  constructor() {
    this.modal = document.getElementById('chart-modal');
    this.closeBtn = document.getElementById('close-chart-modal');
    this.btnOpen = document.getElementById('btn-show-chart');
    this.canvas = document.getElementById('bubbleChart');
    this.chartInstance = null;

    if (!this.modal || !this.btnOpen || !this.canvas) return;

    this.btnOpen.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());
    
    // Close on outside click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
  }

  open() {
    this.modal.classList.remove('hidden');
    this.renderChart();
  }

  close() {
    this.modal.classList.add('hidden');
  }

  renderChart() {
    const state = store.getState();
    const selectedIds = state.selectedCodes;
    const flatData = state.icdData || [];
    
    // Aggregate data by Chapter (CHUONG)
    const chapterCounts = {};
    
    flatData.forEach(item => {
      if (selectedIds.has(item.id)) {
        const chapter = item.TEN_CHUONG || item.CHUONG || 'Khác';
        chapterCounts[chapter] = (chapterCounts[chapter] || 0) + 1;
      }
    });
    
    const labels = Object.keys(chapterCounts);
    const data = Object.values(chapterCounts);
    
    // Generate beautiful colors
    const backgroundColors = labels.map((_, i) => `hsl(${(i * 360) / labels.length}, 70%, 50%)`);
    const isDarkMode = document.body.classList.contains('dark-mode');

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    // Must be globally available via CDN
    if (typeof Chart === 'undefined') return;

    this.chartInstance = new Chart(this.canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          label: 'Số lượng mã',
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: isDarkMode ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: isDarkMode ? '#e2e8f0' : '#333',
              font: {
                family: 'Inter',
                size: 14
              }
            }
          }
        }
      }
    });
  }
}
