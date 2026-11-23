// Solo le parti di Firebase che servono: app, accesso con Google, database con cache offline.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, connectAuthEmulator, signInWithCredential } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, deleteDoc, onSnapshot, connectFirestoreEmulator, writeBatch, getDocFromServer } from 'firebase/firestore';
window.FB = { initializeApp, getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, connectAuthEmulator, signInWithCredential,
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, deleteDoc, onSnapshot, connectFirestoreEmulator, writeBatch, getDocFromServer };
