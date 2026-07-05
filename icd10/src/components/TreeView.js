import { store, actions } from '../state/store.js';
import { playSuccessSound, playWarningSound, triggerHaptic } from '../utils/interaction.js';
import { VirtualScroll } from '../hooks/useVirtualScroll.js';
import { removeVietnameseTones } from '../utils/helpers.js';

export class TreeView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.virtualScroll = null;
    this.isSearchMode = false;
    this.isTreeRendered = false;
    this.currentDept = null;
    
    // Subscribe to state changes
    this.unsubscribe = store.subscribe((state) => {
      this.handleStateChange(state);
    });
  }

  handleStateChange(state) {
    const canEdit = store.canEditCurrentDepartment();
    
    // Force re-render if department changed or edit permission changed
    if (this.currentDept !== state.departmentId || this.canEdit !== canEdit) {
      this.currentDept = state.departmentId;
      this.canEdit = canEdit;
      this.isTreeRendered = false;
    }

    // Check if we need to switch to search mode (query >= 2 chars OR filter is active)
    const hasQuery = state.searchQuery && state.searchQuery.length >= 2;
    const hasFilter = !!state.searchFilter;
    
    if (hasQuery || hasFilter) {
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
        this.updateCheckboxes(state);
      }
    }
  }

  updateCheckboxes(state) {
    const checkboxes = this.container.querySelectorAll('.icd-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = state.selectedCodes.has(cb.value);
    });

    const groupCheckboxes = this.container.querySelectorAll('.group-checkbox');
    groupCheckboxes.forEach(cb => {
      const codesStr = cb.getAttribute('data-codes');
      if (codesStr) {
        const codes = codesStr.split(',');
        const total = codes.length;
        const selectedCount = codes.filter(c => state.selectedCodes.has(c)).length;
        
        if (selectedCount === 0) {
          cb.checked = false;
          cb.indeterminate = false;
        } else if (selectedCount === total) {
          cb.checked = true;
          cb.indeterminate = false;
        } else {
          cb.checked = false;
          cb.indeterminate = true;
        }
      }
    });
  }

  renderSearchMode(state) {
    const query = removeVietnameseTones(state.searchQuery || '');
    const filterKey = state.searchFilter;
    
    const results = state.icdData.filter(item => {
      let matchesQuery = true;
      if (query.length >= 2) {
        matchesQuery = item._searchIndex.includes(query);
      }
      
      let matchesFilter = true;
      if (filterKey) {
        matchesFilter = !!item[filterKey];
      }
      
      return matchesQuery && matchesFilter;
    });

    // Update search count badge
    const searchCountEl = document.getElementById('search-count');
    if (searchCountEl) {
      searchCountEl.textContent = results.length;
      searchCountEl.style.display = 'block';
    }

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
    
    // Hide search count badge
    const searchCountEl = document.getElementById('search-count');
    if (searchCountEl) {
      searchCountEl.style.display = 'none';
    }

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
        hasDetailWarning = !!parentCode["MA_KHONG_DUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"];
      }

      // TH2: If the group has only 1 code (no detailed codes)
      if (group.codes.length === 1) {
        const codeEl = this.createIcdElement(group.codes[0]);
        // Allow it to fall back to native margin-left (45px) to align with checkboxes
        fragment.appendChild(codeEl);
        return; // Skip rendering group wrapper
      }

      // TH1: If there are detailed codes and parent has the warning
      let codesToRender = group.codes;
      let groupNameText = `Nhóm ${group.id}: ${group.name}`;

      if (hasDetailWarning && group.codes.length > 1) {
        // Only color and bold the group code (group.id) to reduce visual clutter
        groupNameText = `Nhóm <span style="color: #795548; font-weight: bold;" class="has-tooltip" data-tooltip="Mã không được sử dụng vì có mã 4 hoặc 5 ký tự cụ thể hơn">${group.id}</span>: ${group.name}`;
        // Hide parent code from the list
        codesToRender = group.codes.filter(c => c.MA_BENH !== group.id);
      }

      const groupEl = this.createNode(
        `group-${group.id}`, 
        groupNameText, 
        () => this.renderCodes(codesToRender),
        { codes: codesToRender }
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
    
    const canEdit = store.canEditCurrentDepartment();
    
    let checkboxHtml = '';
    if (groupData && canEdit) {
      const total = groupData.codes.length;
      const selectedCount = groupData.codes.filter(c => store.getState().selectedCodes.has(c.id)).length;
      const allSelected = total > 0 && selectedCount === total;
      const codesList = groupData.codes.map(c => c.id).join(',');
      checkboxHtml = `<input type="checkbox" class="group-checkbox" data-codes="${codesList}" style="margin-right:8px;" ${allSelected ? 'checked' : ''} title="Chọn tất cả mã trong nhóm này" />`;
    }
    
    header.innerHTML = `<span class="toggle-icon">+</span> ${checkboxHtml} <span class="node-text">${text}</span> ${extraHtml}`;
    
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-node-children hidden';
    
    let isLoaded = false;
    
    // Group checkbox logic
    if (groupData && canEdit) {
      const groupCb = header.querySelector('.group-checkbox');
      if (groupCb) {
        const total = groupData.codes.length;
        const selectedCount = groupData.codes.filter(c => store.getState().selectedCodes.has(c.id)).length;
        if (selectedCount > 0 && selectedCount < total) {
          groupCb.indeterminate = true;
        }
        
        groupCb.addEventListener('click', (e) => {
          e.stopPropagation(); // prevent expand/collapse
        });
        groupCb.addEventListener('change', (e) => {
          const checked = e.target.checked;
          const codeIds = groupData.codes.map(c => c.id);
          actions.toggleCodesBulk(codeIds, checked);
        });
      }
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
    if (item["MA_KHONG_DUOC_DUNG_LA_BENH_CHINH"]) {
      labels += `<span class="badge badge-red has-tooltip" data-tooltip="Mã không được dùng làm bệnh chính">Cấm làm bệnh chính</span>`;
    }
    if (item["MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH"]) {
      labels += `<span class="badge badge-orange has-tooltip" data-tooltip="Mã không khuyến khích dùng làm bệnh chính">K.khuyến khích bệnh chính</span>`;
    }
    if (item["MA_KHONG_DUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"]) {
      labels += `<span class="badge badge-brown has-tooltip" data-tooltip="Mã không được sử dụng vì có mã 4 hoặc 5 ký tự cụ thể hơn">Cần mã chi tiết hơn</span>`;
    }
    if (item["CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG"]) {
      labels += `<span class="badge badge-purple has-tooltip" data-tooltip="Chỉ sử dụng mã hóa nguyên nhân tử vong">Chỉ dùng tử vong</span>`;
    }
    if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI"]) {
      labels += `<span class="badge badge-pink has-tooltip" data-tooltip="Các mã bệnh chỉ có hoặc chủ yếu có ở nữ giới">Nữ giới</span>`;
    }
    if (item["CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI"]) {
      labels += `<span class="badge badge-blue has-tooltip" data-tooltip="Các mã bệnh chỉ có hoặc chủ yếu có ở nam giới">Nam giới</span>`;
    }
    
    const badgesHtml = labels ? `<div class="icd-badges">${labels}</div>` : '';
    
    let tooltipHtml = '';
    if (item["HUONG_DAN_MA_HOA_BO_SUNG_CUA_WHO_2019"]) {
      const safeText = item["HUONG_DAN_MA_HOA_BO_SUNG_CUA_WHO_2019"].replace(/"/g, '&quot;');
      tooltipHtml = `<span class="has-tooltip tooltip-icon" data-tooltip="HƯỚNG DẪN MÃ HÓA BỔ SUNG CỦA WHO 2019:&#10;&#10;${safeText}">?</span>`;
    }
    
    const canEdit = store.canEditCurrentDepartment();
    const checkboxHtml = canEdit ? `<input type="checkbox" class="icd-checkbox" value="${item.id}" ${isChecked ? 'checked' : ''} />` : '';
    
    el.innerHTML = `
      ${checkboxHtml}
      <div class="icd-info">
        <span class="icd-code">${item.MA_BENH}</span>
        <span class="icd-name">${item.TEN_BENH || ''} ${tooltipHtml}</span>
        <span class="icd-en">${item.DISEASE_NAME_WHO_2019_ENGLISH || ''}</span>
        ${badgesHtml}
      </div>
    `;
    
    if (canEdit) {
      const checkbox = el.querySelector('input');
      checkbox.addEventListener('change', (e) => {
        const checked = e.target.checked;
        if (checked) {
          const isWarning = item["MA_KHONG_DUOC_DUNG_LA_BENH_CHINH"] || item["MA_KHONG_DUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON"];
          if (isWarning) {
            playWarningSound();
            triggerHaptic('warning');
            el.classList.add('shake');
            setTimeout(() => el.classList.remove('shake'), 300);
          }
        }
        actions.toggleCode(item.id, checked);
      });
    }
    
    return el;
  }

  destroy() {
    this.unsubscribe();
    if (this.virtualScroll) {
      this.virtualScroll.destroy();
    }
  }
}
