'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, 
  MapPin, 
  Truck, 
  CreditCard, 
  Plus, 
  Minus, 
  X, 
  Check, 
  ArrowLeft, 
  Sparkles,
  Info,
  DollarSign
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitRestaurantOrder } from '@/actions/world';

interface StoreClientProps {
  project: any;
}

export default function StoreClient({ project }: StoreClientProps) {
  const content = (project.content as any) || {};
  const products = content.products || [];
  const paymentGateway = content.paymentGateway || 'Razorpay';
  const shipping = content.shipping || 'Free shipping in India';

  // Group products by category
  const categories = Array.from(new Set(products.map((p: any) => p.category || 'Featured')));
  const [activeCategory, setActiveCategory] = React.useState<string>(categories[0] || 'Featured');
  
  // Selected product for buy now checkout
  const [checkoutProduct, setCheckoutProduct] = React.useState<any | null>(null);
  
  // Checkout form
  const [customerName, setCustomerName] = React.useState('');
  const [customerContact, setCustomerContact] = React.useState('');
  const [shippingAddress, setShippingAddress] = React.useState('');
  
  const [orderSubmitted, setOrderSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const filteredProducts = products.filter((p: any) => (p.category || 'Featured') === activeCategory);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutProduct) return;
    if (!customerName.trim() || !customerContact.trim() || !shippingAddress.trim()) {
      return alert('Please fill in your name, contact, and shipping address.');
    }

    setSubmitting(true);

    const orderDetailsText = `E-COMMERCE ORDER:\nProduct Name: ${checkoutProduct.name}\nPrice: ₹${checkoutProduct.price}\nCategory: ${checkoutProduct.category || 'Featured'}\n\nShipping Details:\nAddress: ${shippingAddress.trim()}\n\nPayment Details:\nGateway selected: ${paymentGateway}`;

    const res = await submitRestaurantOrder({
      projectId: project.id,
      customerName: customerName.trim(),
      customerContact: customerContact.trim(),
      orderDetails: orderDetailsText,
      totalPrice: checkoutProduct.price
    });

    if (res.success) {
      setCheckoutProduct(null);
      setShippingAddress('');
      setOrderSubmitted(true);
    } else {
      alert('Order submission failed: ' + res.error);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 relative selection:bg-primary selection:text-white">
      {/* Background glow decoration */}
      <div className="absolute top-0 right-10 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-4xl mx-auto px-4 pt-6 relative z-10">
        
        {/* Navigation */}
        <Link href="/world" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-800/80 mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Tolee World
        </Link>

        {/* Store Profile Header Card */}
        <div className="bg-zinc-900/40 border border-zinc-850 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl mb-8">
          {project.bannerImage ? (
            <div className="w-full h-52 md:h-64 relative bg-zinc-950">
              <img src={project.bannerImage} alt={project.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent"></div>
            </div>
          ) : (
            <div className="w-full h-44 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-90 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
              <ShoppingBag className="w-14 h-14 text-white/30 animate-pulse" />
            </div>
          )}

          <div className="p-6 md:p-8 relative -mt-10 bg-zinc-900/60 backdrop-blur-md rounded-t-3xl border-t border-zinc-850">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase text-[9px] font-extrabold px-2 py-0.5 rounded">
                    E-Commerce Store
                  </Badge>
                  {project.locationText && (
                    <Badge variant="outline" className="text-zinc-400 border-zinc-800 text-[10px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-purple-400" /> {project.locationText}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{project.name}</h1>
                <p className="text-xs text-zinc-450 mt-1 max-w-xl">{project.description || 'Welcome to our digital boutique storefront.'}</p>
                <div className="flex flex-wrap gap-4 mt-4 text-[11px] text-zinc-450 items-center bg-zinc-950/60 w-fit px-3 py-2 border border-zinc-850 rounded-xl">
                  <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-emerald-400" /> {shipping}</span>
                  <span className="text-zinc-700">•</span>
                  <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-blue-400" /> Pay with {paymentGateway}</span>
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
                    ? 'bg-purple-600/10 border-purple-500 text-purple-400'
                    : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Product Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProducts.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-zinc-900/10 border border-zinc-850 rounded-2xl">
              <ShoppingBag className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-500 text-xs">No products in this category yet.</p>
            </div>
          ) : (
            filteredProducts.map((prod: any) => (
              <Card key={prod.id} className="bg-zinc-900/30 border border-zinc-850 hover:border-zinc-800 transition-all rounded-2xl overflow-hidden flex flex-col justify-between group">
                <div>
                  {prod.image ? (
                    <div className="w-full h-48 relative overflow-hidden bg-zinc-950 border-b border-zinc-850/50">
                      <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-zinc-900/40 border-b border-zinc-850/50 flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10 text-zinc-800" />
                    </div>
                  )}
                  <div className="p-5 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-base text-white truncate">{prod.name}</h3>
                      <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-800 uppercase">{prod.category}</Badge>
                    </div>
                    {prod.desc && <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{prod.desc}</p>}
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-zinc-850/50 flex justify-between items-center bg-zinc-950/20">
                  <span className="text-lg font-extrabold text-purple-400">₹{prod.price}</span>
                  <Button 
                    size="sm" 
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl h-9 px-4 active:scale-95 transition-transform shadow-lg shadow-purple-600/10"
                    onClick={() => setCheckoutProduct(prod)}
                  >
                    Buy Now
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* E-Commerce Checkout Dialog */}
        <Dialog open={!!checkoutProduct} onOpenChange={(open) => !open && setCheckoutProduct(null)}>
          <DialogContent className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-purple-400" /> Store Checkout
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">Review purchase details and input shipping information to securely send your order to the seller.</DialogDescription>
            </DialogHeader>

            {checkoutProduct && (
              <form onSubmit={handlePlaceOrder} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name" className="text-xs text-zinc-400 font-bold">Full Name</Label>
                  <Input 
                    id="customer-name" 
                    value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)} 
                    required
                    placeholder="e.g. Ramesh Kumar" 
                    className="bg-zinc-950 border-zinc-800 rounded-xl text-white text-xs h-10" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer-contact" className="text-xs text-zinc-400 font-bold">Contact Phone Number</Label>
                  <Input 
                    id="customer-contact" 
                    value={customerContact} 
                    onChange={(e) => setCustomerContact(e.target.value)} 
                    required
                    placeholder="e.g. +91 9988776655" 
                    className="bg-zinc-950 border-zinc-800 rounded-xl text-white text-xs h-10" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipping-address" className="text-xs text-zinc-400 font-bold">Shipping Address</Label>
                  <textarea 
                    id="shipping-address" 
                    value={shippingAddress} 
                    onChange={(e) => setShippingAddress(e.target.value)} 
                    required
                    placeholder="Provide full home address with postal code..." 
                    rows={3}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl text-xs space-y-2 font-sans">
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Product Purchased:</span>
                    <span className="font-bold text-white">{checkoutProduct.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Shipping Policy:</span>
                    <span className="text-emerald-400 font-semibold">{shipping}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Payment Gateway:</span>
                    <span className="text-blue-400 font-mono">{paymentGateway}</span>
                  </div>
                  <div className="border-t border-zinc-800 pt-2 flex justify-between items-center font-bold text-white text-sm">
                    <span>Total Amount</span>
                    <span className="text-purple-400">₹{checkoutProduct.price}</span>
                  </div>
                </div>

                <DialogFooter className="pt-4 flex flex-row items-center justify-end gap-2 border-t border-zinc-800">
                  <Button type="button" variant="ghost" className="text-zinc-400 hover:text-white rounded-xl text-xs h-10 px-4" onClick={() => setCheckoutProduct(null)}>Cancel</Button>
                  <Button type="submit" disabled={submitting} className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold h-10 px-5 shadow-lg shadow-purple-600/10">
                    {submitting ? 'Processing...' : 'Place Secure Order'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Order success confirmation dialog */}
        <Dialog open={orderSubmitted} onOpenChange={setOrderSubmitted}>
          <DialogContent className="bg-zinc-900 border border-zinc-850 text-white rounded-2xl max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-white mb-2">Order Placed Successfully!</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 leading-relaxed">
              Your order has been recorded. The store owner has been notified and will verify delivery details with you shortly. Thank you for shopping local!
            </DialogDescription>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold h-10 mt-6" onClick={() => setOrderSubmitted(false)}>
              Continue Shopping
            </Button>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
