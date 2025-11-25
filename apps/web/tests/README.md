# VieTicket Unit Test Suite

## Tổng quan

Bộ test này được thiết kế theo hướng dẫn Unit Test Case đã cung cấp, bao gồm 162 test cases cho các chức năng chính của VieTicket:

- **Sign In** (27 test cases)
- **Sign Up Customer** (30 test cases)
- **Sign Up Organizer** (31 test cases)
- **Logout** (20 test cases)
- **Reset Password** (27 test cases)
- **View Events** (29 test cases)
- **View Event Details** (28 test cases)

## Cấu trúc thư mục

```
tests/
├── auth/                           # Authentication tests
│   ├── sign-in-action.test.ts     # Đăng nhập
│   ├── sign-up-customer-action.test.ts     # Đăng ký khách hàng
│   ├── sign-up-organizer-action.test.ts    # Đăng ký tổ chức
│   ├── logout-action.test.ts       # Đăng xuất
│   └── reset-password-action.test.ts       # Đặt lại mật khẩu
├── customer/
│   └── events/                     # Event viewing tests
│       ├── view-events-action.test.ts      # Xem danh sách sự kiện
│       └── view-event-details-action.test.ts   # Xem chi tiết sự kiện
├── common/                         # Common utilities
└── test-config.ts                  # Test configuration
```

## Phân loại Test Cases

Theo hướng dẫn, mỗi chức năng được test với 3 loại:

### Normal Cases (33-40%)

- Các trường hợp sử dụng thông thường
- Dữ liệu đầu vào hợp lệ
- Flow hoạt động bình thường

### Boundary Cases (25-30%)

- Giá trị biên của các input
- Giá trị minimum/maximum
- Trường hợp đặc biệt nhưng hợp lệ

### Abnormal Cases (35-40%)

- Dữ liệu đầu vào không hợp lệ
- Lỗi hệ thống
- Trường hợp ngoại lệ

## Chạy Tests

### Chạy tất cả tests

```bash
bun test
```

### Chạy tests theo nhóm

```bash
# Authentication tests
bun test tests/auth/

# Event tests
bun test tests/customer/

# Specific test file
bun test tests/auth/sign-in-action.test.ts
```

### Chạy với coverage

```bash
bun test --coverage
```

### Chạy ở watch mode

```bash
bun test --watch
```

## Chi tiết các Test Functions

### 1. Authentication Tests

#### Sign In (27 test cases)

- **validateEmail** (8 cases): Format email, domain validation
- **validatePassword** (6 cases): Strength requirements
- **authenticateUser** (9 cases): Session creation, role handling
- **googleOAuthSignIn** (4 cases): Social login flow

#### Sign Up Customer (30 test cases)

- **validateFirstName** (7 cases): Name format validation
- **validateLastName** (4 cases): Last name requirements
- **validatePasswordConfirmation** (5 cases): Password matching
- **validateUniqueEmail** (4 cases): Email uniqueness
- **createCustomerAccount** (8 cases): Account creation flow
- **sendEmailVerification** (2 cases): Email verification

#### Sign Up Organizer (31 test cases)

- **validateOrganizerEmail** (6 cases): Business email validation
- **validateProfileImage** (8 cases): Image upload validation
- **createOrganizerProfile** (5 cases): Profile creation
- **validateOrganizerRole** (3 cases): Role assignment
- **completeOrganizerRegistration** (9 cases): Full registration flow

#### Logout (20 test cases)

- **validateLogoutRequest** (5 cases): Session validation
- **terminateSession** (7 cases): Session cleanup
- **handlePostLogoutRedirect** (7 cases): Redirection logic
- **completeLogoutFlow** (2 cases): Complete flow

#### Reset Password (27 test cases)

- **validateResetEmailRequest** (8 cases): Email validation
- **sendResetEmail** (5 cases): Email sending
- **validateResetToken** (5 cases): Token validation
- **updatePassword** (7 cases): Password update
- **completePasswordResetFlow** (2 cases): Complete flow

### 2. Event Tests

#### View Events (29 test cases)

