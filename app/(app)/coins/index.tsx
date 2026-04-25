import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants";
import {
  getCoinBalance,
  getCoinPackages,
  getCoinTransactions,
  purchaseCoins,
} from "@/lib/api";
import { formatNumber, timeAgo } from "@/lib/utils";
import type { CoinPackage, CoinTransaction, EarningsSummary } from "@/lib/types";

export default function CoinWalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  const [balance, setBalance] = useState(user?.coin_balance || 0);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setError("");
      const [balanceData, pkgData, txData] = await Promise.all([
        getCoinBalance(token),
        getCoinPackages(token),
        getCoinTransactions(token),
      ]);
      setBalance(balanceData.balance ?? balanceData.coin_balance ?? user?.coin_balance ?? 0);
      setEarnings(balanceData.earnings || null);
      setPackages(pkgData.packages || pkgData || []);
      setTransactions(txData.transactions || txData.items || txData || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load wallet data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handlePurchase(pkg: CoinPackage) {
    Alert.alert(
      "Purchase Coins",
      `Buy ${pkg.coins + pkg.bonus_coins} coins for $${(pkg.price_cents / 100).toFixed(2)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Buy",
          onPress: async () => {
            try {
              await purchaseCoins(pkg.id, token);
              loadData();
              Alert.alert("Success", "Coins purchased successfully!");
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Purchase failed.");
            }
          },
        },
      ]
    );
  }

  function getTransactionIcon(type: string) {
    switch (type) {
      case "purchase":
        return { name: "add-circle", color: Colors.green };
      case "gift_sent":
        return { name: "gift", color: Colors.red };
      case "gift_received":
        return { name: "gift", color: Colors.green };
      case "reward":
        return { name: "star", color: Colors.gold };
      case "refund":
        return { name: "return-down-back", color: Colors.blue };
      default:
        return { name: "ellipse", color: Colors.textMuted };
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "600" }}>
          Coin Wallet
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {error ? (
          <View
            style={{
              margin: 16,
              padding: 12,
              backgroundColor: "rgba(238,68,68,0.1)",
              borderRadius: 8,
            }}
          >
            <Text style={{ color: Colors.red, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        {/* Balance card */}
        <View
          style={{
            margin: 16,
            padding: 24,
            backgroundColor: Colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            YOUR BALANCE
          </Text>
          <Text
            style={{
              color: Colors.gold,
              fontSize: 40,
              fontWeight: "700",
              fontFamily: "monospace",
            }}
          >
            {formatNumber(balance)}
          </Text>
          <Text
            style={{
              color: Colors.gold,
              fontSize: 14,
              fontFamily: "monospace",
              marginTop: 2,
            }}
          >
            coins
          </Text>
        </View>

        {/* Earnings summary */}
        {earnings ? (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 16,
              flexDirection: "row",
              gap: 8,
            }}
          >
            {[
              { label: "Earned", value: earnings.total_earned },
              { label: "Available", value: earnings.available_balance },
              { label: "Pending", value: earnings.pending },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  backgroundColor: Colors.card,
                  borderRadius: 10,
                  padding: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text
                  style={{
                    color: Colors.text,
                    fontSize: 16,
                    fontWeight: "700",
                    fontFamily: "monospace",
                  }}
                >
                  {formatNumber(item.value)}
                </Text>
                <Text
                  style={{
                    color: Colors.textMuted,
                    fontSize: 9,
                    fontFamily: "monospace",
                    marginTop: 2,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Buy packages */}
        {packages.length > 0 ? (
          <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <Text
              style={{
                color: Colors.textSecondary,
                fontSize: 11,
                fontFamily: "monospace",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              BUY COINS
            </Text>
            <View style={{ gap: 8 }}>
              {packages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.id}
                  onPress={() => handlePurchase(pkg)}
                  style={{
                    backgroundColor: Colors.card,
                    borderRadius: 10,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: pkg.is_featured ? Colors.gold : Colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <Text style={{ color: Colors.text, fontSize: 15, fontWeight: "600" }}>
                      {pkg.name}
                    </Text>
                    <Text
                      style={{
                        color: Colors.gold,
                        fontSize: 12,
                        fontFamily: "monospace",
                        marginTop: 2,
                      }}
                    >
                      {formatNumber(pkg.coins)} coins
                      {pkg.bonus_coins > 0
                        ? ` + ${formatNumber(pkg.bonus_coins)} bonus`
                        : ""}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: Colors.green,
                      borderRadius: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: "700",
                      }}
                    >
                      ${(pkg.price_cents / 100).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {/* Transaction history */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text
            style={{
              color: Colors.textSecondary,
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            TRANSACTION HISTORY
          </Text>
          {transactions.length > 0 ? (
            transactions.map((tx) => {
              const icon = getTransactionIcon(tx.type);
              return (
                <View
                  key={tx.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.border,
                  }}
                >
                  <Ionicons
                    name={icon.name as any}
                    size={20}
                    color={icon.color}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.text, fontSize: 13 }}>
                      {tx.description}
                    </Text>
                    <Text
                      style={{
                        color: Colors.textMuted,
                        fontSize: 10,
                        fontFamily: "monospace",
                        marginTop: 2,
                      }}
                    >
                      {timeAgo(tx.created_at)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: tx.amount >= 0 ? Colors.green : Colors.red,
                      fontSize: 14,
                      fontWeight: "700",
                      fontFamily: "monospace",
                    }}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
                No transactions yet
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
