'use client';

import { useEffect } from 'react';

export function AnimationStyles() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const styles = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .animate-fadeIn {
        animation: fadeIn 0.6s ease-out forwards;
      }
      
      .animation-delay-300 {
        animation-delay: 0.3s;
      }
      
      .animation-delay-500 {
        animation-delay: 0.5s;
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      .animate-slideIn {
        animation: slideIn 0.5s ease-out forwards;
      }
      
      .price-update {
        transition: background-color 0.5s ease;
      }
      
      .price-updated {
        background-color: rgba(34, 197, 94, 0.1);
      }
      `;
      
      const styleElement = document.createElement('style');
      styleElement.textContent = styles;
      document.head.appendChild(styleElement);
      
      return () => {
        document.head.removeChild(styleElement);
      };
    }
  }, []);
  
  return null;
} 