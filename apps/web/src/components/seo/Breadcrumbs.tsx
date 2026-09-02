import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { JsonLd } from './JsonLd';
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  showHomeIcon?: boolean;
}

/**
 * Accessible Breadcrumb navigation with integrated BreadcrumbList Schema.org JSON-LD
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  className = '',
  showHomeIcon = true,
}) => {
  if (!items || items.length === 0) return null;

  const fullItems: BreadcrumbItem[] = [
    { name: 'Home', url: '/' },
    ...items,
  ];

  const schema = generateBreadcrumbSchema(fullItems);

  return (
    <>
      <JsonLd data={schema} />
      <nav
        aria-label="Breadcrumb"
        className={`flex items-center text-xs text-gray-400 overflow-x-auto py-2 ${className}`}
      >
        <ol className="flex items-center space-x-1.5 whitespace-nowrap">
          {fullItems.map((item, index) => {
            const isLast = index === fullItems.length - 1;

            return (
              <li key={item.url + index} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 mx-1 flex-shrink-0" />
                )}
                {isLast ? (
                  <span
                    className="font-semibold text-gray-200 truncate max-w-[200px]"
                    aria-current="page"
                  >
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.url}
                    className="hover:text-emerald-400 transition-colors flex items-center gap-1 text-gray-400"
                  >
                    {index === 0 && showHomeIcon && (
                      <Home className="w-3.5 h-3.5 mb-0.5" />
                    )}
                    <span>{item.name}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};
