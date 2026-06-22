'use client';

import { useState } from 'react';

export default function KarmaLoyaltyConfig() {
  const [config, setConfig] = useState({
    coinsPerRupee: 20,
    karmaMultipliers: {
      starter: 1.0,
      active: 1.1,
      contributor: 1.25,
      leader: 1.5,
      elite: 2.0,
    },
    loyaltyMultipliers: {
      bronze: 1.0,
      silver: 1.1,
      gold: 1.2,
      platinum: 1.5,
      diamond: 2.0,
    },
    offerBonuses: {
      starter: 0,
      active: 0,
      contributor: 5,
      leader: 10,
      elite: 20,
    },
    priorityLevels: {
      starter: 0,
      active: 0,
      contributor: 1,
      leader: 2,
      elite: 3,
    },
  });

  const [saving, setSaving] = useState(false);

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await fetch('/api/karma-loyalty/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        alert('Config saved successfully!');
      }
    } catch (error) {
      alert('Failed to save config');
    }
    setSaving(false);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Karma-Loyalty Configuration</h1>

      {/* Base Coin Setting */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Base Coin Settings</h2>
        <label className="block mb-4">
          <span className="text-sm text-gray-600">Coins per Rs.X spent</span>
          <input
            type="number"
            value={config.coinsPerRupee}
            onChange={(e) => setConfig({ ...config, coinsPerRupee: parseInt(e.target.value) })}
            className="w-full mt-1 p-2 border rounded"
          />
          <span className="text-xs text-gray-500">1 coin per Rs.{config.coinsPerRupee} spent</span>
        </label>
      </div>

      {/* Karma Multipliers */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Karma Multipliers</h2>
        <p className="text-sm text-gray-600 mb-4">Higher karma = better coin multipliers</p>
        {Object.entries(config.karmaMultipliers).map(([level, value]) => (
          <div key={level} className="flex items-center gap-4 mb-3">
            <span className="w-24 capitalize">{level}</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={value}
              onChange={(e) => setConfig({
                ...config,
                karmaMultipliers: { ...config.karmaMultipliers, [level]: parseFloat(e.target.value) }
              })}
              className="flex-1"
            />
            <span className="w-16 text-right">{(value as number).toFixed(2)}x</span>
          </div>
        ))}
      </div>

      {/* Loyalty Multipliers */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Loyalty Multipliers</h2>
        <p className="text-sm text-gray-600 mb-4">Higher loyalty tier = better multipliers</p>
        {Object.entries(config.loyaltyMultipliers).map(([tier, value]) => (
          <div key={tier} className="flex items-center gap-4 mb-3">
            <span className="w-24 capitalize">{tier}</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={value}
              onChange={(e) => setConfig({
                ...config,
                loyaltyMultipliers: { ...config.loyaltyMultipliers, [tier]: parseFloat(e.target.value) }
              })}
              className="flex-1"
            />
            <span className="w-16 text-right">{(value as number).toFixed(2)}x</span>
          </div>
        ))}
      </div>

      {/* Offer Bonuses */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Offer Bonuses</h2>
        <p className="text-sm text-gray-600 mb-4">Extra % better offers for higher karma levels</p>
        {Object.entries(config.offerBonuses).map(([level, value]) => (
          <div key={level} className="flex items-center gap-4 mb-3">
            <span className="w-24 capitalize">{level}</span>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={value}
              onChange={(e) => setConfig({
                ...config,
                offerBonuses: { ...config.offerBonuses, [level]: parseInt(e.target.value) }
              })}
              className="flex-1"
            />
            <span className="w-16 text-right">{value}%</span>
          </div>
        ))}
      </div>

      {/* Tier Thresholds */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Tier Thresholds</h2>
        <p className="text-sm text-gray-600 mb-4">Points needed for each tier</p>
        {Object.entries(config.tierThresholds).map(([tier, value]) => tier !== 'bronze' && (
          <div key={tier} className="flex items-center gap-4 mb-3">
            <span className="w-24 capitalize">{tier}</span>
            <input
              type="number"
              value={value}
              onChange={(e) => setConfig({
                ...config,
                tierThresholds: { ...config.tierThresholds, [tier]: parseInt(e.target.value) }
              })}
              className="w-full p-2 border rounded"
            />
            <span className="text-gray-500">points</span>
          </div>
        ))}
      </div>

      <button
        onClick={saveConfig}
        disabled={saving}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>
  );
}
