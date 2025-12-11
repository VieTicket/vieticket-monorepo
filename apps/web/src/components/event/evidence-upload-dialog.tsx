"use client";

import React, { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultipleFileUploader, CloudinaryUploadResponse } from "@/components/ui/multiple-file-uploader";
import { uploadBlobToCloudinary } from "@/components/ui/file-uploader";
import { Badge } from "@/components/ui/badge";
import { FileText, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

export interface EvidenceDocument {
  documentType: "event_permit" | "venue_contract" | "insurance" | "other";
  documentUrl: string[];
  documentNames: string[];
}

export interface EvidenceUploadData {
  evidenceDocuments: EvidenceDocument[];
  agreementAccepted: boolean;
  contractScreenshotUrl?: string;
}

interface EvidenceUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: EvidenceUploadData) => void;
  eventName: string;
  eventDate?: string;
  eventLocation?: string;
  organizerInfo?: {
    name: string;
    email: string;
    phone?: string;
  };
}

const DOCUMENT_TYPES = [
  {
    value: "event_permit" as const,
    label: "Giấy Phép Tổ Chức Sự Kiện",
    description: "Giấy phép hoặc văn bản chính thức để tổ chức sự kiện",
  },
  {
    value: "venue_contract" as const,
    label: "Hợp Đồng Địa Điểm",
    description: "Hợp đồng hoặc thỏa thuận với địa điểm tổ chức",
  },
  {
    value: "insurance" as const,
    label: "Giấy Chứng Nhận Bảo Hiểm",
    description: "Chứng nhận bảo hiểm sự kiện hoặc bảo hiểm trách nhiệm dân sự",
  },
  {
    value: "other" as const,
    label: "Tài Liệu Khác",
    description: "Các tài liệu hỗ trợ liên quan khác",
  },
] as const;

