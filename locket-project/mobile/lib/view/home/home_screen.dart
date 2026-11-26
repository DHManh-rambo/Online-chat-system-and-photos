import 'package:flutter/material.dart';

import '../../models/user_model.dart';
import '../../repositories/auth/auth_repository.dart';

class HomeView extends StatelessWidget {
  final UserModel user;
  final AuthRepository repository;

  const HomeView({super.key, required this.user, required this.repository});

  @override
  Widget build(BuildContext context) {
    final avatarUrl = user.avatarUrl;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Locket'),
        actions: [
          IconButton(
            onPressed: () => repository.logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Avatar: chưa có upload, hiện chữ cái đầu. Sau này chỉ cần
            // gán avatarUrl là tự hiện ảnh.
            CircleAvatar(
              radius: 48,
              backgroundImage: avatarUrl != null
                  ? NetworkImage(avatarUrl)
                  : null,
              child: avatarUrl == null
                  ? Text(user.initials, style: const TextStyle(fontSize: 36))
                  : null,
            ),
            const SizedBox(height: 20),
            const Text('Xin chào!', style: TextStyle(fontSize: 24)),
            Text('Tên: ${user.fullName}'),
            Text('Email: ${user.email}'),
            if (user.phone != null) Text('SĐT: ${user.phone}'),
            if (user.dateOfBirthText != null)
              Text('Ngày sinh: ${user.dateOfBirthText}'),
          ],
        ),
      ),
    );
  }
}
