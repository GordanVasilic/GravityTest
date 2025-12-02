import React, { useMemo, useState } from 'react'

const PACKS = [
  { tokens: 5, price: 2.5 },
  { tokens: 10, price: 4.0 },
  { tokens: 25, price: 9.0 },
  { tokens: 50, price: 14.0 },
]

export default function TokensModal({ open, onClose }) {
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  const selectedLabel = useMemo(() => {
    const p = PACKS.find(x => x.tokens === selected)
    if (!p) return ''
    return `Pay $${p.price.toFixed(2)} for ${p.tokens} Tokens`
  }, [selected])

  if (!open) return null

  const createCheckout = async () => {
    if (!selected) return
    try {
      setLoading(true)
      const res = await fetch('http://localhost:8787/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: selected }),
      })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-800">Purchase Tokens</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="text-xs text-gray-600">
            Choose a package. No account required. Tokens are stored in your browser and remain available on the same device.
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            Showing prices in <span className="font-bold">USD ($)</span>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-bold text-gray-700">Select Package:</div>
            <div className="grid grid-cols-2 gap-3">
              {PACKS.map(p => {
                const per = p.price / p.tokens
                const active = selected === p.tokens
                return (
                  <button
                    key={p.tokens}
                    onClick={() => setSelected(p.tokens)}
                    className={`relative text-left p-3 rounded-xl border transition-all ${active ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="text-xs font-bold text-gray-700">{p.tokens} Tokens</div>
                    <div className="text-lg font-black text-gray-900">$ {p.price.toFixed(2)}</div>
                    <div className="text-[11px] text-gray-500">${per.toFixed(2)} per token</div>
                    {p.tokens === 10 && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold text-orange-600">Popular</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Payment is processed via Stripe Checkout.</div>
            <button
              onClick={createCheckout}
              disabled={!selected || loading}
              className="w-full h-10 rounded bg-primary text-white text-sm font-bold hover:bg-orange-700 disabled:opacity-50"
            >
              {selected ? (loading ? 'Loading…' : selectedLabel) : 'Select a package'}
            </button>
            <div className="text-[10px] text-gray-400 text-center">Secured by Stripe</div>
          </div>
        </div>
      </div>
    </div>
  )
}
