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
      // Find parent code (matches group id)
      const parentCodeIndex = group.codes.findIndex(c => c.MA_BENH === group.id);
      let parentCode = null;
      let hasDetailWarning = false;
      
      if (parentCodeIndex !== -1) {
        parentCode = group.codes[parentCodeIndex];
        hasDetailWarning = !!parentCode["MA_KHONG_ĐUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"];
      }

      // TH2: If the group has only 1 code (no detailed codes)
      if (group.codes.length === 1) {
        const codeEl = this.createIcdElement(group.codes[0]);
        codeEl.style.marginLeft = '20px'; // Align with group headers
        fragment.appendChild(codeEl);
        return; // Skip rendering group wrapper
      }

      // TH1: If there are detailed codes and parent has the warning
      let codesToRender = group.codes;
      let extraHtml = '';

      if (hasDetailWarning && group.codes.length > 1) {
        // Move warning to group header
        extraHtml = `<span class="badge badge-brown" style="margin-left:8px;" title="Mã không được sử dụng vì có mã 4 hoặc 5 ký tự cụ thể hơn">Cần mã chi tiết hơn</span>`;
        // Hide parent code from the list
        codesToRender = group.codes.filter(c => c.MA_BENH !== group.id);
      }

      const groupEl = this.createNode(
        `group-${group.id}`, 
        `Nhóm ${group.id}: ${group.name}`, 
        () => this.renderCodes(codesToRender),
        { codes: codesToRender },
        extraHtml
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

  createNode(id, text, getChildrenFunc, groupData = null, extraHtml = '') {
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
    
    header.innerHTML = `<span class="toggle-icon">+</span> ${checkboxHtml} <span class="node-text">${text}</span> ${extraHtml}`;
    
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
      labels += `<span class="badge badge-red" title="Mã không được dùng làm bệnh chính">Cấm làm bệnh chính</span>`;
    }
    if (item["MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH"]) {
      labels += `<span class="badge badge-orange" title="Mã không khuyến khích dùng làm bệnh chính">K.khuyến khích bệnh chính</span>`;
    }
    if (item["MA_KHONG_ĐUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"]) {
      labels += `<span class="badge badge-brown" title="Mã không được sử dụng vì có mã 4 hoặc 5 ký tự cụ thể hơn">Cần mã chi tiết hơn</span>`;
    }
    if (item["CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG"]) {
      labels += `<span class="badge badge-purple" title="Chỉ sử dụng mã hóa nguyên nhân tử vong">Chỉ dùng tử vong</span>`;
    }
    if (item["CAC_MA_BENH_CHI_CÓ_HOAC_CHU_YEU_CO_O_NU_GIOI"] || item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI"]) {
      labels += `<span class="badge badge-pink" title="Các mã bệnh chỉ có hoặc chủ yếu có ở nữ giới">Nữ giới</span>`;
    }
    if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI"]) {
      labels += `<span class="badge badge-blue" title="Các mã bệnh chỉ có hoặc chủ yếu có ở nam giới">Nam giới</span>`;
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
