import React, { useState, useCallback, useMemo } from 'react';
import { ResizablePanels } from './components/ResizablePanels';
import { AIChatPanel } from './components/AIChatPanel';
import { KOLListPanel } from './components/KOLListPanel';
import { KOL, Message } from './types';
import { generateMockKOLs } from './mockData';

export const AIDemoApp: React.FC = () => {
  const [kols, setKOLs] = useState<KOL[]>(() => generateMockKOLs());
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedKOL, setSelectedKOL] = useState<KOL | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // 模拟AI处理消息
  const processMessage = useCallback(async (content: string, attachments?: File[]) => {
    setIsLoading(true);
    
    // 模拟AI处理延迟
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

    // 简单的关键词匹配来模拟AI理解
    const lowerContent = content.toLowerCase();
    let response = '';

    // 检测是否是添加新KOL的请求
    if (lowerContent.includes('添加') || lowerContent.includes('新增') || lowerContent.includes('创建')) {
      // 尝试提取KOL信息
      const nameMatch = content.match(/(?:叫|名为|名字是|姓名)([^\s，,。.]+)/);
      const platformMatch = content.match(/(微博|抖音|小红书|B站|快手|bilibili)/);
      const followersMatch = content.match(/(\d+(?:\.\d+)?)[万千]?[个]?粉丝/);
      const categoryMatch = content.match(/(美妆|科技|时尚|美食|旅行|健身|教育|游戏)/);

      const name = nameMatch ? nameMatch[1] : `KOL_${Date.now()}`;
      const platform = platformMatch ? platformMatch[1] : '未知平台';
      const followers = followersMatch
        ? parseFloat(followersMatch[1]) * (followersMatch[0].includes('万') ? 10000 : 1)
        : 100000;
      const category = categoryMatch ? categoryMatch[1] : '其他';

      const newKOL: KOL = {
        id: `kol_${Date.now()}`,
        name,
        platform,
        followers: Math.floor(followers),
        category,
        contact: {},
        status: 'initial',
        tags: [],
        notes: content,
        lastUpdated: new Date().toISOString(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        engagementRate: Math.random() * 0.1 + 0.02,
        priceRange: {
          min: Math.floor(Math.random() * 50000) + 10000,
          max: Math.floor(Math.random() * 200000) + 50000,
        },
      };

      setKOLs((prev) => [newKOL, ...prev]);
      response = `✅ 已成功添加KOL "${name}"！\n\n平台：${platform}\n分类：${category}\n粉丝数：${(followers / 10000).toFixed(1)}万\n\nKOL信息已保存到系统中。`;
    }
    // 检测是否是更新KOL信息的请求
    else if (lowerContent.includes('更新') || lowerContent.includes('修改') || lowerContent.includes('更改')) {
      const nameMatch = content.match(/(?:更新|修改|更改)([^\s，,。.]+)/);
      if (nameMatch && selectedKOL) {
        // 更新选中的KOL
        const updatedKOL = { ...selectedKOL, notes: content, lastUpdated: new Date().toISOString() };
        setKOLs((prev) => prev.map((kol) => (kol.id === selectedKOL.id ? updatedKOL : kol)));
        response = `✅ 已更新KOL "${selectedKOL.name}"的信息！\n\n更新内容已保存。`;
      } else {
        response = '请先选择一个KOL，然后再进行更新操作。';
      }
    }
    // 检测是否是查询请求
    else if (lowerContent.includes('查询') || lowerContent.includes('搜索') || lowerContent.includes('找')) {
      const nameMatch = content.match(/(?:查询|搜索|找)([^\s，,。.]+)/);
      if (nameMatch) {
        const searchName = nameMatch[1];
        const foundKOL = kols.find((kol) => kol.name.includes(searchName));
        if (foundKOL) {
          setSelectedKOL(foundKOL);
          response = `找到了KOL "${foundKOL.name}"！\n\n平台：${foundKOL.platform}\n分类：${foundKOL.category}\n粉丝数：${(foundKOL.followers / 10000).toFixed(1)}万\n状态：${foundKOL.status}\n\n已在右侧显示详细信息。`;
        } else {
          response = `抱歉，没有找到名为 "${searchName}" 的KOL。`;
        }
      } else {
        response = '请告诉我你要查询的KOL名称。';
      }
    }
    // 默认回复
    else {
      response = `我理解您想要：${content}\n\n我可以帮您：\n1. 添加新的KOL（例如："添加一个叫张三的KOL，他在抖音有100万粉丝，主要做美妆内容"）\n2. 更新KOL信息（先选择KOL，然后告诉我要更新的内容）\n3. 查询KOL信息（例如："查询张三"）\n\n您也可以上传图片、Excel或Word文档，我会帮您提取其中的KOL信息。`;
    }

    if (attachments && attachments.length > 0) {
      response += `\n\n已收到 ${attachments.length} 个附件，正在分析中...`;
    }

    setIsLoading(false);
    return response;
  }, [kols, selectedKOL]);

  const handleMessageSend = useCallback(
    async (content: string, attachments?: File[]) => {
      // 添加用户消息
      const userMessage: Message = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        attachments: attachments?.map((file) => ({
          type: file.type.startsWith('image/')
            ? 'image'
            : file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
            ? 'excel'
            : 'word',
          name: file.name,
          url: URL.createObjectURL(file),
        })),
      };

      setMessages((prev) => [...prev, userMessage]);

      // 处理消息并获取AI回复
      const aiResponse = await processMessage(content, attachments);

      // 添加AI回复
      const aiMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    },
    [processMessage]
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <ResizablePanels
        defaultLeftWidth={50}
        leftPanel={<AIChatPanel messages={messages} onMessageSend={handleMessageSend} isLoading={isLoading} />}
        rightPanel={
          <KOLListPanel
            kols={kols}
            onSelectKOL={setSelectedKOL}
            selectedKOL={selectedKOL}
          />
        }
      />
    </div>
  );
};

