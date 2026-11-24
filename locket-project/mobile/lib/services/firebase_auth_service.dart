import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/user_model.dart';

class FirebaseAuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Lấy trạng thái đăng nhập
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // Đăng ký
  Future<UserModel> register({
    required String email,
    required String password,
    required String displayName,
  }) async {
    final credential = await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );

    final firebaseUser = credential.user!;

    await firebaseUser.updateDisplayName(displayName);

    final user = UserModel(
      uid: firebaseUser.uid,
      email: email,
      displayName: displayName,
      role: 'user',
      status: 'active',
      createdAt: DateTime.now(),
    );

    await _firestore.collection('users').doc(firebaseUser.uid).set({
      ...user.toMap(),
      'createdAt': FieldValue.serverTimestamp(),
    });

    return user;
  }

  // Đăng nhập
  Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final credential = await _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );

    final firebaseUser = credential.user!;

    final doc = await _firestore
        .collection('users')
        .doc(firebaseUser.uid)
        .get();

    if (!doc.exists || doc.data() == null) {
      await _auth.signOut();
      throw Exception('Không tìm thấy thông tin tài khoản');
    }

    final user = UserModel.fromMap(doc.data()!);

    if (user.status != 'active') {
      await _auth.signOut();
      throw Exception('Tài khoản đã bị khóa');
    }

    return user;
  }

  // Đăng xuất
  Future<void> logout() async {
    await _auth.signOut();
  }

  // Lấy người dùng hiện tại
  Future<UserModel?> getCurrentUser() async {
    final firebaseUser = _auth.currentUser;

    if (firebaseUser == null) return null;

    final doc = await _firestore
        .collection('users')
        .doc(firebaseUser.uid)
        .get();

    if (!doc.exists || doc.data() == null) {
      return null;
    }

    return UserModel.fromMap(doc.data()!);
  }
}
