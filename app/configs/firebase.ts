import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyCNe8-dYnbPW5Ja8Ixb9xuxB0PIwWu2-Ns",
  authDomain: "edutap-thesis.firebaseapp.com",
  databaseURL: "https://edutap-thesis-default-rtdb.firebaseio.com",
  projectId: "edutap-thesis",
  storageBucket: "edutap-thesis.firebasestorage.app",
  messagingSenderId: "925689449246",
  appId: "1:925689449246:web:50092c0c3f35c73e39170f",
  measurementId: "G-S0LN7ZY452"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)   // Use this for Firestore functions (doc, collection)
export const rtdb = getDatabase(app) // Use this for Realtime DB functions (ref, set)