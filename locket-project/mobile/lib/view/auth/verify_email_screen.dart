import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/user_model.dart';
import '../../repositories/auth/auth_repository.dart';
import '../../viewmodels/auth/auth_viewmodel.dart';

/// Bước 2: chờ người dùng bấm xác nhận trong email.
/// App tự hỏi Firebase mỗi 3 giây và khi quay lại từ ứng dụng mail/trình duyệt.
class VerifyEmailView extends StatefulWidget {
  final UserModel user;
  final AuthRepository repository;
  final VoidCallback onVerified;

  const VerifyEmailView({
    super.key,
    required this.user,
    required this.repository,
    required this.onVerified,
  });

  @override
  State<VerifyEmailView> createState() => _VerifyEmailViewState();
}

class _VerifyEmailViewState extends State<VerifyEmailView>
    with WidgetsBindingObserver {
  late final AuthViewModel viewModel;

  Timer? _pollTimer;
  Timer? _cooldownTimer;
  int _cooldown = 60; // mail vừa được gửi lúc đăng ký
  bool _checking = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    viewModel = AuthViewModel(widget.repository);
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) => _check());
    _startCooldown();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pollTimer?.cancel();
    _cooldownTimer?.cancel();
    viewModel.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _check();
  }

  void _toast(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  void _startCooldown() {
    _cooldownTimer?.cancel();
    setState(() => _cooldown = 60);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      if (_cooldown <= 1) {
        t.cancel();
        setState(() => _cooldown = 0);
      } else {
        setState(() => _cooldown--);
      }
    });
  }

  Future<void> _check({bool manual = false}) async {
    if (_checking) return;
    _checking = true;
    try {
      final verified = await widget.repository.refreshEmailVerified();
      if (!mounted) return;
      if (verified) {
        _pollTimer?.cancel();
        widget.onVerified();
      } else if (manual) {
        _toast('Email chưa được xác nhận. Hãy bấm nút trong email trước nhé.');
      }
    } finally {
      _checking = false;
    }
  }

  Future<void> _resend() async {
    final ok = await viewModel.resendVerificationEmail();
    if (!mounted) return;
    if (ok) {
      _toast('Đã gửi lại email xác nhận');
      _startCooldown();
    } else {
      _toast(viewModel.errorMessage ?? 'Không thể gửi email');
    }
  }

  Future<void> _cancel() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Dùng email khác?'),
        content: const Text(
          'Đăng ký hiện tại sẽ bị hủy và bạn có thể nhập lại thông tin.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Không'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Đồng ý'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    final ok = await viewModel.cancelRegistration();
    if (!mounted) return;
    if (!ok) _toast(viewModel.errorMessage ?? 'Không thể hủy đăng ký');
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
                    const Icon(
                      Icons.mark_email_unread_outlined,
                      size: 90,
                      color: Colors.blue,
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Kiểm tra email của bạn',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Chúng tôi đã gửi email đến\n${widget.user.email}\n'
                      'Hãy mở email và bấm nút xác nhận, sau đó quay lại app.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Đang chờ xác nhận...',
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: () => _check(manual: true),
                        child: const Text('Tôi đã xác nhận'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: (_cooldown > 0 || viewModel.isLoading)
                          ? null
                          : _resend,
                      child: Text(
                        _cooldown > 0
                            ? 'Gửi lại email (${_cooldown}s)'
                            : 'Gửi lại email',
                      ),
                    ),
                    TextButton(
                      onPressed: viewModel.isLoading ? null : _cancel,
                      child: const Text('Dùng email khác'),
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
