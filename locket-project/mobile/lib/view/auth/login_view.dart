import 'package:flutter/material.dart';

import '../../repositories/auth_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import 'register_view.dart';

class LoginView extends StatefulWidget {
  final AuthRepository repository;

  const LoginView({super.key, required this.repository});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  late final AuthViewModel viewModel;

  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    viewModel = AuthViewModel(widget.repository);
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    viewModel.dispose();
    super.dispose();
  }

  Future<void> handleLogin() async {
    final success = await viewModel.login(
      email: emailController.text.trim(),
      password: passwordController.text.trim(),
    );

    if (!mounted) return;

    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(viewModel.errorMessage ?? 'Đăng nhập thất bại')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: AnimatedBuilder(
            animation: viewModel,
            builder: (context, child) {
              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.camera_alt, size: 80, color: Colors.blue),

                  const SizedBox(height: 20),

                  const Text(
                    'Welcome to Locket',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                  ),

                  const SizedBox(height: 30),

                  TextField(
                    controller: emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.email),
                      border: OutlineInputBorder(),
                    ),
                  ),

                  const SizedBox(height: 16),

                  TextField(
                    controller: passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Mật khẩu',
                      prefixIcon: Icon(Icons.lock),
                      border: OutlineInputBorder(),
                    ),
                  ),

                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: viewModel.isLoading ? null : handleLogin,
                      child: viewModel.isLoading
                          ? const CircularProgressIndicator()
                          : const Text('Đăng nhập'),
                    ),
                  ),

                  const SizedBox(height: 16),

                  TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) =>
                              RegisterView(repository: widget.repository),
                        ),
                      );
                    },
                    child: const Text('Chưa có tài khoản? Đăng ký'),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
