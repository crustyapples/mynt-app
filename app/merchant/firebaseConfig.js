// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirebase, getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfigDev = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_DEV_API_KEY,
    authDomain: "treehoppers-mynt.firebaseapp.com",
    projectId: "treehoppers-mynt",
    storageBucket: "treehoppers-mynt.appspot.com",
    messagingSenderId: "751257459683",
    appId: "1:751257459683:web:10c7f44cd9684098205ed6"
  };

  const firebaseConfigProd = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_PROD_API_KEY,
    authDomain: "treehoppers-mynt-prod.firebaseapp.com",
    projectId: "treehoppers-mynt-prod",
    storageBucket: "treehoppers-mynt-prod.appspot.com",
    messagingSenderId: "896296035834",
    appId: "1:896296035834:web:d930407a247bbae63d7043",
    measurementId: "G-25SHHFJM1K"
  };

  let firebaseConfig;

  if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
    firebaseConfig = firebaseConfigDev
  } else if (process.env.NEXT_PUBLIC_NODE_ENV === 'production') {
    firebaseConfig = firebaseConfigProd
  }

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const database = getFirestore(app);

// Initialise Storage bucket
export const storage = getStorage(app);