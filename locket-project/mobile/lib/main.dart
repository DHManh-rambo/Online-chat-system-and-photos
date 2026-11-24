import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';

import 'firebase_options.dart';

import 'services/firebase_auth_service.dart';
import 'repositories/auth_repository.dart';
import 'view/auth/auth_gate.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  final authService = FirebaseAuthService();

  final authRepository = AuthRepository(authService);

  runApp(LocketApp(repository: authRepository));
}

class LocketApp extends StatelessWidget {
  final AuthRepository repository;

  const LocketApp({super.key, required this.repository});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Locket',
      theme: ThemeData(primarySwatch: Colors.blue, useMaterial3: true),
      home: AuthGate(repository: repository),
    );
  }
}
