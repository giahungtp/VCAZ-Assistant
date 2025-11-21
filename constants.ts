import { KnowledgeSource, Language } from "./types";

export const getSystemInstruction = (language: Language) => {
  const baseContext = `
Data Context:
You have access to VCAZ's latest case studies, pricing models, and the comprehensive Lead Generation Solutions 2024 guide.
For pricing, give general ranges and encourage consultation.
Connected Channels: Facebook, Instagram, Zalo, Telegram, WhatsApp.
`;

  if (language === 'vi') {
    return `
Bạn là trợ lý ảo AI cao cấp của VCAZ (https://seo.vcaz.net), một Digital Marketing Agency hàng đầu.
Mục tiêu của bạn là hỗ trợ khách hàng tiềm năng về các dịch vụ: SEO, Quảng cáo (PPC), Quản lý mạng xã hội, và Tạo khách hàng tiềm năng (Lead Generation).

Tính cách:
- Chuyên nghiệp, thân thiện và tự nhiên.
- Am hiểu xu hướng marketing.
- Trả lời ngắn gọn, súc tích (tối ưu cho hội thoại giọng nói).
- LUÔN TRẢ LỜI BẰNG TIẾNG VIỆT.

Dịch vụ nổi bật:
1. SEO: Tăng traffic tự nhiên.
2. PPC: Google/Facebook Ads.
3. Social Media: Xây dựng thương hiệu.
4. Lead Generation: Chiến lược B2B/B2C chuyên sâu (dựa trên tài liệu Lead_Gen_Solutions_2024).

${baseContext}
`;
  }

  return `
You are the advanced AI voice assistant for VCAZ (https://seo.vcaz.net), a premium Digital Marketing Agency.
Your goal is to assist potential clients with inquiries about digital marketing, lead generation, SEO, social media management, and PPC.

Key Personality Traits:
- Professional yet warm and conversational.
- Knowledgeable about digital marketing trends.
- Concise in speech (optimal for voice interactions).
- ALWAYS REPLY IN ENGLISH.

Services to Highlight:
1. SEO (Search Engine Optimization): Boosting organic traffic.
2. PPC (Pay-Per-Click): Immediate lead gen via Google/Facebook Ads.
3. Social Media Management: Brand building on FB, Insta, LinkedIn.
4. Lead Generation: In-depth B2B/B2C strategies (referencing Lead_Gen_Solutions_2024).

${baseContext}
`;
};

export const UI_TEXT = {
  en: {
    title: 'VCAZ Assistant',
    status: {
      disconnected: 'Disconnected',
      connecting: 'Connecting...',
      connected: 'Connected',
      error: 'Error',
    },
    connect: 'Start Call',
    disconnect: 'End Call',
    welcome: 'Connect to start chatting with VCAZ support.',
    knowledgeTitle: 'Knowledge Base',
    knowledgeSubtitle: 'Data sources training your VCAZ Assistant.',
    files: 'Connected Files',
    social: 'Social Integrations',
    addSource: 'Add New Source',
  },
  vi: {
    title: 'Trợ lý VCAZ',
    status: {
      disconnected: 'Ngắt kết nối',
      connecting: 'Đang kết nối...',
      connected: 'Đã kết nối',
      error: 'Lỗi',
    },
    connect: 'Bắt đầu gọi',
    disconnect: 'Kết thúc',
    welcome: 'Kết nối để trò chuyện với hỗ trợ VCAZ.',
    knowledgeTitle: 'Cơ sở tri thức',
    knowledgeSubtitle: 'Nguồn dữ liệu huấn luyện trợ lý VCAZ.',
    files: 'Tài liệu đã kết nối',
    social: 'Tích hợp mạng xã hội',
    addSource: 'Thêm nguồn mới',
  }
};

export const MOCK_KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: '6',
    name: 'Lead_Gen_Solutions_2024.pdf',
    type: 'file',
    icon: '📄',
    status: 'active',
    details: 'Uploaded just now',
  },
  {
    id: '1',
    name: 'Service_Catalog_2024.pdf',
    type: 'file',
    icon: '📄',
    status: 'active',
    details: 'Uploaded 2 hours ago',
  },
  {
    id: '2',
    name: 'Pricing_Tiers_Master',
    type: 'sheet',
    icon: '📊',
    status: 'active',
    details: 'Synced from Google Sheets',
  },
  {
    id: '3',
    name: 'VCAZ Facebook Page',
    type: 'social',
    icon: '📘',
    status: 'active',
    details: 'Connected (Messaging Enabled)',
  },
  {
    id: '4',
    name: 'VCAZ Instagram',
    type: 'social',
    icon: '📸',
    status: 'active',
    details: 'Connected (Comments & DM)',
  },
  {
    id: '5',
    name: 'Zalo Official Account',
    type: 'social',
    icon: '💬',
    status: 'active',
    details: 'Connected',
  },
];