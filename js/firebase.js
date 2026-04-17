let db = null;
try {
    const firebaseConfig = {
        apiKey: "AIzaSyBD0UVr67nudMn54K9m_g1LwVu4pJYdmGg",
        authDomain: "losovani-f6a8b.firebaseapp.com",
        databaseURL: "https://losovani-f6a8b-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "losovani-f6a8b",
        storageBucket: "losovani-f6a8b.firebasestorage.app",
        messagingSenderId: "466939997706",
        appId: "1:466939997706:web:55c272f4f38db5b96af9f3"
    };
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} catch(e) {
    console.error('Firebase init failed:', e);
}
