# Worker Integration - Unlock Expired Bans

Worker đã được tích hợp vào web app để tự động unlock các user có ban đã hết hạn.

## Cách hoạt động

1. **API Route**: `/api/admin/unlock-expired-bans`
   - Tự động tìm và unlock các user có `banned = true` và `banExpires` đã hết hạn
   - Chạy mỗi 10 phút

2. **Tự động chạy qua 3 cách:**
   - **Vercel Cron** (khuyến nghị): Tự động gọi API mỗi 10 phút khi deploy trên Vercel
   - **Client-side interval**: Tự động gọi từ admin pages mỗi 10 phút (fallback)
   - **Manual call**: Có thể gọi thủ công từ admin UI

## Setup

### 1. Vercel Cron (Production)

File `vercel.json` đã được cấu hình để tự động chạy cron job mỗi 10 phút:

```json
{
  "crons": [
    {
      "path": "/api/admin/unlock-expired-bans",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

**Lưu ý**: Để bảo mật, nên set environment variable `CRON_SECRET` trong Vercel dashboard:
- Vào Vercel Project Settings → Environment Variables
- Thêm `CRON_SECRET` với giá trị bất kỳ (ví dụ: random string)
- Vercel sẽ tự động thêm Authorization header khi gọi cron job

### 2. Client-side Fallback

Admin pages (`/admin/account` và `/admin/locked-account`) tự động gọi API mỗi 10 phút khi có người dùng đang xem trang.

### 3. Manual Testing

Có thể test thủ công bằng cách gọi API:

```bash
# GET request
curl http://localhost:3000/api/admin/unlock-expired-bans

# POST request
curl -X POST http://localhost:3000/api/admin/unlock-expired-bans
```

## Migration từ Worker riêng

Nếu bạn đang chạy worker riêng (`apps/worker`), bạn có thể:
1. Dừng worker riêng
2. Web app sẽ tự động xử lý unlock expired bans

## Monitoring

API route sẽ log các thông tin sau:
- Số lượng user được unlock
- Email của các user được unlock
- Lỗi nếu có

Kiểm tra logs trong Vercel dashboard hoặc console để theo dõi.

