import 'package:flutter/material.dart';

import '../models/user_model.dart';
import '../repositories/auth_repository.dart';

class AuthViewModel extends ChangeNotifier {
  final AuthRepository _repository;

  AuthViewModel(this._repository);

  UserModel? currentUser;

  bool isLoading = false;

  String? errorMessage;

  Future<bool> register({
    required String email,
    required String password,
    required String displayName,
  }) async {
    try {
      isLoading = true;
      errorMessage = null;
      notifyListeners();

      currentUser = await _repository.register(
        email: email,
        password: password,
        displayName: displayName,
      );

      return true;
    } catch (e) {
      errorMessage = e.toString();
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login({required String email, required String password}) async {
    try {
      isLoading = true;
      errorMessage = null;
      notifyListeners();

      currentUser = await _repository.login(email: email, password: password);

      return true;
    } catch (e) {
      errorMessage = e.toString();
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    currentUser = null;
    notifyListeners();
  }
}
