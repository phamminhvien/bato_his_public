import { store, actions } from '../state/store.js';
import { VirtualScroll } from '../hooks/useVirtualScroll.js';
import { removeVietnameseTones } from '../utils/helpers.js';

export class TreeView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.virtualScroll = null;
    this.isSearchMode = false;
    this.isTreeRendered = false;
    
    // Subscribe to state changes
    this.unsubscribe = store.subscribe((state) => {
      this.handleStateChange(state);
    });
  }

  handleStateChange(state) {
    // Check if we need to switch to search mode
    if (state.searchQuery && state.searchQuery.length >= 2) {
      if (!this.isSearchMode) {
        this.container.innerHTML = '';
        this.isSearchMode = true;
        this.isTreeRendered = false;
      }
      this.renderSearchMode(state);
    } else {
      if (this.isSearchMode || !this.isTreeRendered) {
        this.isSearchMode = false;
        if (this.virtualScroll) {
          this.virtualScroll.destroy();
          this.virtualScroll = null;
        }
        this.renderTreeMode(state);
      } else {
        // Just update checkboxes without full re-render
        this.updateCheckboxes(state.selectedCodes);
      }
    }
  }

  updateCheckboxes(selectedCodes) {
    const checkboxes = this.container.querySelectorAll('.icd-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = selectedCodes.has(cb.value);
    });
    
    // Attempt to update group checkboxes if rendered
    const groupCheckboxes = this.container.querySelectorAll('.group-checkbox');
    groupCheckboxes.forEach(cb => {
      // We don't have the codes easily here unless we store them. 
      // It's acceptable for now to let it just act as a trigger button.
      // But let's leave this blank.
    });
  }

  renderSearchMode(state) {
    const query = removeVietnameseTones(state.searchQuery);
    const results = state.icdData.filter(item => item._searchIndex.includes(query));

    if (!this.virtualScroll) {
      this.virtualScroll = new VirtualScroll(this.container, {
        itemHeight: 65,
        renderRow: (item) => this.createIcdElement(item)
      });
    }
    
    this.virtualScroll.setItems(results);
  }

  renderTreeMode(state) {
    this.container.innerHTML = '';
    const { chapters } = state;
    
    if (!chapters || chapters.length === 0) return;

    const fragment = document.createDocumentFragment();
    
    chapters.forEach(chapter => {
      const chapterEl = this.createNode(
        `chapter-${chapter.id}`, 
        `Chương ${chapter.id}: ${chapter.name}`, 
        () => this.renderBlocks(chapter)
      );
      fragment.appendChild(chapterEl);
    });
    
    this.container.appendChild(fragment);
    this.isTreeRendered = true;
  }

  renderBlocks(chapter) {
    const fragment = document.createDocumentFragment();
    chapter.blocks.forEach(block => {
      const blockEl = this.createNode(
        `block-${block.id}`, 
        `Khối ${block.id}: ${block.name}`, 
        () => this.renderGroups(block)
      );
      fragment.appendChild(blockEl);
    });
    return fragment;
  }

  renderGroups(block) {
    const fragment = document.createDocumentFragment();
    block.groups.forEach(group => {
      const groupEl = this.createNode(
        `group-${group.id}`, 
        `Nhóm ${group.id}: ${group.name}`, 
        () => this.renderCodes(group.codes),
        { codes: group.codes }
      );
      fragment.appendChild(groupEl);
    });
    return fragment;
  }

  renderCodes(codes) {
    const fragment = document.createDocumentFragment();
    codes.forEach(code => {
      fragment.appendChild(this.createIcdElement(code));
    });
    return fragment;
  }

  createNode(id, text, getChildrenFunc, groupData = null) {
    const el = document.createElement('div');
    el.className = 'tree-node';
    el.id = id;
    
    const header = document.createElement('div');
    header.className = 'tree-node-header';
    
    let checkboxHtml = '';
    if (groupData) {
      const allSelected = groupData.codes.length > 0 && groupData.codes.every(c => store.getState().selectedCodes.has(c.id));
      checkboxHtml = `<input type="checkbox" class="group-checkbox" style="margin-right:8px;" ${allSelected ? 'checked' : ''} title="Chọn tất cả mã trong nhóm này" />`;
    }
    
    header.innerHTML = `<span class="toggle-icon">+</span> ${checkboxHtml} <span class="node-text">${text}</span>`;
    
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-node-children hidden';
    
    let isLoaded = false;
    
    // Group checkbox logic
    if (groupData) {
      const groupCb = header.querySelector('.group-checkbox');
      groupCb.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent expand/collapse
      });
      groupCb.addEventListener('change', (e) => {
        const checked = e.target.checked;
        const codeIds = groupData.codes.map(c => c.id);
        actions.toggleCodesBulk(codeIds, checked);
      });
    }

    header.addEventListener('click', (e) => {
      // Don't toggle if they clicked the checkbox
      if (e.target.classList.contains('group-checkbox')) return;
      
      const icon = header.querySelector('.toggle-icon');
      if (childrenContainer.classList.contains('hidden')) {
        childrenContainer.classList.remove('hidden');
        icon.textContent = '-';
        if (!isLoaded) {
          childrenContainer.appendChild(getChildrenFunc());
          isLoaded = true;
        }
      } else {
        childrenContainer.classList.add('hidden');
        icon.textContent = '+';
      }
    });
    
    el.appendChild(header);
    el.appendChild(childrenContainer);
    return el;
  }

  createIcdElement(item) {
    const el = document.createElement('div');
    el.className = 'icd-item';
    
    const isChecked = store.getState().selectedCodes.has(item.id);
    
    let labels = '';
    if (item["MA_KHONG_ĐUOC_DUNG_LA_BENH_CHINH"]) {
      labels += `<span class="badge badge-red" title="Không được dùng làm bệnh chính">Cấm làm bệnh chính</span>`;
    }
    if (item["MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH"]) {
      labels += `<span class="badge badge-orange" title="Không khuyến khích dùng làm bệnh chính">K.khuyến khích bệnh chính</span>`;
    }
    if (item["MA_KHONG_ĐUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"]) {
      labels += `<span class="badge badge-red" title="Không được dùng vì có mã chi tiết hơn">Cần mã chi tiết hơn</span>`;
    }
    if (item["CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG"]) {
      labels += `<span class="badge badge-purple" title="Chỉ sử dụng mã hóa nguyên nhân tử vong">Chỉ dùng tử vong</span>`;
    }
    if (item["CAC_MA_BENH_CHI_CÓ_HOAC_CHU_YEU_CO_O_NU_GIOI"] || item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI"]) {
      labels += `<span class="badge badge-pink" title="Chỉ hoặc chủ yếu ở nữ giới">Nữ giới</span>`;
    }
    if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI"]) {
      labels += `<span class="badge badge-blue" title="Chỉ hoặc chủ yếu ở nam giới">Nam giới</span>`;
    }
    
    const badgesHtml = labels ? `<div class="icd-badges">${labels}</div>` : '';
    
    el.innerHTML = `
      <input type="checkbox" class="icd-checkbox" value="${item.id}" ${isChecked ? 'checked' : ''} />
      <div class="icd-info">
        <span class="icd-code">${item.MA_BENH}</span>
        <span class="icd-name">${item.TEN_BENH || ''}</span>
        <span class="icd-en">${item.DISEASE_NAME_WHO_2019_ENGLISH || ''}</span>
        ${badgesHtml}
      </div>
    `;
    
    const checkbox = el.querySelector('input');
    checkbox.addEventListener('change', (e) => {
      actions.toggleCode(item.id, e.target.checked);
    });
    
    return el;
  }

  destroy() {
    this.unsubscribe();
    if (this.virtualScroll) {
      this.virtualScroll.destroy();
    }
  }
}
