import React, { useState, useMemo } from 'react';
import { KOL } from '../types';
import { Search, Filter, X, CheckCircle2, Clock, FileText, Archive, MessageSquare, Phone } from 'lucide-react';

interface KOLListPanelProps {
  kols: KOL[];
  onSelectKOL: (kol: KOL) => void;
  selectedKOL?: KOL;
}

const statusConfig: Record<KOL['status'], { label: string; icon: React.ReactNode; color: string }> = {
  initial: { label: '初始', icon: <FileText className="w-4 h-4" />, color: 'text-gray-500' },
  contacted: { label: '已联系', icon: <MessageSquare className="w-4 h-4" />, color: 'text-blue-500' },
  negotiating: { label: '洽谈中', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-500' },
  contracted: { label: '已签约', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-500' },
  completed: { label: '已完成', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-purple-500' },
  archived: { label: '已归档', icon: <Archive className="w-4 h-4" />, color: 'text-gray-400' },
};

export const KOLListPanel: React.FC<KOLListPanelProps> = ({
  kols,
  onSelectKOL,
  selectedKOL,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<KOL['status'] | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(kols.map((kol) => kol.category));
    return Array.from(cats).sort();
  }, [kols]);

  const filteredKOLs = useMemo(() => {
    return kols.filter((kol) => {
      const matchesSearch =
        kol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kol.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kol.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kol.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || kol.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || kol.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [kols, searchQuery, statusFilter, categoryFilter]);

  const formatFollowers = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万`;
    }
    return count.toString();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 头部 */}
      <div className="border-b border-border p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">KOL 列表</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索KOL名称、平台、分类..."
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 筛选器 */}
        {showFilters && (
          <div className="mt-3 space-y-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">状态筛选</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as KOL['status'] | 'all')}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">全部状态</option>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <option key={status} value={status}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">分类筛选</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">全部分类</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-3 text-sm text-muted-foreground">
          共找到 {filteredKOLs.length} 位KOL
        </div>
      </div>

      {/* KOL列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredKOLs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>没有找到匹配的KOL</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredKOLs.map((kol) => {
              const statusInfo = statusConfig[kol.status];
              const isSelected = selectedKOL?.id === kol.id;

              return (
                <div
                  key={kol.id}
                  onClick={() => onSelectKOL(kol)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* 头像 */}
                    <img
                      src={kol.avatar}
                      alt={kol.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-lg truncate">{kol.name}</h3>
                        <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                          {statusInfo.icon}
                          <span className="text-xs">{statusInfo.label}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span>{kol.platform}</span>
                        <span>•</span>
                        <span>{kol.category}</span>
                        <span>•</span>
                        <span>{formatFollowers(kol.followers)} 粉丝</span>
                        {kol.engagementRate && (
                          <>
                            <span>•</span>
                            <span>互动率 {(kol.engagementRate * 100).toFixed(1)}%</span>
                          </>
                        )}
                      </div>

                      {/* 标签 */}
                      {kol.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {kol.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs bg-muted rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {kol.tags.length > 3 && (
                            <span className="px-2 py-0.5 text-xs text-muted-foreground">
                              +{kol.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 联系方式 */}
                      {(kol.contact.email || kol.contact.phone || kol.contact.wechat) && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {kol.contact.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{kol.contact.phone}</span>
                            </div>
                          )}
                          {kol.contact.email && (
                            <span>{kol.contact.email}</span>
                          )}
                        </div>
                      )}

                      {/* 价格范围 */}
                      {kol.priceRange && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">报价：</span>
                          <span className="font-medium">
                            ¥{kol.priceRange.min.toLocaleString()} - ¥{kol.priceRange.max.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KOL详情面板 */}
      {selectedKOL && (
        <div className="border-t border-border p-4 bg-card max-h-[40%] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">{selectedKOL.name} 详情</h3>
            <button
              onClick={() => onSelectKOL(selectedKOL)}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">平台：</span>
              <span className="ml-2">{selectedKOL.platform}</span>
            </div>
            <div>
              <span className="text-muted-foreground">分类：</span>
              <span className="ml-2">{selectedKOL.category}</span>
            </div>
            <div>
              <span className="text-muted-foreground">粉丝数：</span>
              <span className="ml-2">{formatFollowers(selectedKOL.followers)}</span>
            </div>
            {selectedKOL.engagementRate && (
              <div>
                <span className="text-muted-foreground">互动率：</span>
                <span className="ml-2">{(selectedKOL.engagementRate * 100).toFixed(2)}%</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">状态：</span>
              <span className={`ml-2 flex items-center gap-1 ${statusConfig[selectedKOL.status].color}`}>
                {statusConfig[selectedKOL.status].icon}
                {statusConfig[selectedKOL.status].label}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">标签：</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedKOL.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-muted rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">备注：</span>
              <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{selectedKOL.notes}</p>
            </div>
            <div>
              <span className="text-muted-foreground">最后更新：</span>
              <span className="ml-2">
                {new Date(selectedKOL.lastUpdated).toLocaleString('zh-CN')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

