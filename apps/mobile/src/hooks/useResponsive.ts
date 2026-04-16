import { useWindowDimensions } from 'react-native';

/**
 * Hook for responsive design
 * Provides breakpoints and dimensions
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  
  return {
    width,
    height,
    isSmallPhone: width < 360,
    isPhone: width < 768,
    isTablet: width >= 768,
    isLandscape: width > height,
    isPortrait: height >= width,
    // Responsive sizing helper
    contentWidth: Math.min(width - 32, width < 768 ? width : 800),
    breakpoint: width < 360 ? 'xs' : width < 768 ? 'sm' : 'md' as const,
  };
}
