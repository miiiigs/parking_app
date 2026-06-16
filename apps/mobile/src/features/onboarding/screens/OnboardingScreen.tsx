import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowRight, Check, Clock3, MapPin, Navigation, ParkingCircle } from 'lucide-react-native';
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors, radius, shadows, spacing, typography } from '../../../theme/tokens';

type OnboardingSlide = {
  key: string;
  title: string;
  description: string;
  Illustration: () => React.JSX.Element;
};

type SlotStatus = 'available' | 'occupied' | 'selected';

const slides: OnboardingSlide[] = [
  {
    key: 'find',
    title: 'Find Parking Before You Arrive',
    description:
      'Search nearby malls, offices, and establishments to view real-time parking availability and avoid unnecessary circling.',
    Illustration: FindParkingIllustration,
  },
  {
    key: 'reserve',
    title: 'Reserve in Advance',
    description:
      'Select your preferred parking area, choose an available slot, and secure your space before leaving for your destination.',
    Illustration: ReserveIllustration,
  },
  {
    key: 'arrive',
    title: 'Park Smarter, Save Time',
    description:
      'Navigate directly to your reserved parking slot and enjoy a smoother parking experience with less waiting and congestion.',
    Illustration: ParkSmarterIllustration,
  },
];

const INDICATOR_SMALL = 8;
const INDICATOR_LARGE = 28;
const INDICATOR_GAP = 10;
const INDICATOR_TOTAL_WIDTH = INDICATOR_LARGE + INDICATOR_SMALL * 2 + INDICATOR_GAP * 2;
const INDICATOR_HIT_HEIGHT = 28;

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const isLastSlide = currentIndex === slides.length - 1;

  const contentWidth = Math.min(width - 64, 356);
  const illustrationFrameHeight = height < 760 ? 334 : 366;

  const goToIndex = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= slides.length) {
      return;
    }

    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setCurrentIndex(nextIndex);
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(Math.max(0, Math.min(slides.length - 1, nextIndex)));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <View />
          {!isLastSlide ? (
            <Pressable onPress={() => router.push('/auth')} hitSlop={10} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View />
          )}
        </View>

        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          directionalLockEnabled
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: true,
          })}
        >
          {slides.map((slide, index) => (
            <Slide
              key={slide.key}
              index={index}
              width={width}
              contentWidth={contentWidth}
              illustrationFrameHeight={illustrationFrameHeight}
              scrollX={scrollX}
              slide={slide}
            />
          ))}
        </Animated.ScrollView>

        <View style={styles.footer}>
          <PaginationIndicators scrollX={scrollX} pageWidth={width} onPress={goToIndex} />

          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              if (isLastSlide) {
                router.push('/auth');
                return;
              }

              goToIndex(currentIndex + 1);
            }}
          >
            <Text style={styles.primaryButtonText}>{isLastSlide ? 'Get Started' : 'Next'}</Text>
            <ArrowRight color={colors.surface} size={18} strokeWidth={2.5} />
          </Pressable>

          <Text style={styles.signInCopy}>
            Already have an account?{' '}
            <Text style={styles.signInLink} onPress={() => router.push('/login')}>
              Sign In
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function PaginationIndicators({
  scrollX,
  pageWidth,
  onPress,
}: {
  scrollX: Animated.Value;
  pageWidth: number;
  onPress: (index: number) => void;
}) {
  const inputRange = [0, pageWidth, pageWidth * 2];
  const leftStops = [
    [0, 0, 0],
    [INDICATOR_LARGE + INDICATOR_GAP, INDICATOR_SMALL + INDICATOR_GAP, INDICATOR_SMALL + INDICATOR_GAP],
    [
      INDICATOR_LARGE + INDICATOR_GAP + INDICATOR_SMALL + INDICATOR_GAP,
      INDICATOR_SMALL + INDICATOR_GAP + INDICATOR_LARGE + INDICATOR_GAP,
      INDICATOR_SMALL + INDICATOR_GAP + INDICATOR_SMALL + INDICATOR_GAP,
    ],
  ];

  return (
    <View style={styles.paginationRow}>
      <View style={styles.paginationVisualGroup}>
        {slides.map((slide, index) => {
          const translateX = scrollX.interpolate({
            inputRange,
            outputRange: leftStops[index],
            extrapolate: 'clamp',
          });
          const activeOpacity = scrollX.interpolate({
            inputRange,
            outputRange: inputRange.map((_, pageIndex) => (pageIndex === index ? 1 : 0)),
            extrapolate: 'clamp',
          });
          const activeScaleX = scrollX.interpolate({
            inputRange,
            outputRange: inputRange.map((_, pageIndex) => (pageIndex === index ? 1 : INDICATOR_SMALL / INDICATOR_LARGE)),
            extrapolate: 'clamp',
          });
          const activeTranslateX = scrollX.interpolate({
            inputRange,
            outputRange: inputRange.map((_, pageIndex) => (pageIndex === index ? 0 : -(INDICATOR_LARGE - INDICATOR_SMALL) / 2)),
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={slide.key}
              pointerEvents="none"
              style={[
                styles.paginationIndicatorLayer,
                {
                  transform: [{ translateX }],
                },
              ]}
            >
              <View style={styles.paginationDotBase} />
              <Animated.View
                style={[
                  styles.paginationDotActive,
                  {
                    opacity: activeOpacity,
                    transform: [{ translateX: activeTranslateX }, { scaleX: activeScaleX }],
                  },
                ]}
              />
            </Animated.View>
          );
        })}

        <View style={styles.paginationHitRow}>
          {slides.map((slide, index) => (
            <Pressable key={`${slide.key}-hit`} onPress={() => onPress(index)} hitSlop={8} style={styles.paginationHitButton} />
          ))}
        </View>
      </View>
    </View>
  );
}

function Slide({
  index,
  width,
  contentWidth,
  illustrationFrameHeight,
  scrollX,
  slide,
}: {
  index: number;
  width: number;
  contentWidth: number;
  illustrationFrameHeight: number;
  scrollX: Animated.Value;
  slide: OnboardingSlide;
}) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const illustrationTranslateX = scrollX.interpolate({
    inputRange,
    outputRange: [48, 0, -48],
    extrapolate: 'clamp',
  });
  const illustrationScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.92, 1, 0.92],
    extrapolate: 'clamp',
  });
  const illustrationOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.35, 1, 0.35],
    extrapolate: 'clamp',
  });
  const copyTranslateY = scrollX.interpolate({
    inputRange,
    outputRange: [18, 0, 18],
    extrapolate: 'clamp',
  });
  const copyOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.45, 1, 0.45],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.slidePage, { width }]}>
      <View style={[styles.slideInner, { width: contentWidth }]}>
        <Animated.View
          style={[
            styles.illustrationFrame,
            {
              height: illustrationFrameHeight,
              opacity: illustrationOpacity,
              transform: [{ translateX: illustrationTranslateX }, { scale: illustrationScale }],
            },
          ]}
        >
          <slide.Illustration />
        </Animated.View>

        <Animated.View style={[styles.copyBlock, { opacity: copyOpacity, transform: [{ translateY: copyTranslateY }] }]}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

