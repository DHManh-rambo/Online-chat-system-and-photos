import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../models/user_model.dart';
import '../../repositories/auth_repository.dart';

import 'login_view.dart';
import '../home/home_view.dart';
import '../admin/admin_view.dart';

class AuthGate extends StatelessWidget {
  final AuthRepository repository;

  const AuthGate({super.key, required this.repository});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: repository.authStateChanges.map((user) => user as User?),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final firebaseUser = snapshot.data;

        if (firebaseUser == null) {
          return LoginView(repository: repository);
        }

        return FutureBuilder<UserModel?>(
          future: repository.getCurrentUser(),
          builder: (context, userSnapshot) {
            if (userSnapshot.connectionState == ConnectionState.waiting) {
              return const Scaffold(
                body: Center(child: CircularProgressIndicator()),
              );
            }

            if (userSnapshot.hasError || userSnapshot.data == null) {
              return Scaffold(
                body: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Không thể tải thông tin tài khoản'),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: () => repository.logout(),
                        child: const Text('Đăng xuất'),
                      ),
                    ],
                  ),
                ),
              );
            }

            final UserModel user = userSnapshot.data!;

            if (user.status != 'active') {
              return Scaffold(
                body: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Tài khoản đã bị khóa'),
                      ElevatedButton(
                        onPressed: () => repository.logout(),
                        child: const Text('Đăng xuất'),
                      ),
                    ],
                  ),
                ),
              );
            }

            if (user.role == 'admin') {
              return AdminView(user: user, repository: repository);
            }

            if (user.role == 'user') {
              return HomeView(user: user, repository: repository);
            }

            return const Scaffold(
              body: Center(child: Text('Vai trò tài khoản không hợp lệ')),
            );
          },
        );
      },
    );
  }
}
