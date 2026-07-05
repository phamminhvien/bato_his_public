import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, arrayUnion, arrayRemove, collection } from 'firebase/firestore';
import { firebaseConfig } from './config.js';

let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("Firebase initialized with Project ID:", firebaseConfig.projectId);
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export class FirebaseService {
  /**
   * Save selected ICD codes for a department
   * @param {string} departmentId 
   * @param {string[]} selectedCodes 
   */
  static async saveSelections(departmentId, selectedCodes) {
    if (!db) return;
    try {
      const docRef = doc(db, 'ICDdepartmentSelections', departmentId);
      await setDoc(docRef, {
        department: departmentId,
        selected: selectedCodes,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving to Firestore:", error);
      throw error;
    }
  }

  /**
   * Load selections once
   * @param {string} departmentId 
   * @returns {Promise<string[]>}
   */
  static async loadSelections(departmentId) {
    if (!db) return [];
    try {
      const docRef = doc(db, 'ICDdepartmentSelections', departmentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().selected || [];
      }
      return [];
    } catch (error) {
      console.error("Error loading from Firestore:", error);
      return [];
    }
  }

  /**
   * Update selections diff using arrayUnion and arrayRemove
   * @param {string} departmentId 
   * @param {string[]} addedCodes 
   * @param {string[]} removedCodes 
   */
  static async updateSelectionDiff(departmentId, addedCodes, removedCodes) {
    if (!db) return;
    try {
      const docRef = doc(db, 'ICDdepartmentSelections', departmentId);
      
      const updates = {
        department: departmentId,
        updatedAt: new Date().toISOString()
      };

      if (addedCodes && addedCodes.length > 0) {
        console.log(`⬆️ [Firebase Push] Thêm mã:`, addedCodes);
        updates.selected = arrayUnion(...addedCodes);
      } else if (removedCodes && removedCodes.length > 0) {
        console.log(`⬇️ [Firebase Push] Xóa mã:`, removedCodes);
        updates.selected = arrayRemove(...removedCodes);
      }
      
      await setDoc(docRef, updates, { merge: true });
      
    } catch (error) {
      console.error("Error updating diff in Firestore:", error);
      throw error;
    }
  }

  /**
   * Listen to selections (realtime)
   * @param {string} departmentId 
   * @param {Function} callback 
   * @returns {Function} unsubscribe function
   */
  static listenSelections(departmentId, callback) {
    if (!db) return () => {};
    const docRef = doc(db, 'ICDdepartmentSelections', departmentId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().selected || []);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error("Error listening to Firestore:", error);
    });
  }

  /**
   * Listen to all departments for Leaderboard
   * @param {Function} callback 
   * @returns {Function} unsubscribe function
   */
  static listenAllDepartments(callback) {
    if (!db) return () => {};
    const colRef = collection(db, 'ICDdepartmentSelections');
    return onSnapshot(colRef, (snapshot) => {
      const allDepts = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        allDepts.push({
          id: doc.id,
          count: data.selected ? data.selected.length : 0,
          codes: data.selected || [],
          updatedAt: data.updatedAt
        });
      });
      allDepts.sort((a, b) => b.count - a.count);
      callback(allDepts);
    }, (error) => {
      console.error("Error listening to all departments:", error);
    });
  }
}
