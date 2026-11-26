import 'package:flutter/material.dart';

import '../../models/user_model.dart';
import '../../repositories/auth_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';

/// Bước 3: "Chào mừng đến với Locket" + đặt mật khẩu.
/// Xong thì hồ sơ chuyển sang active, AuthGate tự vào trang chủ.
class SetPasswordView extends StatefulWidget {
  final UserModel user;
  final AuthRepository repository;

  const SetPasswordView({
    super.key,
    required this.user,
    required this.repository,
  });

  @override
  State<SetPasswordView> createState() => _SetPasswordViewState();
}

class _SetPasswordViewState extends State<SetPasswordView> {
  late final AuthViewModel viewModel;

  final passwordController = TextEditingController();
  final confirmController = TextEditingController();

  bool _hidePassword = true;
  bool _hideConfirm = true;

  @override
  void initState() {
    super.initState();
    viewModel = AuthViewModel(widget.repository);
  }

  @override
  void dispose() {
    passwordController.dispose();
    confirmController.dispose();
    viewModel.dispose();
    super.dispose();
  }

  void _toast(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> handleSubmit() async {
    final password = passwordController.text;
    final confirm = confirmController.text;

    if (password.isEmpty || confirm.isEmpty) {
      _toast('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (password.length < 6) {
      _toast('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password != confirm) {
      _toast('Mật khẩu xác nhận không khớp');
      return;
    }

    final success = await viewModel.completeRegistration(password);
    if (!mounted) return;

    if (!success) {
      _toast(viewModel.errorMessage ?? 'Không thể đặt mật khẩu');
    }
    // Thành công: AuthGate tự chuyển sang trang chủ.
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: AnimatedBuilder(
              animation: viewModel,
              builder: (context, child) {
                return Column(
                  children: [
                    const Icon(Icons.verified, size: 90, color: Colors.green),
                    const SizedBox(height: 20),
                    const Text(
                      'Chào mừng đến với Locket',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Xin chào ${widget.user.fullName}, email của bạn đã được xác nhận.\n'
                      'Hãy đặt mật khẩu để hoàn tất.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 28),
                    TextField(
                      controller: passwordController,
                      obscureText: _hidePassword,
                      decoration: InputDecoration(
                        labelText: 'Mật khẩu mới',
                        border: const OutlineInputBorder(),
                        prefixIcon: const Icon(Icons.lock),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _hidePassword
                                ? Icons.visibility_off
                                : Icons.visibility,
                          ),
                          onPressed: () =>
                              setState(() => _hidePassword = !_hidePassword),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: confirmController,
                      obscureText: _hideConfirm,
                      decoration: InputDecoration(
                        labelText: 'Xác nhận mật khẩu mới',
                        border: const OutlineInputBorder(),
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _hideConfirm
                                ? Icons.visibility_off
                                : Icons.visibility,
                          ),
                          onPressed: () =>
                              setState(() => _hideConfirm = !_hideConfirm),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: viewModel.isLoading ? null : handleSubmit,
                        child: viewModel.isLoading
                            ? const CircularProgressIndicator()
                            : const Text('Xác nhận'),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: viewModel.isLoading
                          ? null
                          : widget.repository.logout,
                      child: const Text('Đăng xuất'),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
