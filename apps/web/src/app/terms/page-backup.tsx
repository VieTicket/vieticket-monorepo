"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, Users, Building } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("terms");
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-yellow-50/20 to-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#2A273F] via-[#3A3555] to-[#2A273F] text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400/20 backdrop-blur-sm px-4 py-2 rounded-full text-yellow-300 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
            {t("hero.title")}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-4">
            {t("hero.subtitle")}
          </p>
          <p className="text-sm text-gray-400">
            {t("hero.lastUpdated")}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 text-center">
            <p className="text-lg text-gray-700 max-w-4xl mx-auto">
              {t("intro")}
            </p>
          </div>

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">{t("tabs.general")}</span>
                <span className="sm:hidden">Chung</span>
              </TabsTrigger>
              <TabsTrigger value="customers" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">{t("tabs.customers")}</span>
                <span className="sm:hidden">Người dùng</span>
              </TabsTrigger>
              <TabsTrigger value="organizers" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span className="hidden sm:inline">{t("tabs.organizers")}</span>
                <span className="sm:hidden">Nhà tổ chức</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Content for General Terms */}
            <TabsContent value="general">
              <Card>
                <CardContent className="p-8">
                  <div className="h-[600px] overflow-y-auto pr-4">
                    <div className="prose prose-gray max-w-none">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">ĐIỀU KHOẢN CHUNG & GIẢI QUYẾT TRANH CHẤP</h2>
                      
                      <div className="space-y-6">
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                          <h3 className="text-xl font-semibold text-blue-900 mb-3">
                            Quyền sở hữu trí tuệ của Sàn
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            Mọi mã nguồn, giao diện, logo và cơ sở dữ liệu của VIETICKET thuộc quyền sở hữu của chúng tôi. 
                            Nghiêm cấm mọi hành vi sao chép hoặc sử dụng công cụ tự động (bot) để cào dữ liệu.
                          </p>
                        </div>

                        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                          <h3 className="text-xl font-semibold text-yellow-900 mb-3">
                            Luật điều chỉnh
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam.
                          </p>
                        </div>

                        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                          <h3 className="text-xl font-semibold text-green-900 mb-3">
                            Giải quyết tranh chấp
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết qua thương lượng. 
                            Nếu không đạt được thỏa thuận sau 30 ngày, tranh chấp sẽ được đưa ra 
                            Tòa án có thẩm quyền tại Đà Nẵng để giải quyết.
                          </p>
                        </div>

                        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                          <h3 className="text-xl font-semibold text-red-900 mb-3">
                            Bảo mật và quyền riêng tư
                          </h3>
                          <p className="text-gray-700 leading-relaxed mb-4">
                            VIETICKET cam kết bảo vệ thông tin cá nhân của người dùng theo các quy định sau:
                          </p>
                          <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            <li>Thông tin được mã hóa và bảo mật theo tiêu chuẩn quốc tế</li>
                            <li>Không chia sẻ dữ liệu với bên thứ ba mà không có sự đồng ý</li>
                            <li>Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân</li>
                            <li>Quyền yêu cầu xóa dữ liệu cá nhân khi không sử dụng dịch vụ</li>
                          </ul>
                        </div>

                        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                          <h3 className="text-xl font-semibold text-purple-900 mb-3">
                            Điều khoản sửa đổi
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            VIETICKET có quyền cập nhật và sửa đổi các điều khoản này theo thời gian. 
                            Thông báo về các thay đổi sẽ được gửi qua email đăng ký hoặc hiển thị trên website 
                            ít nhất 7 ngày trước khi có hiệu lực.
                          </p>
                        </div>

                        <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                          <h3 className="text-xl font-semibold text-indigo-900 mb-3">
                            Hiệu lực điều khoản
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            Các điều khoản và điều kiện này có hiệu lực từ ngày công bố và áp dụng cho tất cả 
                            người dùng khi truy cập và sử dụng dịch vụ của VIETICKET. Việc tiếp tục sử dụng dịch vụ 
                            sau khi có thay đổi điều khoản đồng nghĩa với việc chấp nhận các điều khoản mới.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Content for Customers */}
            <TabsContent value="customers">
              <Card>
                <CardContent className="p-8">
                  <div className="h-[600px] overflow-y-auto pr-4">
                    <div className="prose prose-gray max-w-none">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">DÀNH CHO NGƯỜI MUA VÉ (KHÁCH HÀNG)</h2>
                      
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Định nghĩa</h3>
                          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <div><strong>Nền tảng:</strong> VIETICKET (bao gồm website và ứng dụng di động).</div>
                            <div><strong>Ban tổ chức (BTC):</strong> Đơn vị/Cá nhân trực tiếp tổ chức sự kiện, chịu trách nhiệm về nội dung, tính pháp lý và chất lượng sự kiện.</div>
                            <div><strong>Vé hợp lệ:</strong> Vé điện tử (E-ticket) có mã QR/Barcode được xuất từ hệ thống VIETICKET, chưa qua sử dụng (chưa check-in).</div>
                            <div><strong>Giá vé:</strong> Mệnh giá gốc của vé do BTC quy định.</div>
                            <div><strong>Phí dịch vụ:</strong> Khoản phí người mua trả cho việc sử dụng nền tảng VIETICKET (bao gồm phí xử lý giao dịch, phí cổng thanh toán).</div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">2. Quy định về Mua vé & Thanh toán</h3>
                          <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <h4 className="font-semibold text-blue-900 mb-2">Trách nhiệm cung cấp thông tin:</h4>
                              <p className="text-gray-700">
                                Người mua phải cung cấp chính xác Email và Số điện thoại. VIETICKET không chịu trách nhiệm nếu vé bị gửi thất lạc do lỗi nhập liệu của người mua.
                              </p>
                            </div>
                            
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <h4 className="font-semibold text-yellow-900 mb-2">Thời gian giữ vé:</h4>
                              <p className="text-gray-700">
                                Đơn hàng đang thực hiện (pending) sẽ tự động hủy nếu không hoàn tất thanh toán trong vòng 15 phút.
                              </p>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-900 mb-2">Xác nhận đơn hàng:</h4>
                              <p className="text-gray-700">
                                Giao dịch được xem là hoàn tất khi bạn nhận được Email xác nhận kèm mã vé. Trong trường hợp tài khoản đã bị trừ tiền nhưng chưa nhận được vé sau 30 phút, vui lòng liên hệ Hotline để được hỗ trợ đối soát.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">3. Chính sách Sử dụng & Bảo mật vé</h3>
                          <div className="space-y-4">
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                              <h4 className="font-semibold text-red-900 mb-2">Quy tắc "Check-in đầu tiên":</h4>
                              <p className="text-gray-700">
                                Mã vé là duy nhất. Trong trường hợp một mã vé bị sao chép và có nhiều người cùng sử dụng để check-in, hệ thống chỉ chấp nhận người check-in đầu tiên. VIETICKET và BTC không có trách nhiệm giải quyết tranh chấp tại cổng soát vé.
                              </p>
                            </div>

                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                              <h4 className="font-semibold text-orange-900 mb-2">Bảo mật:</h4>
                              <p className="text-gray-700">
                                Khách hàng có trách nhiệm tự bảo mật mã vé của mình. Không chia sẻ hình ảnh mã QR lên mạng xã hội để tránh bị kẻ gian lợi dụng.
                              </p>
                            </div>

                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                              <h4 className="font-semibold text-purple-900 mb-2">Quyền từ chối phục vụ:</h4>
                              <p className="text-gray-700">
                                BTC có quyền từ chối người tham dự nếu vi phạm quy định về an ninh, độ tuổi (nếu sự kiện có giới hạn 18+), hoặc mang theo vật cấm. Trong trường hợp này, vé sẽ không được hoàn tiền.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">4. Chính sách Hoàn, Hủy và Đổi trả (Refund Policy)</h3>
                          <p className="text-gray-600 mb-4">Nhằm đảm bảo quyền lợi và sự linh hoạt cho khách hàng, VIETICKET áp dụng chính sách hoàn vé như sau:</p>
                          
                          <div className="space-y-6">
                            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                              <h4 className="font-semibold text-blue-900 mb-3">4.1. Hoàn vé theo yêu cầu của Khách hàng (Lý do cá nhân)</h4>
                              <p className="text-gray-700 mb-3">Áp dụng cho các sự kiện có tham gia chương trình "Hoàn vé linh hoạt" của VIETICKET:</p>
                              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li><strong>Yêu cầu trước 07 ngày</strong> (tính đến giờ bắt đầu sự kiện): Hoàn lại <strong>80%</strong> tổng giá trị đơn hàng.</li>
                                <li><strong>Yêu cầu trước 05 ngày</strong> (tính đến giờ bắt đầu sự kiện): Hoàn lại <strong>60%</strong> tổng giá trị đơn hàng.</li>
                                <li><strong>Yêu cầu trong vòng 05 ngày trước sự kiện:</strong> Không hỗ trợ hoàn tiền dưới mọi hình thức.</li>
                              </ul>
                              <p className="text-sm text-gray-600 mt-3 italic">
                                Lưu ý: Thời gian hoàn tiền từ 15-30 ngày làm việc tùy thuộc vào ngân hàng phát hành thẻ.
                              </p>
                            </div>

                            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-900 mb-3">4.2. Hoàn vé do sự cố từ Ban Tổ Chức (Sự kiện bị Hủy/Hoãn)</h4>
                              <div className="space-y-4">
                                <div>
                                  <strong className="text-green-800">Sự kiện bị Hủy:</strong>
                                  <span className="text-gray-700 ml-2">Hoàn tiền <strong>100%</strong> mệnh giá vé.</span>
                                </div>
                                <div>
                                  <strong className="text-green-800">Sự kiện thay đổi thời gian/địa điểm do Bất khả kháng</strong> (Thiên tai, dịch bệnh, bão lũ...):
                                  <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-1">
                                    <li>Khách hàng có thể chọn giữ vé để tham gia vào ngày tổ chức mới.</li>
                                    <li>Hoặc yêu cầu hoàn tiền: Số tiền hoàn lại là <strong>90%</strong> giá trị vé (<strong>10%</strong> còn lại là chi phí vận hành hệ thống và phí cổng thanh toán đã thực hiện).</li>
                                  </ul>
                                </div>
                              </div>
                            </div>

                            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                              <h4 className="font-semibold text-red-900 mb-3">4.3. Cơ chế bảo vệ người mua (Anti-Scam)</h4>
                              <p className="text-gray-700">
                                Nếu sự kiện bị khiếu nại diện rộng hoặc VIETICKET phát hiện dấu hiệu lừa đảo (sự kiện không có thật), Sàn sẽ lập tức phong tỏa doanh thu của BTC. Sau khi xác minh vi phạm, VIETICKET sẽ thực hiện hoàn tiền <strong>100%</strong> cho khách hàng.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">5. Miễn trừ trách nhiệm</h3>
                          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                            <p className="text-gray-700 mb-4">
                              VIETICKET là đơn vị trung gian phân phối vé, không chịu trách nhiệm về:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                              <li>Nội dung nghệ thuật, sự thay đổi nghệ sĩ biểu diễn, chất lượng âm thanh ánh sáng hoặc các sự cố vật lý xảy ra tại địa điểm tổ chức.</li>
                              <li>VIETICKET từ chối hỗ trợ các vé được mua lại từ thị trường chợ đen (pass vé) mà không thông qua tính năng chuyển nhượng chính thức của hệ thống.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Content for Organizers */}
            <TabsContent value="organizers">
              <Card>
                <CardContent className="p-8">
                  <div className="h-[600px] overflow-y-auto pr-4">
                    <div className="prose prose-gray max-w-none">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">ĐIỀU KHOẢN DÀNH CHO NHÀ TỔ CHỨC (ĐỐI TÁC)</h2>
                      
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Phạm vi hợp tác & Cam kết</h3>
                          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                            <ul className="text-gray-700 space-y-2">
                              <li>• VIETICKET cung cấp giải pháp bán vé, quản lý đơn hàng và ứng dụng Check-in sự kiện.</li>
                              <li>• Nhà tổ chức (BTC) chịu trách nhiệm toàn bộ về việc vận hành, xin giấy phép tổ chức biểu diễn và đóng thuế theo quy định pháp luật.</li>
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">2. Quyền và Nghĩa vụ của Nhà tổ chức</h3>
                          <div className="space-y-4">
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                              <h4 className="font-semibold text-red-900 mb-2">Tính pháp lý:</h4>
                              <p className="text-gray-700">
                                Cam kết sự kiện đã được cấp phép bởi cơ quan chức năng (Sở Văn hóa, v.v.). BTC phải cung cấp giấy phép cho VIETICKET trước khi mở bán ít nhất 24h.
                              </p>
                            </div>
                            
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <h4 className="font-semibold text-yellow-900 mb-2">Sở hữu trí tuệ:</h4>
                              <p className="text-gray-700">
                                BTC cam kết chịu trách nhiệm <strong>100%</strong> về bản quyền hình ảnh, âm nhạc sử dụng trong sự kiện và trên trang bán vé. VIETICKET được miễn trừ khỏi mọi khiếu kiện liên quan đến bản quyền của BTC.
                              </p>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-900 mb-2">Cam kết về chính sách hoàn vé:</h4>
                              <p className="text-gray-700">
                                Bằng việc hợp tác với VIETICKET, BTC đồng ý tham gia chính sách hoàn vé linh hoạt (<strong>80%</strong> - <strong>60%</strong>) nêu tại Mục 4 (Phần 1). Số lượng vé được hoàn sẽ được mở bán lại trên hệ thống.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">3. Chính sách Phí & Đối soát (Thanh toán)</h3>
                          <div className="space-y-4">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                              <h4 className="font-semibold text-purple-900 mb-2">Phí dịch vụ:</h4>
                              <p className="text-gray-700">
                                VIETICKET thu <strong>5%</strong> trên tổng doanh thu bán vé (đã bao gồm phí cổng thanh toán, chưa bao gồm VAT).
                              </p>
                            </div>
                            
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                              <h4 className="font-semibold text-orange-900 mb-2">Thời gian thanh toán (Hold Payment):</h4>
                              <p className="text-gray-700">
                                Nhằm bảo vệ người mua, VIETICKET sẽ thanh toán doanh thu cho BTC trong vòng <strong>10 ngày làm việc SAU KHI</strong> sự kiện kết thúc an toàn và không có tranh chấp lớn xảy ra.
                              </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-2">Thuế:</h4>
                              <p className="text-gray-700">
                                BTC có trách nhiệm xuất hóa đơn VAT (cho phần giá vé) khi khách hàng yêu cầu. VIETICKET chỉ xuất hóa đơn cho phần phí dịch vụ <strong>5%</strong>.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">4. Quy định về Hủy hoặc Hoãn sự kiện</h3>
                          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                            <p className="text-gray-700 mb-4">
                              Trong trường hợp sự kiện bị hủy (do lỗi chủ quan của BTC hoặc chưa xin được giấy phép):
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-3">
                              <li>BTC có nghĩa vụ hoàn lại <strong>100%</strong> tiền vé cho khách hàng.</li>
                              <li>BTC phải thanh toán cho VIETICKET các khoản chi phí phát sinh gồm: Phí chuyển khoản ngân hàng (Refund gateway fee) và chi phí vận hành xử lý hoàn tiền (nhân sự, SMS/Email thông báo).</li>
                              <li>Khoản tiền hoàn lại không bao gồm phí dịch vụ mà VIETICKET đã thu của người mua lúc đặt vé (trừ trường hợp BTC đồng ý chi trả khoản này thay cho khách).</li>
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">5. Bảo vệ dữ liệu cá nhân (Tuân thủ Nghị định 13/2023/NĐ-CP)</h3>
                          <div className="space-y-4">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-900 mb-2">Quyền sử dụng dữ liệu:</h4>
                              <p className="text-gray-700">
                                BTC được quyền sử dụng dữ liệu người mua (Họ tên, Email, SĐT) chỉ cho mục đích check-in, kiểm soát an ninh và gửi thông báo liên quan đến sự kiện đó.
                              </p>
                            </div>
                            
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                              <h4 className="font-semibold text-red-900 mb-2">Nghiêm cấm:</h4>
                              <p className="text-gray-700">
                                Tuyệt đối KHÔNG được chia sẻ, bán dữ liệu khách hàng cho bên thứ 3 hoặc sử dụng để spam quảng cáo cho các dịch vụ khác không liên quan. Nếu vi phạm, BTC hoàn toàn chịu trách nhiệm trước pháp luật.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Contact Section */}
          <div className="mt-12 text-center">
            <div className="bg-gradient-to-r from-gray-50 to-yellow-50 rounded-xl p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {t("contact.title")}
              </h3>
              <p className="text-gray-600 mb-6">
                {t("contact.description")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="outline">
                  <a href="/contact">{t("contact.supportButton")}</a>
                </Button>
                <Button asChild>
                  <a href="mailto:support@vieticket.com">{t("contact.emailButton")}</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}