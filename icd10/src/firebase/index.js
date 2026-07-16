import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, arrayUnion, arrayRemove, collection, deleteField, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { firebaseConfig } from './config.js';

let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("Firebase initialized with Project ID:", firebaseConfig.projectId);
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export class FirebaseService {
  /**
   * Firebase Auth
   */
  static async loginWithGoogle() {
    if (!auth) return null;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-blocked') {
        console.warn("Popup blocked or cancelled. Falling back to redirect...");
        await signInWithRedirect(auth, provider);
        // Will reload the page
      } else {
        console.error("Error logging in:", error);
        throw error;
      }
    }
  }

  static async logout() {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }

  static onAuthChange(callback) {
    if (!auth) return;
    onAuthStateChanged(auth, callback);
  }

  /**
   * Fetch user role from whitelist collection
   * @param {string} email 
   */
  static async getUserRole(email) {
    if (!db || !email) return null;
    try {
      const docRef = doc(db, 'whitelist', email.toLowerCase());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data(); // expected: { role: 'admin'|'super_admin', maKhoa: '...' }
      }
      return null;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  }

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
   * Update selections diff using arrayUnion and arrayRemove with metadata
   * @param {string} departmentId 
   * @param {string[]} addedCodes 
   * @param {string[]} removedCodes 
   * @param {Object} user 
   */
  static async updateSelectionDiff(departmentId, addedCodes, removedCodes, user = null) {
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
        if (user) {
          updates.metadata_added = {};
          updates.metadata_removed = {};
          addedCodes.forEach(code => {
            updates.metadata_added[code] = {
              email: user.email,
              name: user.displayName || user.name || user.email,
              deviceId: user.deviceId || null,
              timestamp: Date.now()
            };
            updates.metadata_removed[code] = deleteField();
          });
        }
      } else if (removedCodes && removedCodes.length > 0) {
        console.log(`⬇️ [Firebase Push] Xóa mã:`, removedCodes);
        updates.selected = arrayRemove(...removedCodes);
        if (user) {
          updates.metadata_added = {};
          updates.metadata_removed = {};
          removedCodes.forEach(code => {
            updates.metadata_removed[code] = {
              email: user.email,
              name: user.displayName || user.name || user.email,
              deviceId: user.deviceId || null,
              timestamp: Date.now()
            };
            updates.metadata_added[code] = deleteField();
          });
        }
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
        const data = docSnap.data();
        const metaAdded = data.metadata_added || data.metadata || {};
        const metaRemoved = data.metadata_removed || {};
        callback(data.selected || [], metaAdded, metaRemoved);
      } else {
        callback([], {}, {});
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
  /**
   * Theo dõi Online (Presence)
   */
  static async setPresence(visitorId, data) {
    if (!db) return;
    try {
      const docRef = doc(db, 'presence', visitorId);
      await setDoc(docRef, {
        ...data,
        last_updated: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.warn("Could not set presence:", error);
    }
  }

  static async removePresence(visitorId) {
    if (!db) return;
    try {
      const docRef = doc(db, 'presence', visitorId);
      // Dùng update thay vì delete để giữ log hoặc delete hẳn
      // Theo yêu cầu của user, ta có thể delete hẳn để db sạch sẽ
      // Tuy nhiên beforeunload không gọi được await tốt, nên ta gửi beacon hoặc setDoc
      await setDoc(docRef, { state: 'offline', logoutAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      console.warn("Could not remove presence:", error);
    }
  }

  static onPresenceChange(callback) {
    if (!db) return () => {};
    const presenceRef = collection(db, 'presence');
    return onSnapshot(presenceRef, (snapshot) => {
      const users = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.state !== 'offline') {
          users.push(data);
        }
      });
      callback(users);
    }, (error) => {
      console.error("Lỗi khi theo dõi presence:", error);
    });
  }
}
