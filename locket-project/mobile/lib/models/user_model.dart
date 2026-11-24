class UserModel {
  final String uid;
  final String email;
  final String displayName;
  final String? photoURL;
  final String role;
  final String status;
  final DateTime? createdAt;

  UserModel({
    required this.uid,
    required this.email,
    required this.displayName,
    this.photoURL,
    this.role = 'user',
    this.status = 'active',
    this.createdAt,
  });

  // Chuyển Model thành Map để lưu Firestore
  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'email': email,
      'displayName': displayName,
      'photoURL': photoURL,
      'role': role,
      'status': status,
      'createdAt': createdAt,
    };
  }

  // Chuyển dữ liệu Firestore thành Model
  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      uid: map['uid'] ?? '',
      email: map['email'] ?? '',
      displayName: map['displayName'] ?? '',
      photoURL: map['photoURL'],
      role: map['role'] ?? 'user',
      status: map['status'] ?? 'active',
      createdAt: map['createdAt']?.toDate(),
    );
  }
}
