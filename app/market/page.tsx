'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMarketPrices, buyCommodityUnits, sellCommodityUnits, getSpecimenListings, buySpecimenListing } from '@/app/actions/market';
import { METALS } from '@/lib/game/constants';

export default function MarketPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'commodity' | 'specimens'>('commodity');

  const loadMarket = useCallback(async (sector: string) => {
    try {
      const marketPrices = await getMarketPrices(sector);
      setPrices(marketPrices);
      const marketListings = await getSpecimenListings();
      setListings(marketListings);
    } catch (err) {
      console.error('Error loading market:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);
    loadMarket(userData.sector);
  }, [router, loadMarket]);

  const handleBuyCommodity = async (metalType: string, units: number) => {
    if (!user) return;
    try {
      await buyCommodityUnits(user.id, metalType as any, units);
      alert('Purchase successful');
    } catch (err: any) {
      alert(err.message || 'Purchase failed');
    }
  };

  const handleSellCommodity = async (metalType: string, units: number) => {
    if (!user) return;
    try {
      await sellCommodityUnits(user.id, metalType as any, units);
      alert('Sale successful');
    } catch (err: any) {
      alert(err.message || 'Sale failed');
    }
  };

  const handleBuySpecimen = async (listingId: string) => {
    if (!user) return;
    try {
      await buySpecimenListing(user.id, listingId);
      alert('Purchase successful');
      await loadMarket(user.sector);
    } catch (err: any) {
      alert(err.message || 'Purchase failed');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Market (Sector {user?.sector})</h1>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('commodity')}
            className={`px-4 py-2 rounded ${activeTab === 'commodity' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            Commodities
          </button>
          <button
            onClick={() => setActiveTab('specimens')}
            className={`px-4 py-2 rounded ${activeTab === 'specimens' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            Specimens
          </button>
        </div>

        {activeTab === 'commodity' && (
          <div className="bg-gray-800 p-6 rounded">
            <h2 className="text-2xl font-bold mb-4">Commodity Prices</h2>
            <div className="space-y-4">
              {Object.entries(METALS).map(([metalType, metal]) => {
                const basePrice = prices[metalType] || metal.basePrice;
                const bidPrice = basePrice * 0.99;
                const askPrice = basePrice * 1.01;

                return (
                  <div key={metalType} className="bg-gray-700 p-4 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div className="font-bold">{metal.name} ({metalType})</div>
                        <div className="text-sm text-gray-400">
                          Base: {basePrice.toFixed(2)} | Bid: {bidPrice.toFixed(2)} | Ask: {askPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const units = prompt('Enter units to buy:');
                            if (units) handleBuyCommodity(metalType, parseInt(units));
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                        >
                          Buy
                        </button>
                        <button
                          onClick={() => {
                            const units = prompt('Enter units to sell:');
                            if (units) handleSellCommodity(metalType, parseInt(units));
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'specimens' && (
          <div className="bg-gray-800 p-6 rounded">
            <h2 className="text-2xl font-bold mb-4">Specimen Listings</h2>
            {listings.length === 0 ? (
              <div className="text-gray-400">No active listings</div>
            ) : (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <div key={listing.id} className="bg-gray-700 p-4 rounded">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">Listing by {listing.user.username}</div>
                        <div className="text-sm text-gray-400">Price: {listing.price} credits</div>
                      </div>
                      <button
                        onClick={() => handleBuySpecimen(listing.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

