/**
 * Default Presentation Dataset (Vietnamese)
 * Adheres strictly to the canonical PresentationData schema in ARCHITECTURE.md
 */

export const defaultPresentationData = {
  id: 'pres-default-001',
  title: 'Chiến lược Chuyển đổi Số & Ứng dụng AI 2026',
  totalSlides: 5,
  currentSlide: 1,
  isSyncLocked: true,
  updatedAt: 1763080000000,
  slides: [
    {
      slideNumber: 1,
      title: 'Tổng quan chuyển đổi số',
      scriptContent: 'Kính chào quý thầy cô, ban giám khảo và toàn thể các bạn có mặt trong hội trường ngày hôm nay. Tôi rất vinh dự được đại diện nhóm nghiên cứu trình bày về Chiến lược Chuyển đổi Số và Ứng dụng Trí tuệ Nhân tạo giai đoạn 2026. Trong bối cảnh công nghệ đang tái định hình mọi ngành công nghiệp, việc chủ động làm chủ dữ liệu và tự động hóa quy trình không còn là một lựa chọn xa xỉ mà đã trở thành yếu tố sống còn. Hôm nay, chúng ta sẽ cùng đi qua ba trụ cột then chốt giúp doanh nghiệp bứt phá ngoạn mục trong kỷ nguyên mới.',
      qaContent: 'Câu hỏi 1: Đâu là thách thức lớn nhất khi doanh nghiệp bắt đầu chuyển đổi số?\nTrả lời: Rào cản lớn nhất thường không nằm ở công nghệ mà nằm ở văn hóa tổ chức và thói quen làm việc thủ công của nhân sự.',
      thumbnailBase64: null
    },
    {
      slideNumber: 2,
      title: 'Hiện trạng và thách thức',
      scriptContent: 'Bước sang phần thực trạng, dữ liệu khảo sát từ hơn năm trăm doanh nghiệp vừa và nhỏ cho thấy hơn bảy mươi phần trăm vẫn đang gặp khó khăn trong việc chuẩn hóa dữ liệu. Hệ thống công nghệ phân mảnh và dữ liệu lưu trữ rời rạc khiến việc ra quyết định bị chậm trễ đáng kể. Thêm vào đó, chi phí đầu tư ban đầu cho cơ sở hạ tầng đám mây thường vượt quá ngân sách dự kiến nếu không có chiến lược tối ưu từ đầu. Đây chính là nút thắt cổ chai mà giải pháp của chúng tôi tập trung giải quyết.',
      qaContent: 'Câu hỏi 1: Doanh nghiệp nhỏ với ngân sách hạn hẹp nên ưu tiên số hóa khâu nào trước?\nTrả lời: Nên ưu tiên số hóa quy trình quản lý khách hàng (CRM) và quy trình kế toán - bán hàng để tạo ra dòng tiền và hiệu quả thấy ngay.',
      thumbnailBase64: null
    },
    {
      slideNumber: 3,
      title: 'Kiến trúc giải pháp NextS',
      scriptContent: 'Để vượt qua các rào cản trên, chúng tôi giới thiệu kiến trúc NextS với ba lớp xử lý thông minh và khả năng hoạt động ngoại tuyến linh hoạt. Lớp điều khiển trung tâm được xây dựng trên nền tảng Node.js gọn nhẹ, kết hợp cơ chế gửi tín hiệu phần cứng trực tiếp không phụ thuộc driver phức tạp. Lớp hiển thị hỗ trợ máy nhắc chữ thời gian thực với độ trễ dưới năm mili-giây, cho phép người thuyết trình kiểm soát bài giảng hoàn toàn tự nhiên. Toàn bộ dữ liệu được đồng bộ song song qua giao thức WebSocket và Bluetooth năng lượng thấp.',
      qaContent: 'Câu hỏi 1: Tại sao giải pháp lại chọn cơ chế gửi phím qua PowerShell thay vì cài đặt driver C++ chuyên dụng?\nTrả lời: Cơ chế PowerShell không phụ thuộc bất kỳ thư viện C++ native nào, đảm bảo phần mềm chạy ngay lập tức trên mọi máy tính Windows mà không cần quyền quản trị viên phức tạp.',
      thumbnailBase64: null
    },
    {
      slideNumber: 4,
      title: 'Lộ trình triển khai thực tế',
      scriptContent: 'Về lộ trình triển khai, dự án được chia làm bốn giai đoạn nối tiếp nhau trong vòng mười hai tháng. Giai đoạn một tập trung vào việc thử nghiệm nội bộ và hoàn thiện hệ thống máy nhắc chữ cùng bộ điều khiển chống lệch slide. Giai đoạn hai sẽ mở rộng tích hợp trí tuệ nhân tạo để tự động tóm tắt kịch bản và gợi ý câu hỏi phản biện theo ngữ cảnh. Hai giai đoạn cuối cùng sẽ triển khai thí điểm tại các trường đại học và hội thảo quy mô lớn để thu thập phản hồi thực tế trước khi phát hành chính thức.',
      qaContent: 'Câu hỏi 1: Nếu thời gian triển khai bị kéo dài, các biện pháp dự phòng là gì?\nTrả lời: Nhóm đã xây dựng sẵn các mốc tính năng tối thiểu (MVP) có thể vận hành độc lập để đảm bảo luôn có phiên bản ổn định phục vụ người dùng đúng hạn.',
      thumbnailBase64: null
    },
    {
      slideNumber: 5,
      title: 'Kết luận và tầm nhìn',
      scriptContent: 'Tổng kết lại, bài thuyết trình đã làm rõ tầm quan trọng của việc làm chủ công nghệ thuyết trình thông minh và tự động hóa điều khiển slide. Với NextS, người thuyết trình hoàn toàn tự tin làm chủ sân khấu mà không còn phải lo lắng về việc bấm nhầm slide hay quên kịch bản. Chúng tôi tin rằng công nghệ phải phục vụ con người một cách tự nhiên và vô hình nhất. Xin chân thành cảm ơn ban giám khảo và các bạn đã chú ý lắng nghe, xin mời mọi người đặt câu hỏi phản biện.',
      qaContent: 'Câu hỏi 1: Định hướng phát triển thương mại hóa của dự án trong tương lai như thế nào?\nTrả lời: Dự án phát triển theo mô hình mã nguồn mở kết hợp gói tính năng nâng cao (Freemium) dành cho diễn giả chuyên nghiệp và các trung tâm đào tạo.',
      thumbnailBase64: null
    }
  ],
  generalQA: 'Câu hỏi chung 1: Hệ thống có hoạt động khi phòng thuyết trình mất hoàn toàn mạng Internet không?\nTrả lời: Hoàn toàn hoạt động. Điện thoại có thể phát Wi-Fi Hotspot cho máy tính hoặc kết nối trực tiếp qua Bluetooth BLE mà không cần kết nối Internet ra bên ngoài.\n\nCâu hỏi chung 2: Kịch bản thuyết trình có bị giới hạn độ dài chữ không?\nTrả lời: Hệ thống hỗ trợ kịch bản không giới hạn với cơ chế cuộn mượt và vạch kích hoạt quang học tự động chuyển slide.\n\nCâu hỏi chung 3: Làm sao đảm bảo máy chiếu và điện thoại không bị lệch số trang slide?\nTrả lời: Hệ thống trang bị tính năng Khóa Đồng Bộ (Sync Lock) kết hợp thuật toán tính khoảng cách delta và hai nút bù lệch (+1 / -1) giúp lập tức tái đồng bộ chỉ với một chạm.'
};

export default defaultPresentationData;