export function EvidenceUploadDialog({
  open,
  onOpenChange,
  onComplete,
  eventName,
  eventDate,
  eventLocation,
  organizerInfo,
}: EvidenceUploadDialogProps) {
  const [step, setStep] = useState<"upload" | "contract">("upload");
  const [evidenceDocuments, setEvidenceDocuments] = useState<EvidenceDocument[]>([]);
  const [currentDocumentType, setCurrentDocumentType] = useState<EvidenceDocument["documentType"]>("event_permit");
  const [isUploading, setIsUploading] = useState(false);
  const [isSigningContract, setIsSigningContract] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [contractSigned, setContractSigned] = useState(false);

  const handleDocumentUploadSuccess = (results: CloudinaryUploadResponse[]) => {
    const newDocument: EvidenceDocument = {
      documentType: currentDocumentType,
      documentUrl: results.map(r => r.secure_url),
      documentNames: results.map(r => r.public_id.split('/').pop() || 'Unknown file'),
    };

    setEvidenceDocuments(prev => [...prev, newDocument]);
    toast.success(`Đã tải lên thành công ${results.length} tài liệu cho ${DOCUMENT_TYPES.find(t => t.value === currentDocumentType)?.label}`);
  };

  const handleDocumentUploadError = (error: Error) => {
    toast.error("Không thể tải lên tài liệu", {
      description: error.message,
    });
  };

  const removeDocument = (index: number) => {
    setEvidenceDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const removeFileFromDocument = (docIndex: number, fileIndex: number) => {
    setEvidenceDocuments(prev => 
      prev.map((doc, i) => 
        i === docIndex 
          ? {
              ...doc,
              documentUrl: doc.documentUrl.filter((_, j) => j !== fileIndex),
              documentNames: doc.documentNames.filter((_, j) => j !== fileIndex),
            }
          : doc
      ).filter(doc => doc.documentUrl.length > 0) // Remove empty documents
    );
  };

  const canProceedToContract = evidenceDocuments.length > 0;

  const handleProceedToContract = () => {
    if (!canProceedToContract) {
      toast.error("Vui lòng tải lên ít nhất một tài liệu chứng minh trước khi tiếp tục.");
      return;
    }
    setStep("contract");
  };

  const handleAcceptContract = async () => {
    setIsSigningContract(true);
    
    // Typing effect
    const organizerName = organizerInfo?.name || "Nhà tổ chức";
    let currentText = "";
    
    for (let i = 0; i <= organizerName.length; i++) {
      currentText = organizerName.substring(0, i);
      setTypingText(currentText);
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms per character
    }

    // Wait additional time to show completed signature
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Force immediate UI update with flushSync
    flushSync(() => {
      setContractSigned(true);
      setIsSigningContract(false);
    });

    // Wait a bit more to ensure UI has rendered
    await new Promise(resolve => setTimeout(resolve, 200));

    // Now capture screenshot with updated UI
    await captureAndUploadContract();
  };

  const captureAndUploadContract = async () => {

    // Capture screenshot
    try {
      const contractElement = document.querySelector('.document-container');
      if (contractElement) {
        console.log('Capturing contract screenshot...');
        
        // Use html-to-image to capture screenshot
        const { toPng } = await import('html-to-image');
        
        const dataUrl = await toPng(contractElement as HTMLElement, {
          backgroundColor: '#ffffff',
          pixelRatio: 2, // Higher quality
          quality: 0.95,
        });

        console.log('Screenshot captured successfully');

        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        if (blob) {
          console.log('Blob created, size:', blob.size, 'type:', blob.type);
          console.log('Uploading to Cloudinary using uploadBlobToCloudinary...');
          
          // Use the same upload function as evidence documents - same folder as evidence
          try {
            console.log('Starting upload with folder: event-evidence');
            const uploadResult = await uploadBlobToCloudinary(
              blob,
              `contract-${Date.now()}.png`,
              'event-evidence' // Use same folder as evidence documents
            );

            console.log('Contract screenshot uploaded successfully:', uploadResult.secure_url);
            
            const data: EvidenceUploadData = {
              evidenceDocuments,
              agreementAccepted: true,
              contractScreenshotUrl: uploadResult.secure_url,
            };
            onComplete(data);
            return;
          } catch (uploadError) {
            console.error('Upload error details:', uploadError);
            toast.error("Lỗi khi upload hợp đồng lên Cloudinary: " + (uploadError instanceof Error ? uploadError.message : 'Unknown error'));
          }
        } else {
          console.error('Failed to create blob from screenshot');
          toast.error("Không thể tạo blob từ screenshot");
        }
      } else {
        console.error('Contract element not found');
        toast.error("Không tìm thấy element hợp đồng");
      }
    } catch (error) {
      console.error('Error capturing/uploading contract screenshot:', error);
      toast.error("Không thể lưu hợp đồng: " + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Fallback if screenshot fails
    const data: EvidenceUploadData = {
      evidenceDocuments,
      agreementAccepted: true,
    };
    onComplete(data);
  };

  const getCurrentDocumentTypeInfo = () => {
    return DOCUMENT_TYPES.find(t => t.value === currentDocumentType);
  };

  const resetDialog = () => {
    setStep("upload");
    setEvidenceDocuments([]);
    setCurrentDocumentType("event_permit");
    setIsUploading(false);
    setIsSigningContract(false);
    setTypingText("");
    setContractSigned(false);
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const getFormattedContractContent = () => {
    const currentDate = new Date().toLocaleDateString('vi-VN');
    const organizerName = organizerInfo?.name || "...........................";
    const organizerEmail = organizerInfo?.email || "...........................";
    const organizerPhone = organizerInfo?.phone || "...........................";
    
    console.log('Contract data - eventLocation:', eventLocation); // Debug location
    
    return {
      organizerName,
      organizerEmail,
      organizerPhone,
      eventName,
      eventDate: eventDate || "Chưa xác định",
      eventLocation: eventLocation || "Chưa xác định",
      contractNumber: `VT-${Date.now()}/HĐHT/VIETICKET-ĐỐI TÁC`,
      currentDate,
      signatureTime: new Date().toLocaleString('vi-VN')
    };
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === "upload" ? (
          <>
            <DialogHeader>
              <DialogTitle>Tải Lên Tài Liệu Chứng Minh</DialogTitle>
              <DialogDescription>
                Vui lòng tải lên các tài liệu chứng minh để xác minh quyền tổ chức sự kiện "{eventName}".
                Điều này giúp chúng tôi đảm bảo tính hợp pháp của sự kiện.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Document Type Selection */}
              <div>
                <h3 className="text-sm font-medium mb-3">Chọn Loại Tài Liệu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DOCUMENT_TYPES.map((type) => (
                    <div
                      key={type.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        currentDocumentType === type.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setCurrentDocumentType(type.value)}
                    >
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div>
                <h3 className="text-sm font-medium mb-3">
                  Tải Lên {getCurrentDocumentTypeInfo()?.label}
                </h3>
                <MultipleFileUploader
                  folder="event-evidence"
                  onUploadSuccess={handleDocumentUploadSuccess}
                  onUploadError={handleDocumentUploadError}
                  maxFiles={5}
                  maxSize={10 * 1024 * 1024} // 10MB per file
                  buttonLabel="Tải Lên Tài Liệu"
                  acceptedTypes={{
                    "image/*": [".png", ".jpg", ".jpeg"],
                    "application/pdf": [".pdf"],
                  }}
                />
              </div>

              {/* Uploaded Documents Preview */}
              {evidenceDocuments.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Tài Liệu Đã Tải Lên</h3>
                  <div className="space-y-3">
                    {evidenceDocuments.map((doc, docIndex) => (
                      <div key={docIndex} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {DOCUMENT_TYPES.find(t => t.value === doc.documentType)?.label}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {doc.documentUrl.length} tệp
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(docIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {doc.documentUrl.map((url, fileIndex) => (
                            <div
                              key={fileIndex}
                              className="relative group border rounded p-2 bg-gray-50"
                            >
                              <div className="flex items-center gap-2">
                                {url.includes('.pdf') ? (
                                  <FileText className="h-4 w-4 text-red-500" />
                                ) : (
                                  <ImageIcon className="h-4 w-4 text-blue-500" />
                                )}
                                <span className="text-xs truncate">
                                  {doc.documentNames[fileIndex]}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={() => removeFileFromDocument(docIndex, fileIndex)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button 
                onClick={handleProceedToContract}
                disabled={!canProceedToContract}
              >
                Tiếp Theo: Xem Hợp Đồng
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Hợp Đồng Hợp Tác Tổ Chức Sự Kiện</DialogTitle>
              <DialogDescription>
                Vui lòng xem xét và chấp nhận hợp đồng hợp tác tổ chức sự kiện "{eventName}".
                Thông tin của bạn đã được tự động điền vào hợp đồng.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto border rounded-lg bg-white shadow-sm">
              <div className="document-container bg-white p-8 max-w-4xl mx-auto" style={{
                fontFamily: 'Times New Roman, serif',
                lineHeight: '1.6',
                fontSize: '14px',
                color: '#000'
              }}>
                {(() => {
                  const contractData = getFormattedContractContent();
                  return (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="text-center border-b border-gray-300 pb-4">
                        <div className="font-bold text-lg mb-2">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                        <div className="font-medium">Độc lập – Tự do – Hạnh phúc</div>
                        <div className="mt-2">
                          <span className="border-b-2 border-black inline-block w-64"></span>
                        </div>
                      </div>

                      {/* Contract Title */}
                      <div className="text-center space-y-3">
                        <h2 className="font-bold text-xl">HỢP ĐỒNG HỢP TÁC CUNG CẤP DỊCH VỤ VÉ VÀ QUẢN LÝ SỰ KIỆN</h2>
                        <div className="font-medium">
                          (Số: {contractData.contractNumber})
                        </div>
                      </div>

                      {/* Parties Info */}
                      <div className="space-y-4">
                        <div className="p-4">
                          <h3 className="font-bold text-base mb-3">BÊN A: NHÀ TỔ CHỨC SỰ KIỆN (Bên sử dụng dịch vụ nền tảng)</h3>
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div><span className="font-medium">Tên đơn vị:</span> {contractData.organizerName}</div>
                            <div><span className="font-medium">Email:</span> {contractData.organizerEmail}</div>
                            <div><span className="font-medium">Điện thoại:</span> {contractData.organizerPhone}</div>
                            <div><span className="font-medium">Đại diện:</span> {contractData.organizerName}</div>
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="font-bold text-base mb-3">BÊN B: VIETICKET (Bên cung cấp giải pháp)</h3>
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div><span className="font-medium">Tên đơn vị:</span> VIETICKET</div>
                            <div><span className="font-medium">Địa chỉ:</span> Trường Đại Học FPT Đà Nẵng</div>
                            <div><span className="font-medium">Điện thoại:</span> 0796750530</div>
                            <div><span className="font-medium">Email:</span> support@vieticket.com</div>
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="font-bold text-base mb-3">THÔNG TIN SỰ KIỆN:</h3>
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div><span className="font-medium">Tên sự kiện:</span> {contractData.eventName}</div>
                            <div><span className="font-medium">Thời gian tổ chức:</span> {contractData.eventDate}</div>
                            <div><span className="font-medium">Địa điểm tổ chức:</span> {contractData.eventLocation}</div>
                          </div>
                        </div>
                      </div>

                      {/* Contract Terms */}
                      <div className="space-y-6">
                        <article>
                          <h3 className="font-bold text-lg mb-3">ĐIỀU 1: PHẠM VI HỢP TÁC</h3>
                          <div className="pl-4 space-y-2">
                            <p><strong>1.1. Phạm vi hợp tác:</strong></p>
                            <ul className="list-disc pl-6 space-y-1 text-sm">
                              <li>Bên B (VIETICKET) cung cấp giải pháp bán vé trực tuyến, quản lý đơn hàng và ứng dụng Check-in sự kiện cho Bên A.</li>
                              <li>Bên A (Nhà tổ chức) chịu trách nhiệm toàn bộ về việc vận hành sự kiện, xin giấy phép tổ chức biểu diễn và đóng thuế theo quy định pháp luật.</li>
                            </ul>
                          </div>
                        </article>

                        <article>
                          <h3 className="font-bold text-lg mb-3">ĐIỀU 2: PHÍ DỊCH VỤ VÀ ĐỐI SOÁT THANH TOÁN</h3>
                          <div className="pl-4 space-y-3">
                            <div>
                              <p><strong>2.1. Phí dịch vụ:</strong></p>
                              <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Bên B thu phí dịch vụ là <strong>5%</strong> trên tổng doanh thu bán vé thực tế qua hệ thống.</li>
                                <li>Khoản phí này đã bao gồm phí cổng thanh toán nhưng chưa bao gồm VAT.</li>
                              </ul>
                            </div>
                            <div>
                              <p><strong>2.2. Chu kỳ đối soát và thanh toán:</strong></p>
                              <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Đối soát doanh thu được thực hiện <strong>hàng tuần (mỗi thứ Sáu)</strong>.</li>
                                <li>Phạm vi đối soát: Áp dụng cho các sự kiện đã kết thúc trong tuần trước đó.</li>
                              </ul>
                            </div>
                          </div>
                        </article>

                        <article>
                          <h3 className="font-bold text-lg mb-3">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A</h3>
                          <div className="pl-4 space-y-3">
                            <div>
                              <p><strong>3.1. Tính pháp lý:</strong></p>
                              <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Cam kết sự kiện đã được cấp phép bởi cơ quan chức năng có thẩm quyền.</li>
                                <li>Bên A phải cung cấp bản sao giấy phép tổ chức cho Bên B trước khi mở bán vé.</li>
                              </ul>
                            </div>
                            <div>
                              <p><strong>3.2. Sở hữu trí tuệ:</strong></p>
                              <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Bên A cam kết chịu trách nhiệm <strong>100%</strong> về bản quyền hình ảnh, âm nhạc, nội dung sử dụng trong sự kiện.</li>
                              </ul>
                            </div>
                            <div>
                              <p><strong>3.3. Bảo vệ dữ liệu:</strong></p>
                              <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.</li>
                                <li><strong>Cấm chia sẻ dữ liệu:</strong> Bên A tuyệt đối không được phép chia sẻ dữ liệu khách hàng cho bên thứ ba.</li>
                              </ul>
                            </div>
                          </div>
                        </article>

                        <article>
                          <h3 className="font-bold text-lg mb-3">ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B (VIETICKET)</h3>
                          <div className="pl-4 space-y-3">
                            <div>
                              <p><strong>4.1. Cung cấp dịch vụ:</strong></p>
                              <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Đảm bảo hệ thống bán vé hoạt động ổn định.</li>
                                <li>Cung cấp công cụ quản lý và ứng dụng Check-in soát vé.</li>
                              </ul>
                            </div>
                            <div>
                              <p><strong>4.2. Bảo mật thông tin:</strong></p>
                              <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Tuân thủ quy định về bảo vệ dữ liệu cá nhân khách hàng.</li>
                              </ul>
                            </div>
                          </div>
                        </article>

                        <article>
                          <h3 className="font-bold text-lg mb-3">ĐIỀU 5: BỒI THƯỜNG VÀ CHẤM DỨT HỢP ĐỒNG</h3>
                          <div className="pl-4 space-y-3">
                            <div>
                              <p><strong>5.1. Bồi thường khi Bên A vi phạm:</strong></p>
                              <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Tổ chức sự kiện trái phép: Bồi thường <strong>100%</strong> doanh thu đã thu từ việc bán vé.</li>
                                <li>Vi phạm bản quyền: Bồi thường tối thiểu <strong>50 triệu VNĐ</strong> và chi phí khắc phục hậu quả.</li>
                                <li>Chia sẻ dữ liệu khách hàng: Phạt <strong>200 triệu VNĐ</strong> theo Nghị định 13/2023/NĐ-CP.</li>
                                <li>Hủy sự kiện đơn phương sau khi mở bán vé: Bồi thường <strong>30%</strong> tổng giá trị vé đã bán.</li>
                              </ul>
                            </div>
                            <div>
                              <p><strong>5.2. Bồi thường khi Bên B vi phạm:</strong></p>
                              <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Hệ thống sập trong thời gian quan trọng: Miễn phí dịch vụ và bồi thường thiệt hại thực tế.</li>
                                <li>Mất mát dữ liệu khách hàng: Bồi thường <strong>100 triệu VNĐ</strong> và chi phí khắc phục.</li>
                                <li>Chấm dứt dịch vụ đột ngột: Bồi thường <strong>20%</strong> doanh thu dự kiến của sự kiện.</li>
                              </ul>
                            </div>
                            <div>
                              <p><strong>5.3. Chấm dứt hợp đồng:</strong></p>
                              <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Mỗi bên có quyền chấm dứt hợp đồng với thông báo trước <strong>30 ngày</strong>.</li>
                                <li>Chấm dứt ngay lập tức nếu có vi phạm nghiêm trọng không khắc phục được.</li>
                              </ul>
                            </div>
                          </div>
                        </article>

                        <article>
                          <h3 className="font-bold text-lg mb-3">ĐIỀU 6: ĐIỀU KHOẢN CHUNG</h3>
                          <div className="pl-4 space-y-2">
                            <p><strong>6.1. Hiệu lực hợp đồng:</strong></p>
                            <ul className="list-disc pl-6 space-y-1 text-sm">
                              <li>Hợp đồng này có hiệu lực kể từ ngày {contractData.currentDate}.</li>
                              <li>Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau.</li>
                            </ul>
                            <p><strong>6.2. Giải quyết tranh chấp:</strong></p>
                            <ul className="list-disc pl-6 space-y-1 text-sm">
                              <li>Các tranh chấp sẽ được giải quyết thông qua thương lượng.</li>
                              <li>Nếu không thỏa thuận được, tranh chấp sẽ được giải quyết tại Tòa án có thẩm quyền tại Đà Nẵng.</li>
                            </ul>
                          </div>
                        </article>
                      </div>

                      {/* Signature Section */}
                      <div className="border-t border-gray-300 pt-6 mt-8">
                        <div className="p-4 mb-6">
                          <h4 className="font-bold text-base mb-3">XÁC NHẬN CỦA BÊN A:</h4>
                          <ol className="list-decimal pl-6 space-y-1 text-sm">
                            <li>Đã đọc và hiểu rõ tất cả các điều khoản</li>
                            <li>Đồng ý tuân thủ các quy định của VIETICKET</li>
                            <li>Chịu trách nhiệm pháp lý về tính chính xác của thông tin cung cấp</li>
                          </ol>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8 text-center">
                          <div>
                            <p className="font-bold mb-4">ĐẠI DIỆN BÊN A</p>
                            <p className="text-sm italic mb-8">(Ký, ghi rõ họ tên)</p>
                            <div className="border-t border-black pt-2 text-sm">
                              <p className="font-medium">
                                {isSigningContract ? (
                                  <span className="inline-block">
                                    {typingText}
                                    <span className="animate-pulse">|</span>
                                  </span>
                                ) : contractSigned ? (
                                  contractData.organizerName
                                ) : (
                                  "..........................."
                                )}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {isSigningContract ? (
                                  <span className="text-blue-600 font-medium">Đang ký hợp đồng...</span>
                                ) : contractSigned ? (
                                  `Chữ ký điện tử: ${contractData.signatureTime}`
                                ) : (
                                  "Chưa ký"
                                )}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="font-bold mb-4">ĐẠI DIỆN BÊN B</p>
                            <p className="text-sm italic mb-8">(Ký, ghi rõ họ tên)</p>
                            <div className="border-t border-black pt-2 text-sm">
                              <p className="font-medium">VIETICKET</p>
                              <p className="text-xs text-gray-600 mt-1">Đại diện ủy quyền</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-4 mt-4 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-800">
                    Xác Nhận Chữ Ký Điện Tử
                  </h3>
                  <p className="text-sm text-gray-700 mt-1">
                    Khi bấm "Chấp Nhận & Ký Hợp Đồng", bạn đồng ý với tất cả điều khoản và 
                    chữ ký điện tử của bạn (<strong>{organizerInfo?.name || 'Nhà tổ chức'}</strong>) 
                    sẽ được ghi nhận làm đại diện Bên A.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")} disabled={isSigningContract}>
                Quay Lại Upload
              </Button>
              <Button 
                onClick={handleAcceptContract}
                disabled={isSigningContract || contractSigned}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSigningContract ? "Đang Ký Hợp Đồng..." : contractSigned ? "Đang Xử Lý..." : "Chấp Nhận & Ký Hợp Đồng"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}