// Lỗi có mã HTTP rõ ràng, để errorHandler trả JSON thống nhất
class AppError extends Error {
    constructor(message, status = 400, code = 'bad_request') {
        super(message);
        this.status = status;
        this.code = code;
    }
}

module.exports = AppError;