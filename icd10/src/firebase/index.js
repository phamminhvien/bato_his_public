import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
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
   * Listen to selections (realtime)
   * @param {string} departmentId 
   * @param {Function} callback 
   */
  static listenSelections(departmentId, callback) {
    if (!db) return () => {};
    const docRef = doc(db, 'ICDdepartmentSelections', departmentId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().selected || []);
      }
    });
  }
}
