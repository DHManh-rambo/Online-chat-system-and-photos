const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

const serviceAccount = require('../keys/service_account_key.json');

// Chỉ khởi tạo Firebase một lần duy nhất.
// Tránh lỗi "app already exists" khi hot-reload hoặc khi file được require nhiều nơi.
if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const auth = getAuth();
const db = getFirestore();

module.exports = { admin, auth, db };