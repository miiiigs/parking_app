import { useWindowDimensions } from 'react-native';

export function useResponsiveMetrics() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isCompact = width < 380;
  const horizontalPadding = isTablet ? 24 : 16;
  const contentWidth = Math.min(width - horizontalPadding * 2, isTablet ? 760 : 560);

  return {
    width,
    isTablet,
    isCompact,
    horizontalPadding,
    contentWidth,
  };
}
