import { db } from "./firebase"
import {
    collection, addDoc, onSnapshot,
    query, orderBy, where, Timestamp
} from "firebase/firestore"

export interface Transaction {
    id?: string
    items: {
        id: string
        name: string
        price: number
        quantity: number
        category: string
        image: string
    }[]
    total: number
    subtotal: number
    tax: number
    amountPaid: number    // ✅ only this, no cashReceived
    change: number
    staffName: string
    staffId: string
    paymentMethod: string
    timestamp: number
}

// All transactions (admin view)
export const subscribeToTransactions = (
    callback: (transactions: Transaction[]) => void
) => {
    const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"))
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Transaction[]
        callback(data)
    })
}

// ✅ NEW: Staff-filtered transactions
export const subscribeToStaffTransactions = (
    staffId: string,
    callback: (transactions: Transaction[]) => void
) => {
    const q = query(
        collection(db, "transactions"),
        where("staffId", "==", staffId),
        orderBy("timestamp", "desc")
    )
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Transaction[]
        callback(data)
    })
}

export const saveTransaction = async (transaction: Omit<Transaction, "id">) => {
    await addDoc(collection(db, "transactions"), {
        ...transaction,
        timestamp: Date.now(),
    })
}