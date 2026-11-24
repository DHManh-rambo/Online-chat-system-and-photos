import 'package:flutter/material.dart';

import '../../models/user_model.dart';
import '../../repositories/auth_repository.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class HomeView extends StatelessWidget {
  final UserModel user;
  final AuthRepository repository;

  const HomeView({super.key, required this.user, required this.repository});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Locket'),
        actions: [
          IconButton(
            onPressed: () async {
              await repository.logout();
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.camera_alt, size: 80, color: Colors.blue),
            const SizedBox(height: 20),
            const Text('Xin chào!', style: TextStyle(fontSize: 24)),
            Text('Tên: ${user.displayName}'),
            Text('Email: ${user.email}'),
            Text('Quyền: ${user.role}'),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                try {
                  await FirebaseFirestore.instance
                      .collection('users')
                      .doc(user.uid)
                      .update({'role': 'admin'});
                  debugPrint('KẾT QUẢ: update THÀNH CÔNG (RULES BỊ HỞ!)');
                } catch (e) {
                  debugPrint('KẾT QUẢ: bị chặn đúng ý -> $e');
                }
              },
              child: const Text('TEST: tự nâng quyền'),
            ),
          ],
        ),
      ),
    );
  }
}
