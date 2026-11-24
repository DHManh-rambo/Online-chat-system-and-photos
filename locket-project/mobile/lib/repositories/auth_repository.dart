import '../models/user_model.dart';
import '../services/firebase_auth_service.dart';

class AuthRepository {
  final FirebaseAuthService _authService;

  AuthRepository(this._authService);

  Future<UserModel> register({
    required String email,
    required String password,
    required String displayName,
  }) {
    return _authService.register(
      email: email,
      password: password,
      displayName: displayName,
    );
  }

  Future<UserModel> login({required String email, required String password}) {
    return _authService.login(email: email, password: password);
  }

  Future<void> logout() {
    return _authService.logout();
  }

  Future<UserModel?> getCurrentUser() {
    return _authService.getCurrentUser();
  }

  Stream get authStateChanges => _authService.authStateChanges;
}
