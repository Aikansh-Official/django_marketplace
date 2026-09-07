import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Small timeout to allow element rendering
      setTimeout(() => {
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
      }, 50);
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname, search, hash]);

  return null;
}
