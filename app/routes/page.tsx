"use client"
import { auth } from "../configs/firebase"
import { useState, useEffect } from "react"
import { ProductGrid } from "../components/ui/ui/product-grid"
import { Cart } from "../components/ui/ui/cart"
import { Header } from "../components/ui/ui/header"
import { TransactionHistory } from "../components/ui/ui/transaction-history"
import { CalendarSales } from "../components/ui/ui/calendar-sales"
import { ProductManagement } from "../components/ui/ui/product-management"
import {
    subscribeToTransactions,
    subscribeToStaffTransactions,
    saveTransaction,
} from "../configs/transactionService"
import type { Transaction } from "../configs/transactionService"
import type { Product } from "../configs/productService"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../configs/firebase"

interface User { username: string; role: string; uid: string }
interface CartItem {
    id: string; name: string; price: number
    quantity: number; category: string; image: string
}

export default function POSPage() {
    const [view, setView] = useState<"pos" | "history" | "calendar" | "products">("pos")
    const [cartItems, setCartItems] = useState<CartItem[]>([])
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch Firestore profile to get username + role
                const profileSnap = await getDoc(doc(db, "users", firebaseUser.uid))
                const profile = profileSnap.data()

                const user: User = {
                    uid: firebaseUser.uid,
                    username: profile?.displayName ?? firebaseUser.email ?? "Staff",
                    role: profile?.role ?? "staff",
                }
                setCurrentUser(user)

                // ✅ Admins see ALL, staff see only their own
                const unsubscribeTxn = user.role === "admin"
                    ? subscribeToTransactions(setTransactions)
                    : subscribeToStaffTransactions(firebaseUser.uid, setTransactions)

                return unsubscribeTxn
            } else {
                setCurrentUser(null)
                setTransactions([])
            }
        })
        return () => unsubscribeAuth()
    }, [])

    const handleLogout = () => auth.signOut()

    const handleAddToCart = (product: Product) => {
        const cartItem: Omit<CartItem, "quantity"> = {
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            image: product.imageUrl,
        }
        setCartItems((prev) => {
            const existing = prev.find((item) => item.id === cartItem.id)
            if (existing) {
                return prev.map((item) =>
                    item.id === cartItem.id ? { ...item, quantity: item.quantity + 1 } : item
                )
            }
            return [...prev, { ...cartItem, quantity: 1 }]
        })
    }

    const handleRemoveFromCart = (id: string) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id))
    }

    const handleUpdateQuantity = (id: string, quantity: number) => {
        if (quantity <= 0) { handleRemoveFromCart(id); return }
        setCartItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, quantity } : item))
        )
    }

    const handleClearCart = () => setCartItems([])

    const handleAddTransaction = async (transaction: Omit<Transaction, "id">) => {
        if (!currentUser) return
        try {
            setLoading(true)
            await saveTransaction({
                ...transaction,
                staffId: currentUser.uid,
                staffName: currentUser.username,
            })
            // Show success toast
        } catch (error) {
            console.error("Failed to save transaction:", error)
            // Show error toast to user
        } finally {
            setLoading(false)
        }
    }

    if (!currentUser) return <div className="flex h-screen items-center justify-center">Loading...</div>

    return (
        <div className="flex h-screen flex-col bg-background">
            <Header
                user={currentUser}
                onLogout={handleLogout}
                currentView={view}
                onViewChange={setView}
            />
            {view === "pos" ? (
                <div className="flex flex-1 overflow-hidden">
                    <ProductGrid onAddToCart={handleAddToCart} />
                    <Cart
                        items={cartItems}
                        onRemoveItem={handleRemoveFromCart}
                        onUpdateQuantity={handleUpdateQuantity}
                        onClearCart={handleClearCart}
                        onAddTransaction={handleAddTransaction}
                    />
                </div>
            ) : view === "history" ? (
                <TransactionHistory
                    transactions={transactions.filter((txn) => {
                        const txnDate = new Date(txn.timestamp)
                        const today = new Date()
                        return (
                            txnDate.getFullYear() === today.getFullYear() &&
                            txnDate.getMonth() === today.getMonth() &&
                            txnDate.getDate() === today.getDate()
                        )
                    })}
                    onClose={() => setView("pos")}
                    currentUserRole={currentUser.role}
                    onClearTransactions={() => setTransactions([])}
                />
            ) : view === "calendar" ? (
                <CalendarSales
                    transactions={transactions}
                    currentUserRole={currentUser.role}
                    currentUserName={currentUser.username}
                />
            ) : (
                <ProductManagement
                    onClose={() => setView("pos")}
                />
            )}
        </div>
    )
}