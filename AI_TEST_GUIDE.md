# AI Personalization Integration Test Guide
# Hướng dẫn test tích hợp AI cá nhân hóa trong ứng dụng thực

## AI đã được tích hợp vào:
1. **Homepage** (http://localhost:3000/) - Có AI recommendations và smart ordering
2. **Events Page** (http://localhost:3000/events) - Có AI recommendations và smart filtering  
3. **Global tracking** - Theo dõi user behavior trên toàn bộ app

## � Workflow Test Thực Tế:

### **Test 1: Homepage Personalization**
1. **Truy cập Homepage:** http://localhost:3000/
2. **Quan sát:** 
   - Ban đầu: Events hiển thị theo thứ tự mặc định
   - Sau khi có behavior: AI reorder events theo sở thích

### **Test 2: Search & Filter Tracking**
1. **Search events:** Dùng search bar với các từ khóa
   - "rock", "âm nhạc", "concert"
   - "ẩm thực", "festival"
   - "nghệ thuật", "triển lãm"

2. **Filter location:** 
   - Chọn "Hà Nội", "TP.HCM", "Đà Nẵng"
   - AI sẽ track location preferences

3. **Filter category:**
   - Chọn các loại sự kiện khác nhau
   - AI sẽ học category preferences

### **Test 3: Cross-Page Persistence**
1. **Homepage → Events page:**
   - Search "rock" ở homepage
   - Chuyển sang /events
   - ➡️ Events page sẽ show AI recommendations về rock

2. **Events → Homepage:**
   - Filter location "Hà Nội" ở events page
   - Quay về homepage
   - ➡️ Homepage sẽ prioritize events ở Hà Nội

### **Test 4: Real-time Learning**
1. **Scenario - User thích Rock:**
   - Search: "rock", "concert", "nhạc sống"
   - View/click: Events âm nhạc
   - ➡️ AI sẽ recommend thêm events âm nhạc

2. **Scenario - Đổi sở thích:**
   - Search: "ẩm thực", "food festival" 
   - View/click: Events ẩm thực
   - ➡️ AI sẽ adjust và recommend events ẩm thực

## 🔍 Cách kiểm tra AI hoạt động:

### **Console Logs để theo dõi:**
```javascript
// Global tracking
🌐 Global search tracking: rock
🌐 Global location tracking: Hà Nội
📱 Page navigation tracked: /events

// AI Analysis
🧠 Reordering events based on AI recommendations
📊 Events reordered: [...]
AI Personalization: Starting recommendation generation

// User behavior tracking
🔍 Tracking search: rock
👁️ Tracking event view: Event Name
👆 Tracking event click: Event Name
```

### **Visual Indicators:**
- **"✨ Personalized for you"** badge trên event grid
- **"🧠 Analyzing your preferences..."** khi AI đang xử lý
- **AI Recommendations section** hiển thị trên đầu trang
- **Score badges** hiển thị % match trên recommended events

### **localStorage Monitoring:**
Developer Tools → Application → Local Storage:
- `vieticket_user_behavior`: User searches, views, clicks
- `vieticket_recommendations`: AI recommendations
- `vieticket_last_update`: Last analysis timestamp

## Expected Results:

### **Immediate (< 5 seconds):**
- ✅ Search queries được track
- ✅ Location/category filters được track
- ✅ Console logs hiển thị tracking

### **Short-term (10-30 seconds):**
- ✅ AI recommendations appear
- ✅ Events được reorder theo AI scores
- ✅ "Personalized for you" badges hiển thị

### **Medium-term (1-2 minutes):**
- ✅ Cross-page persistence working
- ✅ Filter preferences persist
- ✅ AI adapts to new behavior

### **Long-term (5+ minutes):**
- ✅ Strong personalization patterns
- ✅ Accurate event prioritization
- ✅ Smart category/location matching

## 🛠 Troubleshooting:

### **Nếu không thấy AI recommendations:**
1. Check console logs có tracking không
2. Kiểm tra localStorage có data không
3. Thử clear browser data và test lại

### **Nếu không có personalization:**
1. Đảm bảo đã search/filter ít nhất 2-3 lần
2. View/click một vài events
3. Wait 10-30 seconds cho AI analysis

### **Performance:**
- Caching 5 phút giúp giảm API calls
- AI analysis chỉ chạy khi có behavior changes
- LocalStorage ensures persistence across sessions

## � Business Impact:
- **Better User Experience:** Events relevant to user interests
- **Higher Engagement:** Personalized recommendations increase clicks
- **Data-Driven:** AI learns and adapts without manual configuration
- **Privacy-Friendly:** No server-side user tracking required
- **Cost-Effective:** Optional OpenAI integration, works with fallback

## � Test URLs:
- **Homepage:** http://localhost:3000/
- **Events:** http://localhost:3000/events  
- **AI Test Demo:** http://localhost:3000/ai-test
- **Events with filters:** http://localhost:3000/events?location=Hà+Nội&category=all