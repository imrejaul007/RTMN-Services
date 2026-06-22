import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MERCHANT_TYPES = ['restaurant', 'hotel', 'retail', 'spa', 'gym', 'salon', 'taxi', 'other'];

export default function SalesStrategies() {
  const [merchantId, setMerchantId] = useState('');
  const [merchantType, setMerchantType] = useState('restaurant');
  const [activeTab, setActiveTab] = useState('strategies');
  
  // Sales Strategies State
  const [complimentaryOffers, setComplimentaryOffers] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  
  // Policies State
  const [policies, setPolicies] = useState<any>({});
  
  // Recommendations
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  // Load data
  useEffect(() => {
    if (merchantId) {
      loadSalesStrategies();
      loadPolicies();
      loadRecommendations();
    }
  }, [merchantId]);
  
  const loadSalesStrategies = async () => {
    try {
      const res = await fetch(`/api/merchants/${merchantId}/sales-strategies`);
      const data = await res.json();
      if (data.success) {
        setComplimentaryOffers(data.data.complimentaryOffers || []);
        setDiscounts(data.data.discounts || []);
        setPromotions(data.data.activePromotions || []);
      }
    } catch (error) {
      console.error('Failed to load sales strategies:', error);
    }
  };
  
  const loadPolicies = async () => {
    try {
      const res = await fetch(`/api/merchants/${merchantId}/policies`);
      const data = await res.json();
      if (data.success) {
        setPolicies(data.data.policies || {});
        setMerchantType(data.data.merchantType || 'restaurant');
      }
    } catch (error) {
      console.error('Failed to load policies:', error);
    }
  };
  
  const loadRecommendations = async () => {
    try {
      const res = await fetch(`/api/merchants/${merchantId}/sales-recommendations`);
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.data.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };
  
  // Add complimentary offer
  const addOffer = async (offer: any) => {
    try {
      const res = await fetch(`/api/merchants/${merchantId}/sales-strategies/complimentary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offer)
      });
      if (res.ok) loadSalesStrategies();
    } catch (error) {
      console.error('Failed to add offer:', error);
    }
  };
  
  // Add discount
  const addDiscount = async (discount: any) => {
    try {
      const res = await fetch(`/api/merchants/${merchantId}/sales-strategies/discounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discount)
      });
      if (res.ok) loadSalesStrategies();
    } catch (error) {
      console.error('Failed to add discount:', error);
    }
  };
  
  // Update policies
  const updatePolicies = async (newPolicies: any) => {
    try {
      const res = await fetch(`/api/merchants/${merchantId}/policies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPolicies)
      });
      if (res.ok) loadPolicies();
    } catch (error) {
      console.error('Failed to update policies:', error);
    }
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Sales Strategies & Policies</h1>
      
      {/* Merchant Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <label className="block text-sm font-medium mb-2">Merchant ID</label>
        <input
          type="text"
          value={merchantId}
          onChange={(e) => setMerchantId(e.target.value)}
          placeholder="Enter merchant ID"
          className="w-full p-2 border rounded"
        />
      </div>
      
      {merchantId && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('strategies')}
              className={`px-4 py-2 rounded ${activeTab === 'strategies' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Sales Strategies
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`px-4 py-2 rounded ${activeTab === 'policies' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Policies ({merchantType})
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-4 py-2 rounded ${activeTab === 'recommendations' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              AI Recommendations
            </button>
          </div>
          
          {/* Sales Strategies Tab */}
          {activeTab === 'strategies' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Complimentary Offers */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4">Complimentary Offers</h2>
                <div className="space-y-2 mb-4">
                  {complimentaryOffers.map((offer, i) => (
                    <div key={i} className="p-2 bg-green-50 rounded">
                      <div className="font-medium">{offer.item}</div>
                      <div className="text-sm text-gray-600">{offer.description}</div>
                      {offer.condition && <div className="text-xs text-gray-500">Condition: {offer.condition}</div>}
                    </div>
                  ))}
                </div>
                <AddOfferForm onAdd={addOffer} />
              </div>
              
              {/* Discounts */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4">Discounts</h2>
                <div className="space-y-2 mb-4">
                  {discounts.map((discount, i) => (
                    <div key={i} className="p-2 bg-purple-50 rounded">
                      <div className="font-medium">{discount.name}</div>
                      <div className="text-sm text-gray-600">
                        {discount.type === 'percentage' ? `${discount.value}% off` : `₹${discount.value} off`}
                      </div>
                      <div className="text-xs text-gray-500">{discount.description}</div>
                    </div>
                  ))}
                </div>
                <AddDiscountForm onAdd={addDiscount} />
              </div>
              
              {/* Promotions */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4">Active Promotions</h2>
                <div className="space-y-2">
                  {promotions.map((promo, i) => (
                    <div key={i} className="p-2 bg-orange-50 rounded">
                      <div className="font-medium">{promo.name}</div>
                      <div className="text-sm text-gray-600">{promo.description}</div>
                      <div className="text-xs text-gray-500">{promo.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Policies Tab */}
          {activeTab === 'policies' && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Merchant Policies - {merchantType}</h2>
              <PolicyEditor 
                merchantType={merchantType} 
                policies={policies} 
                onUpdate={updatePolicies} 
              />
            </div>
          )}
          
          {/* AI Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">AI Sales Recommendations</h2>
              <div className="space-y-4">
                {recommendations.map((rec, i) => (
                  <div key={i} className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        rec.type === 'complimentary' ? 'bg-green-500 text-white' :
                        rec.type === 'discount' ? 'bg-purple-500 text-white' :
                        rec.type === 'upsell' ? 'bg-orange-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        {rec.type}
                      </span>
                      <span className="font-medium">{rec.item || rec.name}</span>
                    </div>
                    <p className="mt-2 text-gray-700">{rec.message}</p>
                  </div>
                ))}
                {recommendations.length === 0 && (
                  <p className="text-gray-500">No recommendations available</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Add Offer Form Component
function AddOfferForm({ onAdd }: { onAdd: (offer: any) => void }) {
  const [item, setItem] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ item, condition, description, isActive: true });
    setItem(''); setCondition(''); setDescription('');
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input placeholder="Item (e.g., Free Drink)" value={item} onChange={e => setItem(e.target.value)} className="w-full p-2 border rounded text-sm" />
      <input placeholder="Condition (e.g., After 7pm)" value={condition} onChange={e => setCondition(e.target.value)} className="w-full p-2 border rounded text-sm" />
      <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded text-sm" />
      <button type="submit" className="w-full bg-green-500 text-white p-2 rounded text-sm">Add Offer</button>
    </form>
  );
}

// Add Discount Form Component
function AddDiscountForm({ onAdd }: { onAdd: (discount: any) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('percentage');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ name, type, value: Number(value), description, isActive: true });
    setName(''); setValue(''); setDescription('');
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input placeholder="Discount Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded text-sm" />
      <select value={type} onChange={e => setType(e.target.value)} className="w-full p-2 border rounded text-sm">
        <option value="percentage">Percentage</option>
        <option value="fixed">Fixed Amount</option>
        <option value="bogo">Buy One Get One</option>
      </select>
      <input type="number" placeholder="Value" value={value} onChange={e => setValue(e.target.value)} className="w-full p-2 border rounded text-sm" />
      <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded text-sm" />
      <button type="submit" className="w-full bg-purple-500 text-white p-2 rounded text-sm">Add Discount</button>
    </form>
  );
}

// Policy Editor Component
function PolicyEditor({ merchantType, policies, onUpdate }: { merchantType: string; policies: any; onUpdate: (p: any) => void }) {
  const [localPolicies, setLocalPolicies] = useState(policies);
  
  useEffect(() => { setLocalPolicies(policies); }, [policies]);
  
  const typePolicies = localPolicies[merchantType] || {};
  
  const renderPolicyFields = () => {
    switch (merchantType) {
      case 'restaurant':
        return (
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={typePolicies.complimentaryDrink?.isActive} 
                onChange={e => setLocalPolicies({...localPolicies, restaurant: {...typePolicies, complimentaryDrink: {...typePolicies.complimentaryDrink, isActive: e.target.checked}}})} 
              />
              Complimentary Drink
            </label>
            <input placeholder="Drink Name" value={typePolicies.complimentaryDrink?.item || ''} 
              onChange={e => setLocalPolicies({...localPolicies, restaurant: {...typePolicies, complimentaryDrink: {...typePolicies.complimentaryDrink, item: e.target.value}}})} 
              className="border p-2 rounded"
            />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={typePolicies.takeoutAvailable} 
                onChange={e => setLocalPolicies({...localPolicies, restaurant: {...typePolicies, takeoutAvailable: e.target.checked}})} 
              />
              Takeout Available
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={typePolicies.reservationRequired} 
                onChange={e => setLocalPolicies({...localPolicies, restaurant: {...typePolicies, reservationRequired: e.target.checked}})} 
              />
              Reservation Required
            </label>
          </div>
        );
      case 'hotel':
        return (
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={typePolicies.complimentaryBreakfast} 
                onChange={e => setLocalPolicies({...localPolicies, hotel: {...typePolicies, complimentaryBreakfast: e.target.checked}})} 
              />
              Complimentary Breakfast
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={typePolicies.lateCheckoutAvailable} 
                onChange={e => setLocalPolicies({...localPolicies, hotel: {...typePolicies, lateCheckoutAvailable: e.target.checked}})} 
              />
              Late Checkout Available
            </label>
            <div className="col-span-2">
              <label className="block text-sm">Late Checkout Fee (₹)</label>
              <input type="number" value={typePolicies.lateCheckoutFee || 0} 
                onChange={e => setLocalPolicies({...localPolicies, hotel: {...typePolicies, lateCheckoutFee: Number(e.target.value)}})} 
                className="w-full border p-2 rounded"
              />
            </div>
          </div>
        );
      case 'retail':
        return (
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={typePolicies.acceptsReturns} 
                onChange={e => setLocalPolicies({...localPolicies, retail: {...typePolicies, acceptsReturns: e.target.checked}})} 
              />
              Accepts Returns
            </label>
            <div>
              <label className="block text-sm">Return Window (days)</label>
              <input type="number" value={typePolicies.returnWindowDays || 7} 
                onChange={e => setLocalPolicies({...localPolicies, retail: {...typePolicies, returnWindowDays: Number(e.target.value)}})} 
                className="w-full border p-2 rounded"
              />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={typePolicies.loyaltyPointsEnabled} 
                onChange={e => setLocalPolicies({...localPolicies, retail: {...typePolicies, loyaltyPointsEnabled: e.target.checked}})} 
              />
              Loyalty Points Enabled
            </label>
            <div>
              <label className="block text-sm">Points per ₹100</label>
              <input type="number" value={typePolicies.pointsPerRupee || 1} 
                onChange={e => setLocalPolicies({...localPolicies, retail: {...typePolicies, pointsPerRupee: Number(e.target.value)}})} 
                className="w-full border p-2 rounded"
              />
            </div>
          </div>
        );
      default:
        return <p className="text-gray-500">No specific policies for this merchant type</p>;
    }
  };
  
  return (
    <div className="space-y-4">
      {renderPolicyFields()}
      <button 
        onClick={() => onUpdate(localPolicies)}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Save Policies
      </button>
    </div>
  );
}
