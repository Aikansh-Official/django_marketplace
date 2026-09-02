import React from 'react';
import {
  BookOpen,
  Laptop,
  Smartphone,
  Bike,
  Home,
  Shirt,
  PenTool,
  Trophy,
  Package,
  Layers
} from 'lucide-react';

const iconMap = {
  BookOpen,
  Laptop,
  Smartphone,
  Bike,
  Home,
  Shirt,
  PenTool,
  Trophy,
  Package,
  Layers,
  // slug fallbacks
  'books-notes': BookOpen,
  'laptops-computers': Laptop,
  'mobiles-electronics': Smartphone,
  'cycles-mobility': Bike,
  'hostel-room-essentials': Home,
  'fashion-lifestyle': Shirt,
  'stationery-lab-gear': PenTool,
  'sports-fitness': Trophy,
  'others': Package,
};

export default function CategoryIcon({ name, slug, className = "w-5 h-5", strokeWidth = 2 }) {
  const IconComponent = iconMap[name] || iconMap[slug] || Package;
  return <IconComponent className={className} strokeWidth={strokeWidth} />;
}
