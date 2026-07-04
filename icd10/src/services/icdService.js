import { removeVietnameseTones } from '../utils/helpers.js';

export class IcdService {
  /**
   * Fetch ICD data from static JSON file
   */
  static async loadData() {
    try {
      const response = await fetch('https://phamminhvien.github.io/bato_his_public_data/icd.json');
      if (!response.ok) throw new Error("Failed to load ICD data");
      
      const rawData = await response.json();
      return this.processData(rawData);
    } catch (error) {
      console.error("Error loading ICD data:", error);
      return { flatData: [], chapters: [] };
    }
  }

  /**
   * Process raw data into a flat list with search index and a hierarchical tree
   */
  static processData(rawData) {
    const flatData = [];
    const chapterMap = new Map(); // Chapter -> Blocks
    
    for (const item of rawData) {
      // 1. Build search index for each item
      const searchString = `
        ${item.MA_BENH || ''} 
        ${item.TEN_BENH || ''} 
        ${item.DISEASE_NAME_WHO_2019_ENGLISH || ''}
      `.trim();
      
      const processedItem = {
        ...item,
        _searchIndex: removeVietnameseTones(searchString),
        id: item.MA_BENH // unique identifier
      };
      
      flatData.push(processedItem);

      // 2. Build Hierarchy
      const chapterId = item.STT_CHUONG;
      if (!chapterId) continue;
      
      if (!chapterMap.has(chapterId)) {
        chapterMap.set(chapterId, {
          id: chapterId,
          name: item.TEN_CHUONG,
          range: item.PHAM_VI_MA_NHOM_BENH,
          blocks: new Map()
        });
      }
      
      const chapter = chapterMap.get(chapterId);
      const blockId = item.MA_KHOI;
      
      if (!chapter.blocks.has(blockId)) {
        chapter.blocks.set(blockId, {
          id: blockId,
          name: item.TEN_KHOI,
          groups: new Map()
        });
      }
      
      const block = chapter.blocks.get(blockId);
      const groupId = item.MA_NHOM_BENH_3_KY_TU;
      
      if (!block.groups.has(groupId)) {
        block.groups.set(groupId, {
          id: groupId,
          name: item.TEN_NHOM_BENH_3_KY_TU,
          codes: []
        });
      }
      
      const group = block.groups.get(groupId);
      group.codes.push(processedItem);
    }

    // Convert Maps to Arrays for easier iteration in UI
    const chapters = Array.from(chapterMap.values()).map(chap => ({
      ...chap,
      blocks: Array.from(chap.blocks.values()).map(block => ({
        ...block,
        groups: Array.from(block.groups.values())
      }))
    }));

    return { flatData, chapters };
  }
}
