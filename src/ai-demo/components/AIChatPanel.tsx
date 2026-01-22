import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { Send, Paperclip, Loader2 } from 'lucide-react';

interface AIChatPanelProps {
  onMessageSend: (message: string, attachments?: File[]) => void;
  messages: Message[];
  isLoading?: boolean;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  onMessageSend,
  messages,
  isLoading = false,
}) => {
  const [input, setInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if ((input.trim() || attachments.length > 0) && !isLoading) {
      onMessageSend(input, attachments.length > 0 ? attachments : undefined);
      setInput('');
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...files]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      setAttachments((prev) => [...prev, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) return '📊';
    if (type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) return '📄';
    return '📎';
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 头部 */}
      <div className="border-b border-border p-4 bg-card">
        <h2 className="text-lg font-semibold">AI 助手</h2>
        <p className="text-sm text-muted-foreground mt-1">
          用自然语言添加或更新KOL信息，支持上传图片、Excel、Word文档
        </p>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">👋 你好！我是AI助手</p>
              <p className="text-sm">你可以用自然语言告诉我KOL的信息，我会帮你整理并保存</p>
              <p className="text-sm mt-2">例如："添加一个叫张三的KOL，他在抖音有100万粉丝，主要做美妆内容"</p>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.attachments.map((att, idx) => (
                    <div key={idx} className="text-xs opacity-80">
                      {att.type === 'image' ? '🖼️' : att.type === 'excel' ? '📊' : '📄'} {att.name}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">AI正在思考...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 附件预览 */}
      {attachments.length > 0 && (
        <div className="border-t border-border p-2 bg-muted/50">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-background border border-border rounded px-2 py-1 text-sm"
              >
                <span>{getFileIcon(file)}</span>
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div
        className={`border-t border-border p-4 ${
          dragActive ? 'bg-primary/10' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
      >
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="上传文件"
          >
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.xlsx,.xls,.docx,.doc"
            onChange={handleFileSelect}
            className="hidden"
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息或拖拽文件到这里..."
            className="flex-1 min-h-[60px] max-h-[200px] p-3 border border-input rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        {dragActive && (
          <p className="text-sm text-center text-muted-foreground mt-2">
            松开鼠标以添加文件
          </p>
        )}
      </div>
    </div>
  );
};

