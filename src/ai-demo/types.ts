// KOL数据类型定义
export interface KOL {
  id: string;
  name: string;
  platform: string; // 平台：微博、抖音、小红书等
  followers: number; // 粉丝数
  category: string; // 分类：美妆、科技、时尚等
  contact: {
    email?: string;
    phone?: string;
    wechat?: string;
  };
  status: 'initial' | 'contacted' | 'negotiating' | 'contracted' | 'completed' | 'archived'; // 流程状态
  tags: string[];
  notes: string; // 备注信息
  lastUpdated: string; // 最后更新时间
  avatar?: string; // 头像URL
  engagementRate?: number; // 互动率
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: {
    type: 'image' | 'excel' | 'word';
    name: string;
    url: string;
  }[];
}

