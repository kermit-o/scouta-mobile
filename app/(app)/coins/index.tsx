import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, RefreshControl, ScrollView,
} from "react-native";
import { getCoinBalance, getCoinPackages, getCoinTransactions, getEarnings, purchaseCoins } from "@/lib/api";
import { Colors, Fonts } from "@/lib/constants";
import { BackButton, Loading, SectionLabel } from "@/components/ui";
import type { CoinPackage } from "@/lib/types";

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

export default function CoinWalletScreen() {
  const [balance, setBalance] = useState(0);
  const [earnings, setEarnings] = useState<any>(null);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [balData, pkgData, txData, earnData] = await Promise.all([
        getCoinBalance(),
        getCoinPackages(),
        getCoinTransactions(),
        getEarnings(),
      ]);
      setBalance(balData?.balance ?? balData?.coins ?? 0);
      setPackages(Array.isArray(pkgData) ? pkgData : pkgData.packages || []);
      setTransactions(Array.isArray(txData) ? txData : txData.transactions || []);
      setEarnings(earnData);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, []);

  async function handleBuy(pkg: CoinPackage) {
    try {
      await purchaseCoins(pkg.id);
      load();
    } catch {}
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  if (loading) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 }}>
        <BackButton />
        <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "600", marginTop: 8 }}>Coin Wallet</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
      >
        {/* Balance card */}
        <View style={{
          backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.gold + "44",
          padding: 20, alignItems: "center", marginBottom: 20,
        }}>
          <SectionLabel style={{ marginBottom: 4 }}>BALANCE</SectionLabel>
          <Text style={{ color: Colors.gold, fontSize: 36, fontFamily: Fonts.mono, fontWeight: "700" }}>{balance}</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: Fonts.mono }}>coins</Text>
        </View>

        {/* Earnings summary */}
        {earnings ? (
          <View style={{
            backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
            padding: 16, marginBottom: 20,
          }}>
            <SectionLabel>EARNINGS</SectionLabel>
            <Text style={{ color: Colors.text, fontSize: 13, fontFamily: Fonts.mono }}>
              Total: {earnings.total_earned ?? 0} coins
            </Text>
          </View>
        ) : null}

        {/* Packages */}
        {packages.length > 0 ? (
          <View style={{ marginBottom: 20 }}>
            <SectionLabel>BUY COINS</SectionLabel>
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                onPress={() => handleBuy(pkg)}
                style={{
                  backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
                  padding: 14, marginBottom: 6,
                  flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <View>
                  <Text style={{ color: Colors.text, fontSize: 16, fontFamily: Fonts.mono, fontWeight: "700" }}>
                    {pkg.coins} coins
                  </Text>
                </View>
                <View style={{
                  backgroundColor: Colors.gold + "22", borderWidth: 1, borderColor: Colors.gold,
                  paddingHorizontal: 12, paddingVertical: 6,
                }}>
                  <Text style={{ color: Colors.gold, fontSize: 12, fontFamily: Fonts.mono, fontWeight: "700" }}>
                    ${(pkg.price_cents / 100).toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Transaction history */}
        <SectionLabel>HISTORY</SectionLabel>
        {transactions.length > 0 ? (
          transactions.map((tx) => (
            <View
              key={tx.id}
              style={{
                backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
                padding: 12, marginBottom: 6,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <Text style={{
                  color: tx.amount > 0 ? Colors.green : Colors.red,
                  fontSize: 14, fontFamily: Fonts.mono, fontWeight: "700",
                }}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: Fonts.mono }}>{timeAgo(tx.created_at)}</Text>
              </View>
              <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>{tx.description}</Text>
            </View>
          ))
        ) : (
          <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: Fonts.mono, textAlign: "center", marginTop: 20 }}>
            No transactions yet.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
