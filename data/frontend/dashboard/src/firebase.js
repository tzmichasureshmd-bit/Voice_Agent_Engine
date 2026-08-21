import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCNFk_bIRzE7YYMmzUfnH6js6usrMRLE-4",
  authDomain: "voice.tzmicha.com",
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
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const idToken = await result.user.getIdToken()
    return { idToken, user: result.user }
  } catch (err) {
    // Popup blocked (common on mobile/some browsers) — fallback to redirect
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, googleProvider)
      return null
    }
    throw err
  }
}

// Call this on app load to handle redirect result
export const getGoogleRedirectResult = async () => {
  const result = await getRedirectResult(auth)
  if (!result) return null
  const idToken = await result.user.getIdToken()
  return { idToken, user: result.user }
}