function FigureCard({
  children,
  style,
}: {
  children: React.JSX.Element | React.JSX.Element[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={styles.figureCanvas}>
      <View style={[styles.figureCard, style]}>{children}</View>
    </View>
  );
}

function FindParkingIllustration() {
  return (
    <FigureCard style={styles.findFigureCard}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject} viewBox="0 0 360 320" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E8F5F3" />
            <Stop offset="52%" stopColor="#D8F7E8" />
            <Stop offset="100%" stopColor="#CCFBF1" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="360" height="320" fill="url(#mapBg)" />
        {[32, 64, 96, 128, 160, 192, 224, 256, 288, 320].map((x) => (
          <Line key={`vx-${x}`} x1={x} y1="0" x2={x} y2="320" stroke="#0F766E" strokeOpacity="0.11" strokeWidth="1" />
        ))}
        {[32, 64, 96, 128, 160, 192, 224, 256, 288].map((y) => (
          <Line key={`hy-${y}`} x1="0" y1={y} x2="360" y2={y} stroke="#0F766E" strokeOpacity="0.11" strokeWidth="1" />
        ))}
      </Svg>

      <View style={styles.mapRoadHorizontal} />
      <View style={styles.mapRoadVertical} />

      <View style={[styles.mapBuilding, { top: 48, left: 24, width: 92, height: 52 }]} />
      <View style={[styles.mapBuilding, { top: 46, right: 26, width: 70, height: 82 }]} />
      <View style={[styles.mapBuilding, { bottom: 104, left: 22, width: 64, height: 58 }]} />
      <View style={[styles.mapBuilding, { bottom: 96, right: 24, width: 84, height: 50 }]} />

      <PinChip label="Mall" color="#34D399" style={{ top: 26, left: 28 }} />
      <PinChip label="Office" color="#0F766E" style={{ top: 22, right: 24 }} />

      <View style={styles.locationPulseOuter} />
      <View style={styles.locationPulseInner} />
      <View style={styles.locationPulseCore} />

      <View style={styles.nearbyCard}>
        <View style={styles.nearbyHeader}>
          <View style={styles.nearbyTitleRow}>
            <MapPin color={colors.primaryDark} size={14} strokeWidth={2.3} />
            <Text style={styles.nearbyTitle}>Nearby Parking</Text>
          </View>
          <Text style={styles.nearbyStatus}>Live</Text>
        </View>

        <View style={styles.nearbyGrid}>
          <StatTile label="SM North" value="24" valueColor="#34D399" />
          <StatTile label="Ayala" value="8" valueColor="#F59E0B" />
          <StatTile label="BGC Tower" value="31" valueColor="#34D399" />
        </View>
      </View>
    </FigureCard>
  );
}

