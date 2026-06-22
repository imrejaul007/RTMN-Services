import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SectionHeader, Card, InfoRow } from '../SectionCard';
import { formatRupees } from '../helpers';
import type { EconomicsOverview } from '../../../services/api/economics';

interface Props {
  economics: EconomicsOverview | null | undefined;
  collapsed: boolean;
  onToggle: () => void;
}

export function FinancialHealthSection({ economics, collapsed, onToggle }: Props) {
  return (
    <Card>
      <TouchableOpacity onPress={onToggle}>
        <SectionHeader icon="wallet" title="Financial Health" />
      </TouchableOpacity>
      {!collapsed && economics && (
        <View style={styles.body}>
          {economics.cashbackToday && (
            <>
              <Text style={styles.subHeading}>Cashback Today</Text>
              <InfoRow label="Amount" value={formatRupees(economics.cashbackToday.totalAmount ?? 0)} />
              <InfoRow label="Transactions" value={economics.cashbackToday.transactionCount ?? 0} />
              <InfoRow label="Yesterday" value={formatRupees(economics.cashbackToday.yesterdayAmount ?? 0)} />
            </>
          )}
          {economics.coinIssuance && (
            <>
              <Text style={styles.subHeading}>Coin Issuance</Text>
              <InfoRow label="Today" value={(economics.coinIssuance.todayTotal ?? 0).toLocaleString()} />
              <InfoRow
                label="Change"
                value={`${(economics.coinIssuance.changePercent ?? 0) > 0 ? '+' : ''}${(economics.coinIssuance.changePercent ?? 0).toFixed(1)}%`}
                dot={(economics.coinIssuance.changePercent ?? 0) > 50 ? 'amber' : 'green'}
              />
            </>
          )}
          {economics.fraudAlerts && (
            <>
              <Text style={styles.subHeading}>Fraud Alerts</Text>
              <InfoRow
                label="Active Alerts"
                value={economics.fraudAlerts.alertCount ?? 0}
                dot={(economics.fraudAlerts.alertCount ?? 0) > 0 ? 'red' : 'green'}
              />
              <InfoRow
                label="Threshold"
                value={`${economics.fraudAlerts.threshold ?? '—'} / ${economics.fraudAlerts.window ?? '—'}`}
              />
            </>
          )}
          {economics.settlementDue && (
            <>
              <Text style={styles.subHeading}>Settlements Due</Text>
              <InfoRow label="Merchants" value={economics.settlementDue.totalDueMerchants ?? 0} />
              <InfoRow label="Pending Amount" value={formatRupees(economics.settlementDue.totalPendingAmount ?? 0)} />
            </>
          )}
          {economics.rewardReversals && (
            <>
              <Text style={styles.subHeading}>Reversals</Text>
              <InfoRow
                label="Pending"
                value={economics.rewardReversals.pendingReversals ?? 0}
                dot={(economics.rewardReversals.pendingReversals ?? 0) > 10 ? 'amber' : 'green'}
              />
              <InfoRow
                label="Completed Today"
                value={`${economics.rewardReversals.completedReversalsToday ?? 0} (${formatRupees(economics.rewardReversals.completedReversalAmount ?? 0)})`}
              />
            </>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = {
  body: { marginTop: 10, gap: 6 },
  subHeading: { fontSize: 12, fontWeight: '700' as const, color: '#1a3a52', marginTop: 8, marginBottom: 2 },
};
