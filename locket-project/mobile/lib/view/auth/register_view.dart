import 'package:flutter/material.dart';

import '../../repositories/auth_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';

/// Bước 1: nhập thông tin. Chưa có mật khẩu ở bước này.
class RegisterView extends StatefulWidget {
  final AuthRepository repository;

  const RegisterView({super.key, required this.repository});

  @override
  State<RegisterView> createState() => _RegisterViewState();
}

class _RegisterViewState extends State<RegisterView> {
  late final AuthViewModel viewModel;

  final nameController = TextEditingController();
  final phoneController = TextEditingController();
  final emailController = TextEditingController();
  final dobController = TextEditingController();

  DateTime? dateOfBirth;

  static final _emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
  static final _phoneRegex = RegExp(r'^(0|\+84)\d{9}$');

  @override
  void initState() {
    super.initState();
    viewModel = AuthViewModel(widget.repository);
  }

  @override
  void dispose() {
    nameController.dispose();
    phoneController.dispose();
    emailController.dispose();
    dobController.dispose();
    viewModel.dispose();
    super.dispose();
  }

  void _toast(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: dateOfBirth ?? DateTime(2000),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      helpText: 'Chọn ngày sinh',
    );
    if (picked == null) return;

    setState(() {
      dateOfBirth = picked;
      dobController.text =
          '${picked.day.toString().padLeft(2, '0')}/'
          '${picked.month.toString().padLeft(2, '0')}/${picked.year}';
    });
  }

  Future<void> handleRegister() async {
    final name = nameController.text.trim();
    final phone = phoneController.text.trim().replaceAll(' ', '');
    final email = emailController.text.trim();

    if (name.isEmpty || phone.isEmpty || email.isEmpty || dateOfBirth == null) {
      _toast('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (!_phoneRegex.hasMatch(phone)) {
      _toast('Số điện thoại không hợp lệ');
      return;
    }
    if (!_emailRegex.hasMatch(email)) {
      _toast('Email không hợp lệ');
      return;
    }

    final success = await viewModel.startRegistration(
      fullName: name,
      phone: phone,
      email: email,
      dateOfBirth: dateOfBirth!,
    );

    if (!mounted) return;

    if (success) {
      // AuthGate sẽ tự chuyển sang màn chờ xác thực email.
      Navigator.of(context).popUntil((route) => route.isFirst);
    } else {
      _toast(viewModel.errorMessage ?? 'Đăng ký thất bại');
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
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'Họ và tên',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.person),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Số điện thoại',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.phone),
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
                  controller: dobController,
                  readOnly: true,
                  onTap: pickDate,
                  decoration: const InputDecoration(
                    labelText: 'Ngày sinh',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.cake),
                    suffixIcon: Icon(Icons.calendar_today),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Chúng tôi sẽ gửi email để bạn xác nhận. '
                  'Sau khi xác nhận, bạn sẽ đặt mật khẩu.',
                  style: TextStyle(color: Colors.grey),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: viewModel.isLoading ? null : handleRegister,
                    child: viewModel.isLoading
                        ? const CircularProgressIndicator()
                        : const Text('Tiếp tục'),
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
