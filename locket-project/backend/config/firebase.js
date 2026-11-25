const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

const serviceAccount = require('../keys/service_account_key.json');

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const auth = getAuth();
const db = getFirestore();

module.exports = { admin, auth, db };