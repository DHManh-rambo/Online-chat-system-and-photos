import 'package:flutter/material.dart';

import '../../repositories/auth_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';

class RegisterView extends StatefulWidget {
  final AuthRepository repository;

  const RegisterView({super.key, required this.repository});

  @override
  State<RegisterView> createState() => _RegisterViewState();
}

class _RegisterViewState extends State<RegisterView> {
  late final AuthViewModel viewModel;

  final nameController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    viewModel = AuthViewModel(widget.repository);
  }

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    viewModel.dispose();
    super.dispose();
  }

  Future<void> handleRegister() async {
    if (nameController.text.trim().isEmpty ||
        emailController.text.trim().isEmpty ||
        passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập đầy đủ thông tin')),
      );
      return;
    }

    if (passwordController.text != confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Mật khẩu xác nhận không khớp')),
      );
      return;
    }

    if (passwordController.text.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Mật khẩu phải có ít nhất 6 ký tự')),
      );
      return;
    }

    final success = await viewModel.register(
      email: emailController.text.trim(),
      password: passwordController.text,
      displayName: nameController.text.trim(),
    );

    if (!mounted) return;

    if (success) {
      // Firebase tự đăng nhập sau khi tạo tài khoản.
      // AuthGate sẽ tự chuyển sang trang chủ.
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Đăng ký thành công!')));

      Navigator.of(context).popUntil((route) => route.isFirst);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(viewModel.errorMessage ?? 'Đăng ký thất bại')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Đăng ký tài khoản')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: AnimatedBuilder(
          animation: viewModel,
          builder: (context, child) {
            return Column(
              children: [
                const Icon(
                  Icons.person_add_alt_1,
                  size: 75,
                  color: Colors.blue,
                ),

                const SizedBox(height: 24),

                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Họ và tên',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.person),
                  ),
                ),

                const SizedBox(height: 16),

                TextField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.email),
                  ),
                ),

                const SizedBox(height: 16),

                TextField(
                  controller: passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Mật khẩu',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.lock),
                  ),
                ),

                const SizedBox(height: 16),

                TextField(
                  controller: confirmPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Xác nhận mật khẩu',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.lock_outline),
                  ),
                ),

                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: viewModel.isLoading ? null : handleRegister,
                    child: viewModel.isLoading
                        ? const CircularProgressIndicator()
                        : const Text('Tạo tài khoản'),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