function ReserveIllustration() {
  const slots: Array<{ id: string; status: SlotStatus }> = [
    { id: 'A1', status: 'occupied' },
    { id: 'A2', status: 'occupied' },
    { id: 'A3', status: 'available' },
    { id: 'A4', status: 'available' },
    { id: 'B1', status: 'available' },
    { id: 'B2', status: 'selected' },
    { id: 'B3', status: 'occupied' },
    { id: 'B4', status: 'available' },
    { id: 'C1', status: 'occupied' },
    { id: 'C2', status: 'available' },
    { id: 'C3', status: 'occupied' },
    { id: 'C4', status: 'occupied' },
  ];

  return (
    <FigureCard>
      <View style={styles.reserveHeader}>
        <Text style={styles.reserveEyebrow}>SELECT A SLOT</Text>
        <Text style={styles.reserveTitle}>Level 2 - Section B</Text>

        <View style={styles.reserveLegend}>
          <LegendItem label="Available" color="#34D399" />
          <LegendItem label="Occupied" color="#F87171" />
          <LegendItem label="Selected" color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.reserveBody}>
        <LaneLabel label="DRIVE LANE" />

        {['A', 'B', 'C'].map((row) => (
          <View key={row} style={styles.slotRow}>
            <Text style={styles.slotRowLabel}>{row}</Text>
            <View style={styles.slotGrid}>
              {slots
                .filter((slot) => slot.id.startsWith(row))
                .map((slot) => (
                  <SlotCard key={slot.id} slot={slot} />
                ))}
            </View>
          </View>
        ))}

        <LaneLabel label="EXIT ->" />
      </View>

      <View style={styles.reserveFooterCard}>
        <View>
          <Text style={styles.reserveFooterTitle}>Slot B2 selected</Text>
          <Text style={styles.reserveFooterCopy}>2 hrs | PHP 60.00</Text>
        </View>

        <View style={styles.reserveFooterButton}>
          <Text style={styles.reserveFooterButtonText}>Reserve</Text>
        </View>
      </View>
    </FigureCard>
  );
}

