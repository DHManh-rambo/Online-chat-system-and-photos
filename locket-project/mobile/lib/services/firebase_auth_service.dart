import 'dart:convert';
import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/auth_exception.dart';
import '../models/user_enums.dart';
import '../models/user_model.dart';

class FirebaseAuthService {
  FirebaseAuthService({
    FirebaseAuth? auth,
    FirebaseFirestore? firestore,
    FlutterSecureStorage? storage,
  }) : _auth = auth ?? FirebaseAuth.instance,
       _firestore = firestore ?? FirebaseFirestore.instance,
       _storage = storage ?? const FlutterSecureStorage();

  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;
  final FlutterSecureStorage _storage;

  static const _tempPasswordKey = 'locket_temp_password';

  CollectionReference<Map<String, dynamic>> get _users =>
      _firestore.collection('users');

  /// userChanges() phát cả khi reload()/đổi mật khẩu, không chỉ đăng nhập/xuất.
  Stream<User?> get authStateChanges => _auth.userChanges();

  bool get isEmailVerified => _auth.currentUser?.emailVerified ?? false;

  /// Theo dõi realtime hồ sơ Firestore (khóa/kích hoạt có hiệu lực ngay).
  Stream<UserModel?> watchUser(String uid) {
    return _users.doc(uid).snapshots().map((doc) {
      final data = doc.data();
      if (!doc.exists || data == null) return null;
      return UserModel.fromMap(data, uid: doc.id);
    });
  }

  // ------------------------------------------------------------------
  // ĐĂNG KÝ (3 bước)
  // ------------------------------------------------------------------

  /// Bước 1: tạo tài khoản tạm (mật khẩu ngẫu nhiên) + hồ sơ pending + gửi mail.
  Future<void> startRegistration({
    required String fullName,
    required String phone,
    required String email,
    required DateTime dateOfBirth,
  }) async {
    final tempPassword = _generatePassword();

    final UserCredential credential;
    try {
      credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: tempPassword,
      );
    } on FirebaseAuthException catch (e) {
      throw AuthException(_message(e));
    }

    final firebaseUser = credential.user!;

