export default function ThemeBackground() {
  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden bg-gray-50">
      
      {/* Subtly animated/positioned solid squares (Orange) */}
      <div className="absolute top-[10%] left-[5%] w-32 h-32 bg-brand-500 rounded-md rotate-12 shadow-xl opacity-80"></div>
      <div className="absolute top-[20%] right-[10%] w-24 h-24 bg-brand-400 rounded-md rotate-45 shadow-lg opacity-60"></div>
      <div className="absolute bottom-[15%] left-[15%] w-40 h-40 bg-brand-600 rounded-md -rotate-12 shadow-2xl opacity-90"></div>
      <div className="absolute bottom-[25%] right-[5%] w-48 h-48 bg-brand-500 rounded-md rotate-12 shadow-xl opacity-70"></div>
      <div className="absolute top-[40%] left-[45%] w-16 h-16 bg-brand-300 rounded-md rotate-45 shadow-sm opacity-40"></div>
      <div className="absolute top-[70%] right-[40%] w-12 h-12 bg-brand-400 rounded-md -rotate-12 shadow-sm opacity-50"></div>

      {/* White floating squares with soft borders */}
      <div className="absolute top-[15%] left-[20%] w-20 h-20 bg-white rounded-md -rotate-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"></div>
      <div className="absolute bottom-[20%] right-[25%] w-28 h-28 bg-white rounded-md rotate-12 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100"></div>
      <div className="absolute top-[60%] left-[8%] w-16 h-16 bg-white rounded-md rotate-45 shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-gray-100"></div>
      <div className="absolute top-[5%] right-[30%] w-24 h-24 bg-white rounded-md -rotate-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"></div>

      {/* Hollow / Outlined Squares */}
      <div className="absolute top-[30%] left-[10%] w-28 h-28 border-4 border-brand-200 rounded-md rotate-45 opacity-50"></div>
      <div className="absolute bottom-[10%] right-[15%] w-36 h-36 border-[6px] border-brand-100 rounded-md -rotate-12 opacity-60"></div>
      <div className="absolute top-[15%] right-[2%] w-20 h-20 border-2 border-brand-300 rounded-md rotate-12 opacity-40"></div>
      <div className="absolute bottom-[40%] left-[3%] w-12 h-12 border-2 border-brand-400 rounded-md rotate-45 opacity-50"></div>

      {/* Tiny decorative dots/accents */}
      <div className="absolute top-[50%] right-[20%] w-3 h-3 bg-brand-400 rounded-full"></div>
      <div className="absolute bottom-[30%] left-[25%] w-4 h-4 bg-brand-500 rounded-full opacity-60"></div>
      <div className="absolute top-[25%] left-[30%] w-2 h-2 bg-brand-300 rounded-full opacity-80"></div>
      <div className="absolute bottom-[50%] right-[40%] w-5 h-5 border-2 border-brand-400 rounded-full opacity-40"></div>
      <div className="absolute top-[10%] left-[50%] w-2 h-2 bg-brand-600 rounded-full opacity-50"></div>
    </div>
  );
}
