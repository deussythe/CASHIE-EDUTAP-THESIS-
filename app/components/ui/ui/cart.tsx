"use client"

import { Trash2, Plus, Minus, CreditCard } from "lucide-react"
import { CheckoutDialog } from "./checkout-dialog"
import { useState } from "react"
import { ScrollArea } from "./scroll-area"
import { Card } from "./card"
import { Button } from "./button"
import { Separator } from "./separator"

interface CartItem {
    id: string
    name: string
    price: number
    quantity: number
    category: string
    image: string
}

interface CartProps {
    items: CartItem[]
    onRemoveItem: (id: string) => void
    onUpdateQuantity: (id: string, quantity: number) => void
    onClearCart: () => void
    onAddTransaction: (transaction: any) => void
}

export function Cart({ items, onRemoveItem, onUpdateQuantity, onClearCart, onAddTransaction }: CartProps) {
    const [showCheckout, setShowCheckout] = useState(false)

    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0)
    const tax = subtotal * 0.08
    const total = subtotal + tax

    const handleCheckout = () => {
        setShowCheckout(true)
    }

    const handleCheckoutComplete = () => {
        onClearCart()
        setShowCheckout(false)
    }

    return (
        <>
            <div className="flex h-full w-full flex-col border-l bg-card md:w-96">
                <div className="border-b p-4">
                    <h2 className="text-lg font-semibold">Current Order</h2>
                    <p className="text-sm text-muted-foreground">{items.length} items</p>
                </div>

                <ScrollArea className="flex-1 overflow-auto p-4">
                    {items.length === 0 ? (
                        <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                            <CreditCard className="mb-3 h-12 w-12" />
                            <p className="font-medium">No items in cart</p>
                            <p className="text-sm">Add products to start an order</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <Card key={item.id} className="p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-2xl">
                                            {item.image}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-medium text-card-foreground">{item.name}</h3>
                                            <p className="text-sm font-semibold text-primary">₱{item.price.toFixed(2)}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemoveItem(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 bg-transparent"
                                                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 bg-transparent"
                                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <p className="font-semibold">₱{(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="border-t p-4">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium">₱{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax (8%)</span>
                            <span className="font-medium">₱{tax.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg">
                            <span className="font-semibold">Total</span>
                            <span className="font-bold text-primary">₱{total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        <Button className="w-full" size="lg" disabled={items.length === 0} onClick={handleCheckout}>
                            <CreditCard className="mr-2 h-5 w-5" />
                            Checkout
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full bg-transparent"
                            disabled={items.length === 0}
                            onClick={onClearCart}
                        >
                            Clear Cart
                        </Button>
                    </div>
                </div>
            </div>

            <CheckoutDialog
                open={showCheckout}
                onClose={() => setShowCheckout(false)}
                onComplete={handleCheckoutComplete}
                total={total}
                items={items}
                onAddTransaction={onAddTransaction}
            />
        </>
    )
}
