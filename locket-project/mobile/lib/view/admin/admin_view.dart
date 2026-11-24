import 'package:flutter/material.dart';

import '../../models/user_model.dart';
import '../../repositories/auth_repository.dart';

class AdminView extends StatelessWidget {
  final UserModel user;
  final AuthRepository repository;

  const AdminView({super.key, required this.user, required this.repository});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Locket Admin'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
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
            const Icon(
              Icons.admin_panel_settings,
              size: 90,
              color: Colors.blue,
            ),
            const SizedBox(height: 20),
            const Text(
              'ADMIN DASHBOARD',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            Text('Xin chào ${user.displayName}'),
            Text('Email: ${user.email}'),
          ],
        ),
      ),
    );
  }
}