function ParkSmarterIllustration() {
  return (
    <FigureCard>
      <View style={styles.successHeader}>
        <View style={styles.successBadge}>
          <Check color={colors.surface} size={24} strokeWidth={2.7} />
        </View>
        <Text style={styles.successTitle}>Reservation Confirmed!</Text>
        <Text style={styles.successCopy}>Your slot is secured and ready</Text>
      </View>

      <View style={styles.successBody}>
        <View style={styles.activeReservationCard}>
          <View style={styles.activeReservationRow}>
            <View style={styles.activeSlotBadge}>
              <Text style={styles.activeSlotBadgeText}>B2</Text>
            </View>

            <View style={styles.activeSlotTextBlock}>
              <Text style={styles.activeSlotTitle}>Slot B2 - Level 2</Text>
              <Text style={styles.activeSlotSubtitle}>SM North EDSA - Section B</Text>
            </View>
          </View>

          <View style={styles.activePill}>
            <Text style={styles.activePillText}>ACTIVE</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <InfoCard icon={<Clock3 color={colors.primaryDark} size={14} />} label="Check-in" value="2:30 PM" />
          <InfoCard icon={<TimerGlyph />} label="Duration" value="2 Hours" />
          <InfoCard icon={<ParkingCircle color={colors.primaryDark} size={14} />} label="Plate No." value="ABC 1234" />
          <InfoCard icon={<CurrencyGlyph />} label="Amount" value="PHP 60.00" />
        </View>

        <View style={styles.accessCard}>
          <View style={styles.accessHeader}>
            <Navigation color={colors.primaryDark} size={14} strokeWidth={2.4} />
            <Text style={styles.accessTitle}>Access Granted</Text>
          </View>

          <View style={styles.barrierRow}>
            <View style={styles.barrierBase}>
              <View style={styles.barrierBaseCenter} />
            </View>
            <View style={styles.barrierArmWrap}>
              <Svg width="96" height="20" viewBox="0 0 96 20">
                <Path
                  d="M2 16 L92 6"
                  stroke="#0F766E"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="12 8"
                />
              </Svg>
            </View>
            <Check color="#34D399" size={16} strokeWidth={2.8} />
          </View>

          <Text style={styles.accessCopy}>Barrier opens automatically on arrival</Text>
        </View>
      </View>
    </FigureCard>
  );
}

function PinChip({
  label,
  color,
  style,
}: {
  label: string;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pinChip, style]}>
      <View style={[styles.pinDot, { backgroundColor: color }]} />
      <Text style={styles.pinText}>{label}</Text>
    </View>
  );
}

