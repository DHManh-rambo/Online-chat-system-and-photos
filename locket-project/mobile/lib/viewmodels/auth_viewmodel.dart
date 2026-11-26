import 'package:flutter/material.dart';

import '../models/auth_exception.dart';
import '../repositories/auth_repository.dart';

class AuthViewModel extends ChangeNotifier {
  final AuthRepository _repository;

  AuthViewModel(this._repository);

  bool _disposed = false;
  bool isLoading = false;
  String? errorMessage;

  // Không gọi notifyListeners nếu ViewModel đã bị hủy
  // (xảy ra khi AuthGate chuyển màn hình ngay sau khi thao tác xong).
  @override
  void notifyListeners() {
    if (!_disposed) super.notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  Future<bool> _run(Future<void> Function() action) async {
    try {
      isLoading = true;
      errorMessage = null;
      notifyListeners();
      await action();
      return true;
    } on AuthException catch (e) {
      errorMessage = e.message;
      return false;
    } catch (_) {
      errorMessage = 'Đã có lỗi xảy ra, vui lòng thử lại';
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> startRegistration({
    required String fullName,
    required String phone,
    required String email,
    required DateTime dateOfBirth,
  }) {
    return _run(
      () => _repository.startRegistration(
        fullName: fullName,
        phone: phone,
        email: email,
        dateOfBirth: dateOfBirth,
      ),
    );
  }

  Future<bool> resendVerificationEmail() =>
      _run(_repository.resendVerificationEmail);

  Future<bool> completeRegistration(String newPassword) =>
      _run(() => _repository.completeRegistration(newPassword));

  Future<bool> cancelRegistration() => _run(_repository.cancelRegistration);

  Future<bool> login({required String email, required String password}) {
    return _run(() => _repository.login(email: email, password: password));
  }

  Future<bool> sendPasswordReset(String email) =>
      _run(() => _repository.sendPasswordReset(email));

  Future<void> logout() => _repository.logout();
}
