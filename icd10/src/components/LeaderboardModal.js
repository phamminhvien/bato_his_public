import { store } from '../state/store.js';
import { DEPARTMENTS } from '../utils/departments.js';

export class LeaderboardModal {
  constructor() {
    this.modal = document.getElementById('leaderboard-modal');
    this.closeBtn = document.getElementById('close-leaderboard-modal');
    this.btnOpen = document.getElementById('btn-show-leaderboard');
    this.listContainer = document.getElementById('leaderboard-list');

    if (!this.modal || !this.btnOpen) return;

    this.btnOpen.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Re-render when store updates if modal is open
    store.subscribe(() => {
      if (!this.modal.classList.contains('hidden')) {
        this.renderList();
      }
    });
  }

  open() {
    this.modal.classList.remove('hidden');
    this.renderList();
  }

  close() {
    this.modal.classList.add('hidden');
  }

  renderList() {
    debugger;
    const leaderboard = store.getState().leaderboard || [];

    this.listContainer.innerHTML = '';

    if (leaderboard.length === 0) {
      this.listContainer.innerHTML = '<li style="padding: 20px; text-align: center;">Chưa có dữ liệu. Đang tải...</li>';
      return;
    }

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
      this.listContainer.appendChild(li);
    });
  }
}