function StatTile({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LegendItem({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function LaneLabel({ label }: { label: string }) {
  return (
    <View style={styles.laneRow}>
      <View style={styles.laneLine} />
      <Text style={styles.laneText}>{label}</Text>
      <View style={styles.laneLine} />
    </View>
  );
}

function SlotCard({ slot }: { slot: { id: string; status: SlotStatus } }) {
  const palette =
    slot.status === 'selected'
      ? { backgroundColor: '#0F766E', borderColor: '#0F766E', textColor: '#FFFFFF' }
      : slot.status === 'available'
        ? { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0', textColor: '#16A34A' }
        : { backgroundColor: '#FEE2E2', borderColor: '#FECACA', textColor: '#DC2626' };

  return (
    <View style={[styles.slotCard, { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor }]}>
      <Text style={[styles.slotCardText, { color: palette.textColor }]}>{slot.id}</Text>
      {slot.status === 'selected' ? <Text style={styles.slotCardTag}>You</Text> : null}
    </View>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.JSX.Element;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoCard}>
      {icon}
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function TimerGlyph() {
  return (
    <Svg width="14" height="14" viewBox="0 0 14 14">
      <Circle cx="7" cy="7" r="5.5" stroke={colors.primaryDark} strokeWidth="1.2" fill="none" />
      <Path d="M7 7 L7 3.7" stroke={colors.primaryDark} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M7 7 L9.6 7" stroke={colors.primaryDark} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
}

function CurrencyGlyph() {
  return (
    <View style={styles.currencyChip}>
      <Text style={styles.currencyChipText}>PHP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  root: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  skipButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skipText: {
    color: '#64748B',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.08,
  },
  slidePage: {
    flex: 1,
  },
  slideInner: {
    flex: 1,
    alignSelf: 'center',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
  },
  illustrationFrame: {
    width: '92%',
    justifyContent: 'center',
  },
  copyBlock: {
    marginTop: 40,
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 10,
  },
  title: {
    color: '#1E293B',
    fontSize: 31,
    lineHeight: 38,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.55,
    textAlign: 'center',
  },
  description: {
    maxWidth: 286,
    color: '#64748B',
    fontSize: 16,
    lineHeight: 27,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.06,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    gap: 22,
  },
  paginationRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  paginationVisualGroup: {
    width: INDICATOR_TOTAL_WIDTH,
    height: INDICATOR_HIT_HEIGHT,
    position: 'relative',
  },
  paginationIndicatorLayer: {
    position: 'absolute',
    left: 0,
    top: (INDICATOR_HIT_HEIGHT - INDICATOR_SMALL) / 2,
    width: INDICATOR_LARGE,
    height: INDICATOR_SMALL,
  },
  paginationDotBase: {
    position: 'absolute',
    left: 0,
    width: INDICATOR_SMALL,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  paginationDotActive: {
    position: 'absolute',
    left: 0,
    width: INDICATOR_LARGE,
    height: INDICATOR_SMALL,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: '#0F766E',
  },
  paginationHitRow: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: INDICATOR_TOTAL_WIDTH,
    height: INDICATOR_HIT_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paginationHitButton: {
    flex: 1,
    height: '100%',
    marginHorizontal: 2,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#0F766E',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.08,
  },
  signInCopy: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.04,
    textAlign: 'center',
  },
  signInLink: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
  figureCanvas: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  figureCard: {
    height: '98%',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#D8ECE4',
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows,
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    transform: [{ scale: 1.03 }],
  },
  findFigureCard: {
    backgroundColor: '#EAF8F3',
  },
  mapRoadHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '52%',
    height: 18,
    marginTop: -9,
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  mapRoadVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '42%',
    width: 18,
    marginLeft: -9,
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  mapBuilding: {
    position: 'absolute',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pinChip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  pinText: {
    color: colors.primaryDark,
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.05,
  },
  locationPulseOuter: {
    position: 'absolute',
    left: '42%',
    top: '50%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15,118,110,0.14)',
  },
  locationPulseInner: {
    position: 'absolute',
    left: '42%',
    top: '50%',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15,118,110,0.24)',
  },
  locationPulseCore: {
    position: 'absolute',
    left: '42%',
    top: '50%',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: radius.pill,
    backgroundColor: '#0F766E',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  nearbyCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nearbyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nearbyTitle: {
    color: '#1E293B',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  nearbyStatus: {
    color: '#34D399',
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
  },
  nearbyGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 8,
    fontFamily: 'Poppins_500Medium',
    marginTop: 2,
    letterSpacing: 0.04,
    textAlign: 'center',
  },
  reserveHeader: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
  },
  reserveEyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.5,
  },
  reserveTitle: {
    color: colors.surface,
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  reserveLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 9,
    fontFamily: 'Poppins_500Medium',
  },
  reserveBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  laneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  laneLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  laneText: {
    color: '#94A3B8',
    fontSize: 8,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.04,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotRowLabel: {
    width: 12,
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
  },
  slotGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  slotCard: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCardText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
  },
  slotCardTag: {
    color: colors.surface,
    fontSize: 8,
    fontFamily: 'Poppins_600SemiBold',
  },
  reserveFooterCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reserveFooterTitle: {
    color: '#1E293B',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  reserveFooterCopy: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  reserveFooterButton: {
    borderRadius: 12,
    backgroundColor: '#0F766E',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reserveFooterButtonText: {
    color: colors.surface,
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
  },
  successHeader: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    backgroundColor: '#ECFDF5',
  },
  successBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0F766E',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  successTitle: {
    color: '#0F766E',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.1,
  },
  successCopy: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  successBody: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  activeReservationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
    padding: 12,
  },
  activeReservationRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeSlotBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSlotBadgeText: {
    color: colors.surface,
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
  },
  activeSlotTextBlock: {
    flex: 1,
  },
  activeSlotTitle: {
    color: '#1E293B',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  activeSlotSubtitle: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  activePill: {
    borderRadius: 10,
    backgroundColor: '#34D399',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  activePillText: {
    color: '#064E3B',
    fontSize: 8,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.06,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  infoCard: {
    width: '48.5%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 10,
    gap: 4,
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontFamily: 'Poppins_500Medium',
  },
  infoValue: {
    color: '#1E293B',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  currencyChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#DDF4EA',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currencyChipText: {
    color: colors.primaryDark,
    fontSize: 9,
    fontFamily: 'Poppins_700Bold',
  },
  accessCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
    padding: 12,
    gap: 8,
  },
  accessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accessTitle: {
    color: colors.primaryDark,
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
  },
  barrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barrierBase: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barrierBaseCenter: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  barrierArmWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  accessCopy: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: 'Poppins_400Regular',
  },
});
