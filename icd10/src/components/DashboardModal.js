import { store } from '../state/store.js';
import { DEPARTMENTS } from '../utils/departments.js';

export class DashboardModal {
  constructor() {
    this.modal = document.getElementById('dashboard-modal');
    this.closeBtn = document.getElementById('close-dashboard-modal');
    this.btnOpen = document.getElementById('btn-show-dashboard');
    
    this.canvas = document.getElementById('bubbleChart');
    this.leaderboardList = document.getElementById('leaderboard-list');
    
    // Views
    this.leaderboardView = document.getElementById('dashboard-leaderboard-view');
    this.detailView = document.getElementById('dashboard-detail-view');
    this.detailTitle = document.getElementById('detail-view-title');
    this.detailList = document.getElementById('detail-code-list');
    this.btnBack = document.getElementById('btn-back-leaderboard');

    this.chartInstance = null;

    if (!this.modal || !this.btnOpen) return;

    this.btnOpen.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());
    
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    this.btnBack.addEventListener('click', () => {
      this.showLeaderboardView();
    });

    store.subscribe(() => {
      if (!this.modal.classList.contains('hidden')) {
        this.renderAll();
      }
    });
  }

  open() {
    this.modal.classList.remove('hidden');
    this.showLeaderboardView(); // Always reset to leaderboard view
    this.renderAll();
  }

  close() {
    this.modal.classList.add('hidden');
  }

  showLeaderboardView() {
    this.leaderboardView.classList.remove('hidden');
    this.detailView.classList.add('hidden');
  }

  showDetailView(chapterName, chapterCodes) {
    this.leaderboardView.classList.add('hidden');
    this.detailView.classList.remove('hidden');
    
    this.detailTitle.textContent = `Chi tiết nhóm: ${chapterName} (${chapterCodes.length} mã)`;
    this.detailList.innerHTML = '';
    
    if (chapterCodes.length === 0) {
      this.detailList.innerHTML = '<li class="detail-item">Không có dữ liệu</li>';
      return;
    }
    
    // Lấy thông tin từ flatData để có tên bệnh
    const flatData = store.getState().icdData || [];
    const codeMap = new Map();
    flatData.forEach(item => {
      codeMap.set(item.id, item);
    });

    chapterCodes.forEach(codeId => {
      const item = codeMap.get(codeId);
      const li = document.createElement('li');
      li.className = 'detail-item';
      if (item) {
        li.innerHTML = `<strong>${item.MA_BENH}</strong>: ${item.TEN_BENH}`;
      } else {
        li.innerHTML = `<strong>${codeId}</strong>`;
      }
      this.detailList.appendChild(li);
    });
  }

  renderAll() {
    const leaderboard = store.getState().leaderboard || [];
    const flatData = store.getState().icdData || [];
    
    // 1. Render Leaderboard
    this.leaderboardList.innerHTML = '';
    if (leaderboard.length === 0) {
      this.leaderboardList.innerHTML = '<li style="padding: 20px; text-align: center;">Chưa có dữ liệu. Đang tải...</li>';
    } else {
      leaderboard.forEach((dept, index) => {
        let icon = '';
        if (index === 0) icon = '🥇';
        else if (index === 1) icon = '🥈';
        else if (index === 2) icon = '🥉';
        else icon = `<span class="rank-num">${index + 1}</span>`;

        const li = document.createElement('li');
        li.className = 'leaderboard-item';
        
        const deptObj = DEPARTMENTS.find(d => d.id === dept.id);
        const deptName = deptObj ? deptObj.name : `Khoa ${dept.id}`;
        
        li.innerHTML = `
          <div class="lb-left">
            <span class="lb-rank">${icon}</span>
            <span class="lb-name">${deptName}</span>
          </div>
          <div class="lb-right">
            <span class="badge badge-blue">${dept.count} mã</span>
          </div>
        `;
        this.leaderboardList.appendChild(li);
      });
    }

    // 2. Aggregate Data for Chart (All departments)
    const chapterCounts = {};
    const chapterToCodes = {}; // Maps Chapter Name -> Set of unique Code IDs
    
    // Gom tất cả mã từ tất cả các khoa thành một Set duy nhất để tính tỷ trọng toàn viện (Unique)
    const allUniqueSelectedCodes = new Set();
    leaderboard.forEach(dept => {
      if (dept.codes && dept.codes.length > 0) {
        dept.codes.forEach(c => allUniqueSelectedCodes.add(c));
      }
    });

    flatData.forEach(item => {
      if (allUniqueSelectedCodes.has(item.id)) {
        const chapter = item.TEN_CHUONG || item.CHUONG || 'Khác';
        chapterCounts[chapter] = (chapterCounts[chapter] || 0) + 1;
        
        if (!chapterToCodes[chapter]) {
          chapterToCodes[chapter] = new Set();
        }
        chapterToCodes[chapter].add(item.id);
      }
    });
    
    const labels = Object.keys(chapterCounts);
    const data = Object.values(chapterCounts);
    
    const backgroundColors = labels.map((_, i) => `hsl(${(i * 360) / (labels.length || 1)}, 70%, 50%)`);
    const isDarkMode = document.body.classList.contains('dark-mode');

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

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
        },
        onClick: (event, elements) => {
          if (elements && elements.length > 0) {
            const index = elements[0].index;
            const clickedChapter = labels[index];
            const codesSet = chapterToCodes[clickedChapter];
            const codesArray = Array.from(codesSet || []);
            
            this.showDetailView(clickedChapter, codesArray);
          }
        }
      }
    });
  }
}
