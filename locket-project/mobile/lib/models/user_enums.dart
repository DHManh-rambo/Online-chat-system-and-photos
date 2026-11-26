enum UserRole {
  admin,
  customer;

  String get value => name;

  /// 'user' là giá trị cũ của bản trước, coi như customer.
  static UserRole fromString(String? v) =>
      v == 'admin' ? UserRole.admin : UserRole.customer;
}

enum UserStatus {
  pending, // chờ xác thực email / chưa đặt mật khẩu
  active, // hoạt động
  locked; // bị khóa

  String get value => name;

  /// Giá trị lạ -> locked cho an toàn.
  static UserStatus fromString(String? v) {
    switch (v) {
      case 'pending':
        return UserStatus.pending;
      case 'active':
        return UserStatus.active;
      default:
        return UserStatus.locked;
    }
  }
}