- **getPublicEvents** (9 cases): Event listing
- **searchEvents** (8 cases): Search functionality
- **filterEventsByCategory** (4 cases): Category filtering
- **incrementEventViewCount** (4 cases): View counting
- **paginateEvents** (4 cases): Pagination

#### View Event Details (28 test cases)

- **fetchEventDetailBySlug** (10 cases): Detail retrieval
- **incrementViewCount** (4 cases): View tracking
- **checkEventAvailability** (6 cases): Availability checking
- **getRelatedEvents** (5 cases): Recommendations
- **getSeatMap** (3 cases): Seat map retrieval

## Test Coverage Goals

- **Lines**: 80%+ coverage of action functions
- **Functions**: 85%+ coverage of public methods
- **Branches**: 75%+ coverage of conditional logic
- **Statements**: 80%+ coverage of executable code

## Validation Patterns

Các test cases kiểm tra:

### Input Validation

- Format validation (email, password, names)
- Length constraints
- Required field validation
- Special character handling

### Business Logic

- Role-based access control
- Event approval workflow
- Ticket availability logic
- Price calculations

### Error Handling

- Network failures
- Database errors
- Service unavailability
- Invalid tokens/sessions

### Security

- SQL injection prevention
- XSS protection
- Authentication bypasses
- Authorization checks

## Mock Strategy

### Authentication Mocks

- `authClient.signIn.email`
- `authClient.signUp.email`
- `authClient.signOut`
- `authClient.forgetPassword`

### Service Mocks

- `eventService.getPublicEvents`
- `eventService.fetchEventDetail`
- `organizerActions.createOrganizerAction`
- Email service mocks

### Navigation Mocks

- `useRouter().push`
- `useRouter().replace`
- Page reloads

## Thêm Test Cases Mới

Khi thêm test cases mới, tuân theo:

### 1. Naming Convention

```typescript
test("TC##: Description (Category)", async () => {
  // Test implementation
});
```

### 2. Test Structure

```typescript
describe("Function: functionName", () => {
  describe("Normal Cases", () => {
    test("TC01: Valid input (Normal)", async () => {
      // Condition: Description of test condition
      // Confirmation: Expected behavior
      // Assertions
      console.log("✅ PASSED: Description");
    });
  });

  describe("Boundary Cases", () => {
    // Boundary tests
  });

  describe("Abnormal Cases", () => {
    // Error cases
  });
});
```

### 3. Error Testing

```typescript
test("TC##: Error case (Abnormal)", async () => {
  // Mock rejection
  mockFunction.mockRejectedValueOnce({
    error: { message: "Error message" },
  });

  // Test error handling
  let error = null;
  try {
    await functionUnderTest();
  } catch (e) {
    error = e;
  }

  expect(error).toBeDefined();
  console.log("❌ FAILED as expected: Error handled");
});
```

## Best Practices

1. **Isolation**: Mỗi test case độc lập
2. **Clarity**: Tên test case mô tả rõ ràng
3. **Coverage**: Bao phủm normal, boundary, abnormal cases
4. **Maintenance**: Mock reset trong beforeEach
5. **Documentation**: Comment rõ condition và confirmation

## Troubleshooting

### Common Issues

1. **Mock not resetting**

   ```typescript
   beforeEach(() => {
     mockFunction.mockClear();
   });
   ```

2. **TypeScript errors**
   - Use proper type assertions: `(error as any)?.error?.message`
   - Import types correctly

3. **Async issues**
   - Always await async operations
   - Use proper Promise handling

### Running Specific Tests

```bash
# Run single test file
bun test tests/auth/sign-in-action.test.ts

# Run tests matching pattern
bun test --testNamePattern="validateEmail"

# Debug mode
bun test --verbose tests/auth/sign-in-action.test.ts
```

## Kết quả mong đợi

Tất cả 162 test cases sẽ pass trong môi trường development. Các test fail có thể chỉ ra vấn đề về:

- Logic validation đầu vào
- Xử lý lỗi
- Tuân thủ business rules
- Implementation bảo mật

## Liên hệ

Nếu có vấn đề với test suite, vui lòng tạo issue hoặc liên hệ team development.
