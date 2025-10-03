// ⭐ モジュール形式 (v9) の SDK をインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js"; 
import { getStorage } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-storage.js";

// Your web app's Firebase configuration (あなたの情報に置き換わっています)
const firebaseConfig = {
  // ⭐ 以下の 'AIzaSyDtjNj_uZuXx9K86QaRCui43HR86tI1-28' などの値は、
  //    あなたがFirebaseコンソールから取得した実際の値に置き換えてください。
  apiKey: "AIzaSyDtjNj_uZuXx9K86QaRCui43HR86tI1-28", 
  authDomain: "globalchat-yoiyamijin.firebaseapp.com",
  projectId: "globalchat-yoiyamijin",
  storageBucket: "globalchat-yoiyamijin.firebasestorage.app",
  messagingSenderId: "214457558659",
  appId: "1:214457558659:web:b23593760fb3ea06d65db6",
  measurementId: "G-CC7TH6F1XH"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);

// サービスのインスタンスを取得し、エクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Firestoreの'messages'コレクションへの参照
export const messagesRef = collection(db, 'messages');
