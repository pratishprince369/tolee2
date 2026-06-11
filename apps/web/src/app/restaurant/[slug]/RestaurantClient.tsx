'use client';

import React from 'react';
import Link from 'next/link';
import { 
  UtensilsCrossed, 
  MapPin, 
  Clock, 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  Check, 
  ArrowLeft, 
  Sparkles,
  ShoppingBag,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitRestaurantOrder } from '@/actions/world';

interface RestaurantClientProps {
  project: any;
}

export default function RestaurantClient({ project }: RestaurantClientProps) {
  const content = (project.content as any) || {};
  const dishes = content.dishes || [];
  const hours = content.hours || '11:00 AM - 11:00 PM';

  // Group dishes by category
  const categories = Array.from(new Set(dishes.map((d: any) => d.category || 'Specialities')));
  const [activeCategory, setActiveCategory] = React.useState<string>(categories[0] || 'Specialities');
  
  // Cart state: key is dish.id, value is quantity
  const [cart, setCart] = React.useState<{ [key: string]: number }>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  
  // Checkout form
  const [customerName, setCustomerName] = React.useState('');
  const [customerContact, setCustomerContact] = React.useState('');
  const [orderSubmitted, setOrderSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const filteredDishes = dishes.filter((d: any) => (d.category || 'Specialities') === activeCategory);

  const updateQuantity = (dishId: string, delta: number) => {
    setCart(prev => {
      const current = prev[dishId] || 0;
      const next = current + delta;
      const updated = { ...prev };
      if (next <= 0) {
        delete updated[dishId];
      } else {
        updated[dishId] = next;
      }
      return updated;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const dish = dishes.find((d: any) => d.id === id);
      return sum + (dish ? dish.price * qty : 0);
    }, 0);
  };

  const getCartCount = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerContact.trim()) {
      return alert('Please fill in your name and contact number.');
    }

    setSubmitting(true);

    const itemsSummary = Object.entries(cart).map(([id, qty]) => {
      const dish = dishes.find((d: any) => d.id === id);
      return dish ? `- ${dish.name} (x${qty}) - ₹${dish.price * qty}` : '';
    }).filter(Boolean).join('\n');

    const total = getCartTotal();
    const orderDetailsText = `Order Items:\n${itemsSummary}\n\nTotal Price: ₹${total}`;

    const res = await submitRestaurantOrder({
      projectId: project.id,
      customerName: customerName.trim(),
      customerContact: customerContact.trim(),
      orderDetails: orderDetailsText,
      totalPrice: total
    });

    if (res.success) {
      setCart({});
      setOrderSubmitted(true);
    } else {
      alert('Order submission failed: ' + res.error);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-28 relative selection:bg-primary selection:text-white">
      {/* Background glow decoration */}
      <div className="absolute top-0 right-10 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-4xl mx-auto px-4 pt-6 relative z-10">
        
        {/* Navigation */}
        <Link href="/world" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-800/80 mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Tolee World
        </Link>

        {/* Restaurant Profile Cover & Header */}
        <div className="bg-zinc-900/40 border border-zinc-850 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl mb-8">
          {project.bannerImage ? (
            <div className="w-full h-52 md:h-64 relative bg-zinc-950">
              <img src={project.bannerImage} alt={project.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent"></div>
            </div>
          ) : (
            <div className="w-full h-44 bg-gradient-to-r from-rose-600 to-amber-600 opacity-90 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
              <UtensilsCrossed className="w-14 h-14 text-white/30 animate-pulse" />
            </div>
          )}

          <div className="p-6 md:p-8 relative -mt-10 bg-zinc-900/60 backdrop-blur-md rounded-t-3xl border-t border-zinc-850">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase text-[9px] font-extrabold px-2 py-0.5 rounded">
                    Restaurant Partner
                  </Badge>
                  {project.locationText && (
                    <Badge variant="outline" className="text-zinc-400 border-zinc-800 text-[10px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400" /> {project.locationText}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{project.name}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-zinc-400 items-center">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-zinc-500" /> Hours: {hours}</span>
                  <span className="text-zinc-600">|</span>
                  <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-yellow-500" /> Premium Local Eatery</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Navigation Bar */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-zinc-900 scrollbar-thin">
            {categories.map((cat: string) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-rose-600/10 border-rose-500 text-rose-400'
                    : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filteredDishes.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-zinc-900/10 border border-zinc-850 rounded-2xl">
              <UtensilsCrossed className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-500 text-xs">No menu dishes added in this category yet.</p>
            </div>
          ) : (
            filteredDishes.map((dish: any) => {
              const qty = cart[dish.id] || 0;
              return (
                <Card key={dish.id} className="bg-zinc-900/30 border border-zinc-850 hover:border-zinc-800 transition-all rounded-2xl overflow-hidden flex flex-col justify-between">
                  <div className="p-4 flex gap-4">
                    {dish.image && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-850 flex-shrink-0">
                        <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="space-y-1 flex-1">
                      <h3 className="font-bold text-sm text-white">{dish.name}</h3>
                      {dish.desc && <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{dish.desc}</p>}
                      <p className="text-xs font-extrabold text-rose-400 pt-1">₹{dish.price}</p>
                    </div>
                  </div>

                  <div className="bg-zinc-950/40 px-4 py-3 border-t border-zinc-850/50 flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{dish.category}</span>
                    {qty > 0 ? (
                      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                        <button onClick={() => updateQuantity(dish.id, -1)} className="w-6 h-6 rounded-md hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="text-xs font-bold w-4 text-center">{qty}</span>
                        <button onClick={() => updateQuantity(dish.id, 1)} className="w-6 h-6 rounded-md hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-xs font-bold rounded-lg px-3 py-1.5 h-7"
                        onClick={() => updateQuantity(dish.id, 1)}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Floating Cart Bar */}
        {getCartCount() > 0 && (
          <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-auto md:w-[600px] md:translate-x-0 mx-auto bg-gradient-to-r from-rose-700 to-pink-700 text-white p-4 rounded-2xl shadow-xl shadow-rose-950/20 flex justify-between items-center z-40 animate-in fade-in-20 slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl relative">
                <ShoppingCart className="w-5 h-5 text-white" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-rose-700 text-[10px] font-extrabold rounded-full flex items-center justify-center shadow">
                  {getCartCount()}
                </span>
              </div>
              <div>
                <p className="text-xs text-white/80 font-bold">Total price to pay</p>
                <p className="text-base font-extrabold">₹{getCartTotal()}</p>
              </div>
            </div>
            <Button 
              className="bg-white hover:bg-white/95 text-rose-700 rounded-xl font-bold h-11 px-5"
              onClick={() => setIsCheckoutOpen(true)}
            >
              Order Now
            </Button>
          </div>
        )}

        {/* Checkout Dialog */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-rose-400" /> Complete Chef Order
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">Provide details to directly notify the restaurant owner. They will accept and cook your order.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePlaceOrder} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name" className="text-xs text-zinc-400 font-bold">Your Name</Label>
                <Input 
                  id="customer-name" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  required
                  placeholder="e.g. Anand Phadke" 
                  className="bg-zinc-950 border-zinc-800 rounded-xl text-white text-xs h-10" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-contact" className="text-xs text-zinc-400 font-bold">Your Phone / WhatsApp Number</Label>
                <Input 
                  id="customer-contact" 
                  value={customerContact} 
                  onChange={(e) => setCustomerContact(e.target.value)} 
                  required
                  placeholder="e.g. +91 9876543210" 
                  className="bg-zinc-950 border-zinc-800 rounded-xl text-white text-xs h-10" 
                />
              </div>

              <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl text-xs space-y-2">
                <p className="font-bold text-zinc-300">Items Ordered:</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {Object.entries(cart).map(([id, qty]) => {
                    const dish = dishes.find((d: any) => d.id === id);
                    return dish ? (
                      <div key={id} className="flex justify-between items-center text-zinc-400 font-mono text-[11px]">
                        <span>{dish.name} (x{qty})</span>
                        <span>₹{dish.price * qty}</span>
                      </div>
                    ) : null;
                  })}
                </div>
                <div className="border-t border-zinc-800 pt-2 flex justify-between items-center font-bold text-white text-sm">
                  <span>Grand Total</span>
                  <span className="text-rose-400">₹{getCartTotal()}</span>
                </div>
              </div>

              <DialogFooter className="pt-4 flex flex-row items-center justify-end gap-2 border-t border-zinc-800">
                <Button type="button" variant="ghost" className="text-zinc-400 hover:text-white rounded-xl text-xs h-10 px-4" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold h-10 px-5 shadow-lg shadow-rose-600/10">
                  {submitting ? 'Submitting...' : 'Confirm Order'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Order success confirmation dialog */}
        <Dialog open={orderSubmitted} onOpenChange={setOrderSubmitted}>
          <DialogContent className="bg-zinc-900 border border-zinc-850 text-white rounded-2xl max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-white mb-2">Order Submitted!</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 leading-relaxed">
              Your order was placed successfully. The restaurant owner has been notified and will verify/contact you on your number shortly.
            </DialogDescription>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold h-10 mt-6" onClick={() => { setOrderSubmitted(false); setIsCheckoutOpen(false); }}>
              Back to Menu
            </Button>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
