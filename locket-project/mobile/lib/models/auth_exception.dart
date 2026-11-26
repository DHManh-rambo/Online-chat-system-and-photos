/// Lỗi đã được Việt hóa, hiển thị thẳng cho người dùng.
class AuthException implements Exception {
  final String message;
  AuthException(this.message);

  @override
  String toString() => message;
}
