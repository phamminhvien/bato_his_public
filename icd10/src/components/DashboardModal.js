import { store } from '../state/store.js';
import { DEPARTMENTS } from '../utils/departments.js';
import { FirebaseService } from '../firebase/index.js';

export class DashboardModal {
  constructor() {
    this.modal = document.getElementById('dashboard-modal');
    this.closeBtn = document.getElementById('close-dashboard-modal');
    this.btnOpen = document.getElementById('btn-show-dashboard');
    
    this.canvas = document.getElementById('bubbleChart');
    this.leaderboardList = document.getElementById('leaderboard-list');
    
    // Views
    this.leaderboardView = document.getElementById('dashboard-leaderboard-view');
    this.presenceView = document.getElementById('dashboard-presence-view');
    this.presenceList = document.getElementById('presence-list');
    this.presenceCount = document.getElementById('presence-count');
    this.detailView = document.getElementById('dashboard-detail-view');
    this.detailTitle = document.getElementById('detail-view-title');
    this.detailList = document.getElementById('detail-code-list');
    this.btnBack = document.getElementById('btn-back-leaderboard');

    this.chartInstance = null;
    this.unsubscribePresence = null;

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
    
    // Check if user is admin 12t11phamminhvien
    const userEmail = store.getState().user?.email || '';
    if (userEmail.includes('12t11phamminhvien')) {
      if (this.presenceView) this.presenceView.classList.remove('hidden');
      if (!this.unsubscribePresence) {
        this.unsubscribePresence = FirebaseService.onPresenceChange((users) => {
          this.renderPresenceList(users);
        });
      }
    } else {
      if (this.presenceView) this.presenceView.classList.add('hidden');
    }
  }

  close() {
    this.modal.classList.add('hidden');
    if (this.unsubscribePresence) {
      this.unsubscribePresence();
      this.unsubscribePresence = null;
    }
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

  renderPresenceList(users) {
    if (!this.presenceList || !this.presenceCount) return;
    
    // Lọc bỏ những user quá cũ (ví dụ: > 1 ngày) nếu họ bị kẹt
    const now = new Date().getTime();
    const activeUsers = users.filter(u => {
      if (!u.loginAt) return false;
      const loginTime = new Date(u.loginAt).getTime();
      return (now - loginTime) < 24 * 60 * 60 * 1000; // trong vòng 24h
    });

    // Sắp xếp mới nhất lên đầu
    activeUsers.sort((a, b) => new Date(b.loginAt) - new Date(a.loginAt));

    this.presenceCount.textContent = activeUsers.length;
    this.presenceList.innerHTML = '';

    if (activeUsers.length === 0) {
      this.presenceList.innerHTML = '<li style="padding: 10px; text-align: center; color: var(--text-muted);">Không có ai online.</li>';
      return;
    }

    activeUsers.forEach(u => {
      const li = document.createElement('li');
      li.className = 'leaderboard-item';
      li.style.flexDirection = 'column';
      li.style.alignItems = 'flex-start';
      li.style.padding = '10px';
      
      const loginDate = new Date(u.loginAt);
      const timeStr = loginDate.toLocaleTimeString('vi-VN');

      li.innerHTML = `
        <div style="width: 100%; display: flex; justify-content: space-between; margin-bottom: 5px;">
          <strong style="color: #0d6efd;">${u.email === 'Khách' ? '👤 Khách vãng lai' : '👑 ' + u.email}</strong>
          <span style="font-size: 0.8rem; color: var(--text-muted);">⏱ ${timeStr}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-main); display: flex; flex-direction: column; gap: 3px;">
          <span>📱 <b>Thiết bị:</b> ${u.os} - ${u.browser} ${u.isMobile ? '(Mobile)' : ''}</span>
          <span>📍 <b>Vị trí:</b> ${u.location} (IP: ${u.ip})</span>
          <span style="color: var(--text-muted); font-size: 0.75rem;">🌐 ISP: ${u.isp || 'N/A'}</span>
        </div>
      `;
      this.presenceList.appendChild(li);
    });
  }
}
