import React from 'react';
import { View, Text } from 'react-native';

export function VoucherItemRenderer({ item }: any) { return <View><Text>Voucher: {item.title}</Text></View>; }
export function CouponItemRenderer({ item }: any) { return <View><Text>Coupon: {item.title}</Text></View>; }
export function CampaignItemRenderer({ item }: any) { return <View><Text>Campaign: {item.title}</Text></View>; }
export function CoinDropItemRenderer({ item }: any) { return <View><Text>CoinDrop: {item.title}</Text></View>; }
