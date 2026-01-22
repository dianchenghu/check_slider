import { KOL } from './types';

// 生成fake KOL数据
export const generateMockKOLs = (): KOL[] => {
  const platforms = ['微博', '抖音', '小红书', 'B站', '快手'];
  const categories = ['美妆', '科技', '时尚', '美食', '旅行', '健身', '教育', '游戏'];
  const statuses: KOL['status'][] = ['initial', 'contacted', 'negotiating', 'contracted', 'completed', 'archived'];
  const tagsPool = ['头部KOL', '腰部KOL', '新锐', '高互动', '性价比高', '品牌合作', '直播带货', '短视频'];
  
  const names = [
    '李佳琦', '薇娅', '罗永浩', '李子柒', 'papi酱',
    '张大奕', '雪梨', '辛巴', '散打哥', '二驴',
    '冯提莫', 'PDD', '大司马', '周杰伦', '刘德华',
    '杨幂', '迪丽热巴', '易烊千玺', '王一博', '肖战',
    '张艺兴', '鹿晗', '吴亦凡', '黄子韬', '蔡徐坤'
  ];

  const kolList: KOL[] = [];
  
  for (let i = 0; i < 30; i++) {
    const name = names[Math.floor(Math.random() * names.length)] + (i > names.length ? `_${i}` : '');
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const followers = Math.floor(Math.random() * 50000000) + 100000;
    const engagementRate = Math.random() * 0.1 + 0.02; // 2%-12%
    
    // 随机选择2-4个标签
    const selectedTags = tagsPool
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 2);
    
    const kol: KOL = {
      id: `kol_${i + 1}`,
      name,
      platform,
      followers,
      category,
      contact: {
        email: Math.random() > 0.5 ? `${name.toLowerCase().replace(/\s/g, '')}@example.com` : undefined,
        phone: Math.random() > 0.5 ? `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}` : undefined,
        wechat: Math.random() > 0.5 ? `wx_${name.toLowerCase()}` : undefined,
      },
      status,
      tags: selectedTags,
      notes: `这是关于${name}的备注信息。${name}是一位在${platform}平台上的${category}领域KOL，拥有${(followers / 10000).toFixed(1)}万粉丝。`,
      lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      engagementRate: parseFloat(engagementRate.toFixed(3)),
      priceRange: {
        min: Math.floor(Math.random() * 50000) + 10000,
        max: Math.floor(Math.random() * 200000) + 50000,
      },
    };
    
    kolList.push(kol);
  }
  
  return kolList.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
};

