// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDQ8caUbqe2SleQIGqxFfbmhYJ_LjXqSGQ",
    authDomain: "immocation-efd4a.firebaseapp.com",
    projectId: "immocation-efd4a",
    storageBucket: "immocation-efd4a.firebasestorage.app",
    messagingSenderId: "916000399899",
    appId: "1:916000399899:web:ef127032052721a50ecebe"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);