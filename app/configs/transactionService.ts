import { db } from "./firebase"
import {
    collection, addDoc, onSnapshot,
    query, orderBy, where, doc, getDoc,
    updateDoc, increment, getDocs  
} from "firebase/firestore"

export interface Transaction {
    id?: string
    items: {
        id: string
        studentId?: string
        name: string
        price: number
        quantity: number
        category: string
        image: string
    }[]
    total: number
    subtotal: number
    tax: number
    amountPaid: number
    change: number
    staffName: string
    staffId: string
    paymentMethod: string
    timestamp: number
}

// ✅ NEW: Logic to check student balance and deduct money

export const processRFIDPayment = async (studentId: string, total: number) => {
    try {
        const studentRef = doc(db, "students", studentId)
        const studentSnap = await getDoc(studentRef)

        if (!studentSnap.exists()) {
            return { success: false, message: "Student record not found in Firestore." }
        }

        const studentData = studentSnap.data()
        const currentBalance = studentData.balance

        if (currentBalance < total) {
            return { success: false, message: "Insufficient balance for this transaction." }
        }

        // ✅ Daily spending limit check
        const dailyLimit = studentData.dailyLimit ?? null

        if (dailyLimit !== null) {
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)
            const startTimestamp = startOfToday.getTime()

            const txnSnap = await getDocs(
                query(
                    collection(db, "transactions"),
                    where("studentId", "==", studentId),
                    where("timestamp", ">=", startTimestamp)
                )
            )

            const todaySpent = txnSnap.docs.reduce((sum, d) => sum + (d.data().total || 0), 0)

            if (todaySpent + total > dailyLimit) {
                return {
                    success: false,
                    message: `Daily spending limit of ₱${dailyLimit} reached. Spent today: ₱${todaySpent.toFixed(2)}`
                }
            }
        }

        // Deduct the amount
        await updateDoc(studentRef, {
            balance: increment(-total)
        })

        return { success: true, newBalance: currentBalance - total }

    } catch (error) {
        console.error("RFID Payment Error:", error)
        return { success: false, message: "Database connection error." }
    }
}

// All transactions (admin view) [cite: 2]
export const subscribeToTransactions = (callback: (transactions: Transaction[]) => void) => {
    const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"))
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Transaction[]
        callback(data)
    })
}

// Staff-filtered transactions [cite: 3, 4]
export const subscribeToStaffTransactions = (staffId: string, callback: (transactions: Transaction[]) => void) => {
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

// Save transaction to history [cite: 5]
export const saveTransaction = async (transaction: Omit<Transaction, "id">) => {
    await addDoc(collection(db, "transactions"), {
        ...transaction,
        timestamp: Date.now(),
    })
}
// Fetch transactions for a specific student (Parent View)
export const subscribeToStudentTransactions = (
    studentId: string,
    callback: (transactions: Transaction[]) => void
) => {
    const q = query(
        collection(db, "transactions"),
        where("studentId", "==", studentId), // Filters only their child's spendings
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