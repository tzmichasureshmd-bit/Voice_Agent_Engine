import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCNFk_bIRzE7YYMmzUfnH6js6usrMRLE-4",
  authDomain: "tzmicha-ai-voice.firebaseapp.com",
  projectId: "tzmicha-ai-voice",
  storageBucket: "tzmicha-ai-voice.firebasestorage.app",
  messagingSenderId: "458569849865",
  appId: "1:458569849865:web:4ae1461afbce660f45acd8",
  measurementId: "G-F08CL8V5D7"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider)
  const idToken = await result.user.getIdToken()
  return { idToken, user: result.user }
}