    try {
      // Nếu lưu mật khẩu tạm thất bại, rollback cả tài khoản Auth vừa tạo.
      await _storage.write(key: _tempPasswordKey, value: tempPassword);
      await firebaseUser.updateDisplayName(fullName);

      final user = UserModel(
        uid: firebaseUser.uid,
        fullName: fullName,
        email: email,
        emailVerified: false,
        phone: phone,
        role: UserRole.customer,
        status: UserStatus.pending,
        dateOfBirth: dateOfBirth,
      );

      await _users.doc(firebaseUser.uid).set({
        ...user.toMap(),
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });

      await firebaseUser.sendEmailVerification();
    } catch (e) {
      await _rollback(firebaseUser);
      if (e is FirebaseAuthException) throw AuthException(_message(e));
      throw AuthException('Không thể tạo tài khoản, vui lòng thử lại');
    }
  }

  Future<void> resendVerificationEmail() async {
    final user = _auth.currentUser;
    if (user == null) return;
    try {
      await user.sendEmailVerification();
    } on FirebaseAuthException catch (e) {
      throw AuthException(_message(e));
    }
  }

  /// Hỏi lại server xem email đã được xác nhận chưa.
  Future<bool> refreshEmailVerified() async {
    final user = _auth.currentUser;
    if (user == null) return false;
    try {
      await user.reload();
    } on FirebaseAuthException {
      return false;
    }
    return _auth.currentUser?.emailVerified ?? false;
  }

  /// Bước 3: đặt mật khẩu thật + chuyển hồ sơ sang active.
  Future<void> completeRegistration(String newPassword) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw AuthException('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    }

    if (!await refreshEmailVerified()) {
      throw AuthException('Email chưa được xác nhận');
    }

    try {
      await user.updatePassword(newPassword);
    } on FirebaseAuthException catch (e) {
      if (e.code != 'requires-recent-login') {
        throw AuthException(_message(e));
      }
      // Phiên cũ: đăng nhập lại ngầm bằng mật khẩu tạm rồi đổi tiếp.
      final temp = await _storage.read(key: _tempPasswordKey);
      if (temp == null || user.email == null) {
        throw AuthException(
          'Phiên đăng nhập đã cũ. Hãy đăng xuất rồi dùng "Quên mật khẩu" '
          'để đặt mật khẩu.',
        );
      }
      try {
        await user.reauthenticateWithCredential(
          EmailAuthProvider.credential(email: user.email!, password: temp),
        );
        await user.updatePassword(newPassword);
      } on FirebaseAuthException catch (e2) {
        throw AuthException(_message(e2));
      }
    }

    try {
      // Làm mới token để rules thấy email_verified = true.
      await user.getIdToken(true);
      await _users.doc(user.uid).update({
        'status': UserStatus.active.value,
        'emailVerified': true,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } on FirebaseException {
      throw AuthException('Không thể kích hoạt tài khoản, vui lòng thử lại');
    }

    await _storage.delete(key: _tempPasswordKey);
  }

  /// Hủy đăng ký dở (ví dụ gõ sai email): xóa hồ sơ pending + tài khoản.
  Future<void> cancelRegistration() async {
    final user = _auth.currentUser;
    if (user == null) return;
    try {
      await _users.doc(user.uid).delete();
      await user.delete();
    } on FirebaseException {
      await _auth.signOut();
    }
    await _storage.delete(key: _tempPasswordKey);
  }

  // ------------------------------------------------------------------
  // ĐĂNG NHẬP / ĐĂNG XUẤT / QUÊN MẬT KHẨU
  // ------------------------------------------------------------------

  Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final UserCredential credential;
    try {
      credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      throw AuthException(_message(e));
    }

    final uid = credential.user!.uid;
    final UserModel? user;
    try {
      final doc = await _users.doc(uid).get();
      user = doc.exists && doc.data() != null
          ? UserModel.fromMap(doc.data()!, uid: doc.id)
          : null;
    } on FirebaseException {
      await _auth.signOut();
      throw AuthException('Không thể tải thông tin tài khoản');
    }

    if (user == null) {
      await _auth.signOut();
      throw AuthException('Không tìm thấy thông tin tài khoản');
    }
    if (user.status == UserStatus.locked) {
      await _auth.signOut();
      throw AuthException('Tài khoản đã bị khóa');
    }
    // pending: không đăng xuất, AuthGate sẽ đưa về đúng bước đang dở.
    return user;
  }

  Future<void> logout() async {
    await _storage.delete(key: _tempPasswordKey);
    await _auth.signOut();
  }

  Future<void> sendPasswordReset(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email);
    } on FirebaseAuthException catch (e) {
      // Không tiết lộ email có tồn tại hay không.
      if (e.code == 'user-not-found') return;
      throw AuthException(_message(e));
    }
  }

  // ------------------------------------------------------------------
  // Tiện ích
  // ------------------------------------------------------------------

  Future<void> _rollback(User user) async {
    try {
      await _users.doc(user.uid).delete();
    } catch (_) {}
    try {
      await user.delete();
    } catch (_) {
      try {
        await _auth.signOut();
      } catch (_) {}
    }
    try {
      await _storage.delete(key: _tempPasswordKey);
    } catch (_) {}
  }

  String _generatePassword() {
    final rnd = Random.secure();
    final bytes = List<int>.generate(24, (_) => rnd.nextInt(256));
    // Hậu tố để thỏa mọi chính sách mật khẩu (hoa, thường, số, ký tự đặc biệt).
    return '${base64UrlEncode(bytes)}aA1!';
  }

  String _message(FirebaseAuthException e) {
    switch (e.code) {
      case 'email-already-in-use':
        return 'Email này đã được đăng ký. Nếu bạn chưa đặt mật khẩu, '
            'hãy dùng "Quên mật khẩu".';
      case 'invalid-email':
        return 'Email không hợp lệ';
      case 'weak-password':
        return 'Mật khẩu quá yếu';
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'Email hoặc mật khẩu không đúng';
      case 'user-disabled':
        return 'Tài khoản đã bị khóa';
      case 'too-many-requests':
        return 'Thao tác quá nhiều lần, vui lòng thử lại sau ít phút';
      case 'network-request-failed':
        return 'Không có kết nối mạng';
      case 'requires-recent-login':
        return 'Phiên đăng nhập đã cũ, vui lòng đăng nhập lại';
      default:
        return 'Đã có lỗi xảy ra (${e.code})';
    }
  }
}
