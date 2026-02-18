import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCf0PbE5c8tM0ck4BNnROS--xFxzjuWZ4w",
  authDomain: "emerald-spring-402512.firebaseapp.com",
  projectId: "emerald-spring-402512",
  storageBucket: "emerald-spring-402512.firebasestorage.app",
  messagingSenderId: "516941030427",
  appId: "1:516941030427:web:45ae2ae9926ef75f3ac4be"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginWithGithub = () => signInWithPopup(auth, githubProvider);

export const registerEmail = async (email, password, displayName) => {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(res.user, { displayName });
  return res.user;
};

export const loginEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
