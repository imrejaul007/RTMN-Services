'use client';

import { useState } from 'react';
import {
  Grid3X3,
  Zap,
  Plug,
  BarChart3,
  MessageSquare,
  UserPlus,
  TrendingUp,
  Shield,
  Users,
  DollarSign,
  Megaphone,
  BookOpen,
  FileText,
  Copy,
  Scroll,
  GraduationCap,
  Award,
  Briefcase,
  Scale,
  Building2,
  UtensilsCrossed,
  Building,
  Heart,
  ShoppingBag,
  Car,
  Sparkles,
  Dumbbell,
  Factory,
  Home,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/api';
import type { Category } from '@/lib/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Grid3X3,
  Zap,
  Plug,
  BarChart3,
  MessageSquare,
  UserPlus,
  TrendingUp,
  Shield,
  Users,
  DollarSign,
  Megaphone,
  BookOpen,
  FileText,
  Copy,
  Scroll,
  GraduationCap,
  Award,
  Briefcase,
  Scale,
  Building2,
  UtensilsCrossed,
  Building,
  Heart,
  ShoppingBag,
  Car,
  Sparkles,
  Dumbbell,
  Factory,
  Home,
};

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  type?: 'workflow' | 'knowledge';
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  type = 'workflow',
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const Icon = iconMap[category.icon] || Grid3X3;
        const isSelected = selectedCategory === category.id;

        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              isSelected
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{category.name}</span>
            <span
              className={cn(
                'px-1.5 py-0.5 text-xs rounded-full',
                isSelected ? 'bg-white/20' : 'bg-gray-100'
              )}
            >
              {category.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface IndustryFilterProps {
  industries: { id: string; name: string; icon: string }[];
  selectedIndustry: string;
  onIndustryChange: (industryId: string) => void;
}

export function IndustryFilter({
  industries,
  selectedIndustry,
  onIndustryChange,
}: IndustryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = industries.find((i) => i.id === selectedIndustry);
  const Icon = selected ? (iconMap[selected.icon] || Building2) : Building2;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        <Icon className="w-4 h-4" />
        <span>{selected?.name || 'All Industries'}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-20 overflow-hidden">
            {industries.map((industry) => {
              const IndIcon = iconMap[industry.icon] || Building2;
              return (
                <button
                  key={industry.id}
                  onClick={() => {
                    onIndustryChange(industry.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors',
                    selectedIndustry === industry.id && 'bg-primary/5 text-primary'
                  )}
                >
                  <IndIcon className="w-4 h-4" />
                  <span>{industry.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface SortFilterProps {
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  priceFilter?: string;
  onPriceFilterChange?: (priceFilter: string) => void;
}

export function SortFilter({
  sortBy,
  onSortChange,
  priceFilter,
  onPriceFilterChange,
}: SortFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    { id: 'popular', name: 'Most Popular' },
    { id: 'rating', name: 'Highest Rated' },
    { id: 'newest', name: 'Newest' },
    { id: 'price-low', name: 'Price: Low to High' },
    { id: 'price-high', name: 'Price: High to Low' },
  ];

  const priceOptions = [
    { id: 'all', name: 'All Prices' },
    { id: 'free', name: 'Free' },
    { id: 'paid', name: 'Paid' },
  ];

  const selectedSort = sortOptions.find((s) => s.id === sortBy);

  return (
    <div className="flex items-center gap-3">
      {onPriceFilterChange && (
        <div className="flex bg-white border rounded-lg overflow-hidden">
          {priceOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => onPriceFilterChange(option.id)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                priceFilter === option.id
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <span>Sort: {selectedSort?.name}</span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-20 overflow-hidden">
              {sortOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onSortChange(option.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors',
                    sortBy === option.id && 'bg-primary/5 text-primary font-medium'
                  )}
                >
                  {option.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
