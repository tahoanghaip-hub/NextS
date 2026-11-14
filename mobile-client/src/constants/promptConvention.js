/**
 * Canonical Application Settings Default
 * Stored in localStorage under 'nexts_app_settings_v1'
 */
export const DEFAULT_SETTINGS = {
  theme: 'dark',
  fontSize: 22,
  lineHeight: 1.6,
  mirrorMode: false,
  autoScroll: false,
  autoScrollSpeed: 3,
  triggerPosition: 33,
  debounceMs: 250,
  keyMapping: 'ARROWS',
  keepAwake: true,
  autoMinimizeOnStart: true
};

/**
 * AI Prompt Convention Template
 * Used by presenters to instruct LLMs to output structured scripts matching NextS parser grammar.
 */
export const AI_PROMPT_CONVENTION_TEXT = `Hãy đóng vai một chuyên gia viết kịch bản thuyết trình chuyên nghiệp. Dựa trên nội dung tài liệu tôi cung cấp dưới đây, hãy viết kịch bản thuyết trình chi tiết và BẮT BUỘC tuân thủ nghiêm ngặt định dạng đánh dấu sau đây để phần mềm đọc kịch bản tự động (NextS) có thể bóc tách chính xác 100%:

1. Mỗi trang slide phải bắt đầu bằng một dòng riêng biệt ghi đúng cú pháp: [Slide 1], [Slide 2], [Slide 3]... (tăng dần theo thứ tự).
2. Ngay trên cùng dòng hoặc dòng kế tiếp sau [Slide X], hãy viết Tiêu đề ngắn của slide (từ 3 đến 5 từ) sau dấu hai chấm, ví dụ: [Slide 1]: Tổng quan dự án.
3. Các dòng tiếp theo dưới [Slide X] là toàn bộ lời nói kịch bản chi tiết dành cho người thuyết trình ở slide đó.
4. Nếu slide đó có câu hỏi phản biện dự kiến hoặc kiến thức mở rộng, hãy đặt ngay bên dưới phần lời nói của slide đó, bắt đầu bằng một dòng riêng ghi đúng thẻ: [Q&A]
5. Ở dưới cùng của toàn bộ văn bản (sau khi đã kết thúc slide cuối cùng), hãy tạo một phần tổng hợp các câu hỏi chung cho toàn bài thuyết trình, bắt đầu bằng một dòng riêng ghi đúng thẻ: [Q&A Chung]

Lưu ý quan trọng: Tuyệt đối chỉ sử dụng đúng 3 thẻ đánh dấu là [Slide X], [Q&A] và [Q&A Chung]. Không tự ý đổi tên thẻ.

Nội dung tài liệu của tôi như sau:
[DÁN NỘI DUNG BÀI THUYẾT TRÌNH CỦA BẠN VÀO ĐÂY]`;

export default {
  DEFAULT_SETTINGS,
  AI_PROMPT_CONVENTION_TEXT
};
