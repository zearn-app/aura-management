import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOU5TRy80JkKhWEwbNIe9Ei5-e_QztN3k",
  authDomain: "zearn-app.firebaseapp.com",
  projectId: "zearn-app",
  storageBucket: "zearn-app.firebasestorage.app",
  messagingSenderId: "212045636123",
  appId: "1:212045636123:web:495ba5939bdc5c89050ebe",
  measurementId: "G-GMLDVHFFLN"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);