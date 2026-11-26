import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../models/user_enums.dart';
import '../../models/user_model.dart';
import '../../repositories/auth_repository.dart';
import '../admin/admin_view.dart';
import '../home/home_view.dart';
import 'login_view.dart';
import 'set_password_view.dart';
import 'verify_email_view.dart';

/// Điều hướng theo trạng thái:
/// chưa đăng nhập -> Login
/// pending + chưa xác thực email -> VerifyEmail
/// pending + đã xác thực -> SetPassword (Chào mừng)
/// active -> Admin / Home theo role
/// locked -> màn bị khóa
class AuthGate extends StatelessWidget {
  final AuthRepository repository;

  const AuthGate({super.key, required this.repository});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: repository.authStateChanges,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const _LoadingScreen();
        }

        final firebaseUser = snapshot.data;
        if (firebaseUser == null) {
          return LoginView(repository: repository);
        }

        return _UserGate(
          key: ValueKey(firebaseUser.uid),
          uid: firebaseUser.uid,
          repository: repository,
        );
      },
    );
  }
}

class _UserGate extends StatefulWidget {
  final String uid;
  final AuthRepository repository;

  const _UserGate({super.key, required this.uid, required this.repository});

  @override
  State<_UserGate> createState() => _UserGateState();
}

class _UserGateState extends State<_UserGate> {
  late final Stream<UserModel?> _userStream;

  @override
  void initState() {
    super.initState();
    _userStream = widget.repository.watchUser(widget.uid);
  }

  @override
  Widget build(BuildContext context) {
    final repository = widget.repository;

    return StreamBuilder<UserModel?>(
      stream: _userStream,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _MessageScreen(
            message: 'Không thể tải thông tin tài khoản',
            onLogout: repository.logout,
          );
        }

        final user = snapshot.data;
        if (user == null) {
          // Hồ sơ đang được tạo (ngay sau đăng ký) hoặc chưa có.
          return _LoadingScreen(onLogout: repository.logout);
        }

        switch (user.status) {
          case UserStatus.locked:
            return _MessageScreen(
              message: 'Tài khoản đã bị khóa',
              onLogout: repository.logout,
            );

          case UserStatus.pending:
            if (!repository.isEmailVerified) {
              return VerifyEmailView(
                user: user,
                repository: repository,
                onVerified: () {
                  if (mounted) setState(() {});
                },
              );
            }
            return SetPasswordView(user: user, repository: repository);

          case UserStatus.active:
            return user.isAdmin
                ? AdminView(user: user, repository: repository)
                : HomeView(user: user, repository: repository);
        }
      },
    );
  }
}

class _LoadingScreen extends StatelessWidget {
  final Future<void> Function()? onLogout;

  const _LoadingScreen({this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            if (onLogout != null) ...[
              const SizedBox(height: 24),
              TextButton(onPressed: onLogout, child: const Text('Đăng xuất')),
            ],
          ],
        ),
      ),
    );
  }
}

class _MessageScreen extends StatelessWidget {
  final String message;
  final Future<void> Function() onLogout;

  const _MessageScreen({required this.message, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_outline, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: onLogout,
                child: const Text('Đăng xuất'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
