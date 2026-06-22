'use client';

import Link from 'next/link';

interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: React.ReactNode;
  providerCount: number;
  avgRating: number;
  popularServices: string[];
  accentColor: string;
}

interface ServiceCategoryCardProps {
  category: ServiceCategory;
}

const StarIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

export default function ServiceCategoryCard({ category }: ServiceCategoryCardProps) {
  return (
    <Link href={`/services/${category.slug}`}>
      <div className="group relative bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-6 hover:border-violet-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-1">
        {/* Accent glow effect */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at top right, ${category.accentColor}, transparent 70%)`,
          }}
        />

        {/* Icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${category.accentColor}20` }}
        >
          <div style={{ color: category.accentColor }}>
            {category.icon}
          </div>
        </div>

        {/* Content */}
        <div className="relative">
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors">
            {category.name}
          </h3>
          <p className="text-sm text-gray-400 mb-4 line-clamp-2">
            {category.description}
          </p>

          {/* Popular services */}
          <div className="flex flex-wrap gap-2 mb-4">
            {category.popularServices.slice(0, 3).map((service, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#2d2d44] text-gray-300"
              >
                {service}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-[#2d2d44]">
            <div className="flex items-center gap-1.5 text-gray-400">
              <UsersIcon />
              <span className="text-sm">{category.providerCount} providers</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="text-amber-400">
                <StarIcon />
              </div>
              <span className="text-sm font-medium text-white">{category.avgRating}</span>
            </div>
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export type { ServiceCategory };
