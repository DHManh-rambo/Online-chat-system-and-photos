import 'package:firebase_auth/firebase_auth.dart';

import '../../models/user_model.dart';
import '../../services/firebase_auth_service.dart';

class AuthRepository {
  final FirebaseAuthService _authService;

  AuthRepository(this._authService);

  Stream<User?> get authStateChanges => _authService.authStateChanges;

  bool get isEmailVerified => _authService.isEmailVerified;

  Stream<UserModel?> watchUser(String uid) => _authService.watchUser(uid);

  Future<void> startRegistration({
    required String fullName,
    required String phone,
    required String email,
    required DateTime dateOfBirth,
  }) {
    return _authService.startRegistration(
      fullName: fullName,
      phone: phone,
      email: email,
      dateOfBirth: dateOfBirth,
    );
  }

  Future<void> resendVerificationEmail() =>
      _authService.resendVerificationEmail();

  Future<bool> refreshEmailVerified() => _authService.refreshEmailVerified();

  Future<void> completeRegistration(String newPassword) =>
      _authService.completeRegistration(newPassword);

  Future<void> cancelRegistration() => _authService.cancelRegistration();

  Future<UserModel> login({required String email, required String password}) {
    return _authService.login(email: email, password: password);
  }

  Future<void> logout() => _authService.logout();

  Future<void> sendPasswordReset(String email) =>
      _authService.sendPasswordReset(email);
}
