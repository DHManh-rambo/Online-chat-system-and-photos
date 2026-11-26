import 'package:cloud_firestore/cloud_firestore.dart';

// =============================================================
// 1. EXCEPTIONS
// =============================================================

/// Lỗi đã được Việt hóa, hiển thị thẳng cho người dùng.
class AuthException implements Exception {
  final String message;

  AuthException(this.message);

  @override
  String toString() => message;
}

// =============================================================
// 2. ENUMS
// =============================================================

enum UserRole {
  admin,
  customer;

  String get value => name;

  /// 'user' là giá trị cũ của bản trước, coi như customer.
  static UserRole fromString(String? value) =>
      value == 'admin' ? UserRole.admin : UserRole.customer;
}

enum UserStatus {
  pending, // chờ xác thực email / chưa đặt mật khẩu
  active, // hoạt động
  locked; // bị khóa

  String get value => name;

  /// Giá trị lạ -> locked cho an toàn.
  static UserStatus fromString(String? value) {
    switch (value) {
      case 'pending':
        return UserStatus.pending;
      case 'active':
        return UserStatus.active;
      default:
        return UserStatus.locked;
    }
  }
}

// =============================================================
// 3. DATA MODEL
// =============================================================

class UserModel {
  // ---- Chung (admin + khách hàng) ----
  final String uid;
  final String fullName;
  final String email;
  final bool emailVerified;
  final String? phone;
  final UserRole role;
  final UserStatus status;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // ---- Riêng khách hàng (nullable) ----
  final String? avatarUrl;
  final DateTime? dateOfBirth;

  const UserModel({
    required this.uid,
    required this.fullName,
    required this.email,
    this.emailVerified = false,
    this.phone,
    this.role = UserRole.customer,
    this.status = UserStatus.pending,
    this.createdAt,
    this.updatedAt,
    this.avatarUrl,
    this.dateOfBirth,
  });

  bool get isAdmin => role == UserRole.admin;

  bool get isActive => status == UserStatus.active;

  String get initials {
    final name = fullName.trim();
    if (name.isEmpty) return '?';

    final lastWord = name.split(RegExp(r'\s+')).last;
    return lastWord.substring(0, 1).toUpperCase();
  }

  String? get dateOfBirthText {
    final dob = dateOfBirth;
    if (dob == null) return null;

    return '${dob.day.toString().padLeft(2, '0')}/'
        '${dob.month.toString().padLeft(2, '0')}/${dob.year}';
  }

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'fullName': fullName,
      'email': email,
      'emailVerified': emailVerified,
      'phone': phone,
      'role': role.value,
      'status': status.value,
      'avatarUrl': avatarUrl,
      'dateOfBirth': dateOfBirth == null
          ? null
          : Timestamp.fromDate(dateOfBirth!),
      'createdAt': createdAt == null ? null : Timestamp.fromDate(createdAt!),
      'updatedAt': updatedAt == null ? null : Timestamp.fromDate(updatedAt!),
    };
  }

  factory UserModel.fromMap(Map<String, dynamic> map, {String? uid}) {
    return UserModel(
      uid: uid ?? (map['uid'] ?? '') as String,
      // 'displayName' / 'photoURL' là tên trường cũ
      fullName: (map['fullName'] ?? map['displayName'] ?? '') as String,
      email: (map['email'] ?? '') as String,
      emailVerified: (map['emailVerified'] ?? false) as bool,
      phone: map['phone'] as String?,
      role: UserRole.fromString(map['role'] as String?),
      status: UserStatus.fromString(map['status'] as String?),
      avatarUrl: (map['avatarUrl'] ?? map['photoURL']) as String?,
      dateOfBirth: _toDate(map['dateOfBirth']),
      createdAt: _toDate(map['createdAt']),
      updatedAt: _toDate(map['updatedAt']),
    );
  }

  UserModel copyWith({
    String? fullName,
    String? email,
    bool? emailVerified,
    String? phone,
    UserRole? role,
    UserStatus? status,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? avatarUrl,
    DateTime? dateOfBirth,
  }) {
    return UserModel(
      uid: uid,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      emailVerified: emailVerified ?? this.emailVerified,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
    );
  }

  /// Helper chuyển đổi dữ liệu thời gian từ Firestore về `DateTime`
  static DateTime? _toDate(dynamic value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return null;
  }
}
