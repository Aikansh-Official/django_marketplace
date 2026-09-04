import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex justify-center md:justify-start space-x-6 md:order-2">
            <Link to="/about" className="text-gray-400 hover:text-gray-500 transition-colors">
              About
            </Link>
            <Link to="/guidelines" className="text-gray-400 hover:text-gray-500 transition-colors">
              Guidelines
            </Link>
            <Link to="/privacy" className="text-gray-400 hover:text-gray-500 transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-gray-400 hover:text-gray-500 transition-colors">
              Terms
            </Link>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} LPUTrade. An exclusive marketplace for college students.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
