import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Tag as TagIcon, 
  PlusCircle, 
  Trash2, 
  Sparkles, 
  Package, 
  Search,
  Check
} from 'lucide-react';

export const TagManagementView: React.FC = () => {
  const { tags, addTag, deleteTag, activeItems, setSelectedItemForDetail, formatCurrency } = useApp();
  const [newTagName, setNewTagName] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    addTag(newTagName.trim(), 'bg-slate-100 text-slate-700 border-slate-200');
    setNewTagName('');
  };

  // Items for selected tag
  const taggedItems = selectedTagFilter
    ? activeItems.filter(i => i.tags.includes(selectedTagFilter))
    : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Tag &amp; Condition Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Organize items with marketing badges, import badges, and physical conditions</p>
        </div>
      </div>

      {/* Add New Tag Bento Tile */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4 text-blue-600" />
          Create New Business Tag
        </h3>
        <form onSubmit={handleAddTag} className="flex gap-2.5 max-w-md">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="e.g. VIP Clearance, Direct Auction, Vintage Rare..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
          <button
            type="submit"
            className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>Add Tag</span>
          </button>
        </form>
      </div>

      {/* Tags Bento Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tags.map(t => {
          const itemCount = activeItems.filter(i => i.tags.includes(t.name)).length;
          const isSelected = selectedTagFilter === t.name;

          return (
            <div
              key={t.id}
              onClick={() => setSelectedTagFilter(isSelected ? null : t.name)}
              className={`p-5.5 rounded-3xl border transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-400 shadow-xs'
                  : 'bg-white border-slate-200/90 hover:border-blue-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${isSelected ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'}`}>
                    <TagIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{t.name}</h4>
                    <span className="text-[11px] text-slate-500 font-medium">{itemCount} items tagged</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete tag "${t.name}"?`)) {
                      deleteTag(t.id);
                      if (selectedTagFilter === t.name) setSelectedTagFilter(null);
                    }
                  }}
                  className="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-xl transition cursor-pointer"
                  title="Delete Tag"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-100 text-[11px] font-semibold text-blue-600 flex items-center justify-between">
                <span>{isSelected ? 'Viewing Tagged Items' : 'Click to filter items'}</span>
                <span>→</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtered Items Section Bento Card */}
      {selectedTagFilter && (
        <div className="bg-white p-6 rounded-3xl border border-blue-200 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Items tagged with <span className="text-blue-600">"{selectedTagFilter}"</span>
              </h3>
              <p className="text-xs text-slate-500">{taggedItems.length} items found</p>
            </div>
            <button
              onClick={() => setSelectedTagFilter(null)}
              className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Close Filter
            </button>
          </div>

          {taggedItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No items currently have this tag assigned.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {taggedItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemForDetail(item)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 p-2.5 rounded-2xl transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200/70">
                      {item.code}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500">{item.brand} • {item.categoryName} • Status: {item.status}</div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs font-bold text-slate-900">
                    {formatCurrency(item.sellingPrice)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
