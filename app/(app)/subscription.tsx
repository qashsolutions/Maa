import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';
import { ChevronLeftIcon, StarIcon, CheckIcon } from '../../icons';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  ErrorCode,
  type ProductSubscription,
  type Purchase,
  type PurchaseError,
  type EventSubscription,
} from 'react-native-iap';

const TRIAL_DURATION_DAYS = 180; // 6 months free

/**
 * Product ID defined in Google Play Console / App Store Connect.
 * Prices are set in the store console — the app fetches localized pricing at runtime.
 * Google Play handles currency conversion and local pricing for all countries.
 */
const SUBSCRIPTION_SKU = 'maa_monthly_sub';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [daysRemaining, setDaysRemaining] = useState<number>(TRIAL_DURATION_DAYS);
  const [product, setProduct] = useState<ProductSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, fetch createdAt from Firestore user doc
    setDaysRemaining(TRIAL_DURATION_DAYS);
  }, []);

  // Initialize IAP connection and fetch subscription product
  useEffect(() => {
    let purchaseUpdateSub: EventSubscription | null = null;
    let purchaseErrorSub: EventSubscription | null = null;

    async function init() {
      try {
        await initConnection();

        // Listen for successful purchases
        purchaseUpdateSub = purchaseUpdatedListener(
          async (purchase: Purchase) => {
            await finishTransaction({ purchase, isConsumable: false });
            Alert.alert(
              t('subscription.purchaseSuccess'),
              t('subscription.purchaseSuccessMessage'),
            );
          },
        );

        // Listen for purchase errors
        purchaseErrorSub = purchaseErrorListener((error: PurchaseError) => {
          if (error.code !== ErrorCode.UserCancelled) {
            Alert.alert(t('subscription.purchaseError'), error.message);
          }
        });

        // Fetch subscription product with localized pricing from the store
        const products = await fetchProducts({ skus: [SUBSCRIPTION_SKU], type: 'subs' });
        if (products && products.length > 0) {
          // fetchProducts with type 'subs' returns ProductSubscription[]
          setProduct(products[0] as ProductSubscription);
        }
      } catch {
        // IAP not available (e.g., Expo Go, emulator, web)
      } finally {
        setLoading(false);
      }
    }

    init();

    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
      endConnection();
    };
  }, [t]);

  const handleSubscribe = useCallback(async () => {
    if (!product) return;

    try {
      if (Platform.OS === 'android') {
        // Android requires offerToken from subscription offer details
        const androidProduct = product as import('react-native-iap').ProductSubscriptionAndroid;
        const offerToken = androidProduct.subscriptionOfferDetailsAndroid?.[0]?.offerToken;
        await requestPurchase({
          request: {
            google: {
              skus: [product.id],
              subscriptionOffers: offerToken
                ? [{ sku: product.id, offerToken }]
                : undefined,
            },
          },
          type: 'subs',
        });
      } else {
        await requestPurchase({
          request: { apple: { sku: product.id } },
          type: 'subs',
        });
      }
    } catch {
      // Purchase flow cancelled or failed — error listener handles display
    }
  }, [product]);

  const trialActive = daysRemaining > 0;
  const progressWidth = `${Math.max(0, (daysRemaining / TRIAL_DURATION_DAYS) * 100)}%` as const;

  // Localized price string from the store (Google/Apple set this based on user's country)
  const localizedPrice = product?.displayPrice ?? null;

  const features = [
    t('subscription.unlimitedVoice'),
    t('subscription.weeklyInsights'),
    t('subscription.predictiveAnalysis'),
    t('subscription.multiLanguage'),
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeftIcon size={20} color={colors.gold} />
          <Text style={[styles.backText, { color: colors.gold }]}>{t('common.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('subscription.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current Plan Card */}
        <View style={[styles.planCard, { backgroundColor: colors.bgCard, borderColor: colors.borderGold }]}>
          <StarIcon size={32} color={colors.gold} />
          <Text style={[styles.planName, { color: colors.gold }]}>
            {t('subscription.freeTrial')}
          </Text>
          <Text style={[styles.planStatus, { color: colors.textSecondary }]}>
            {trialActive
              ? t('subscription.trialEndsIn', { days: daysRemaining })
              : t('subscription.trialExpired')}
          </Text>

          {/* Trial progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.borderDefault }]}>
            <View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.gold }]} />
          </View>

          <Text style={[styles.daysCount, { color: colors.textTertiary }]}>
            {daysRemaining} / {TRIAL_DURATION_DAYS}
          </Text>
        </View>

        {/* Pricing (from Play Store / App Store) */}
        <View style={[styles.priceCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <Text style={[styles.priceLabel, { color: colors.textTertiary }]}>
            {t('subscription.currentPlan')}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceAmount, { color: colors.textPrimary }]}>
              {localizedPrice ?? (loading ? '...' : '--')}
            </Text>
            <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
              {t('subscription.perMonth')}
            </Text>
          </View>
        </View>

        {/* Features */}
        <Text style={[styles.featuresLabel, { color: colors.textTertiary }]}>
          {t('subscription.features')}
        </Text>
        <View style={[styles.featuresCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          {features.map((feature, i) => (
            <View key={i} style={[styles.featureRow, { borderBottomColor: colors.borderSubtle }]}>
              <CheckIcon size={16} color={colors.gold} />
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Subscribe button */}
        <Pressable
          style={[
            styles.manageBtn,
            { backgroundColor: product ? colors.gold : colors.textMuted },
          ]}
          onPress={handleSubscribe}
          disabled={!product}
        >
          <Text style={[styles.manageBtnText, { color: colors.bgPrimary }]}>
            {t('subscription.managePlan')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { ...Typography.bodyMedium },
  title: { ...Typography.sectionHeader },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  planCard: {
    borderRadius: 16, borderWidth: 1.5, padding: 24, alignItems: 'center', marginTop: 16, gap: 8,
  },
  planName: { ...Typography.sectionHeader, marginTop: 8 },
  planStatus: { ...Typography.body },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, marginTop: 12 },
  progressFill: { height: 6, borderRadius: 3 },
  daysCount: { ...Typography.caption, marginTop: 4 },
  priceCard: {
    borderRadius: 16, borderWidth: 1, padding: 20, marginTop: 24,
  },
  priceLabel: { ...Typography.label, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  priceAmount: { fontSize: 36, fontFamily: 'PlayfairDisplay-Bold' },
  pricePeriod: { ...Typography.body },
  featuresLabel: { ...Typography.label, marginTop: 24, marginBottom: 8 },
  featuresCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  featureText: { ...Typography.body, flex: 1 },
  manageBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 32,
  },
  manageBtnText: { ...Typography.cardTitle },
});
