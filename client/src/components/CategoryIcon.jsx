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
  Layers,
  Headphones,
  Watch,
  Camera,
  Gamepad2,
  Coffee,
  Sparkles,
  Music,
  Briefcase,
  Glasses
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
  Headphones,
  Watch,
  Camera,
  Gamepad2,
  Coffee,
  Sparkles,
  Music,
  Briefcase,
  Glasses,
  // slug fallbacks
  'books-notes': BookOpen,
  'laptops-computers': Laptop,
  'mobiles-electronics': Smartphone,
  'cycles-mobility': Bike,
  'hostel-room-essentials': Home,
  'fashion-lifestyle': Shirt,
  'stationery-lab-gear': PenTool,
  'sports-fitness': Trophy,
  'gaming-consoles': Gamepad2,
  'audio-gadgets': Headphones,
  'others': Package,
};

const CategoryIcon = React.memo(function CategoryIcon({ name, slug, className = "w-5 h-5", strokeWidth = 2 }) {
  const IconComponent = iconMap[name] || iconMap[slug] || Package;
  return <IconComponent className={className} strokeWidth={strokeWidth} />;
});

export default CategoryIcon;
