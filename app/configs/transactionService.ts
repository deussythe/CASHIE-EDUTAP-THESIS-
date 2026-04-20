import { db } from "./firebase"
import {
    collection, addDoc, onSnapshot,
    query, orderBy, where, doc, getDoc,
    updateDoc, increment, getDocs
} from "firebase/firestore"

export interface Transaction {
    id?: string
    transactionNumber?: string
    studentNumber?: string  // ✅ renamed from studentId
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
    amountPaid: number
    change: number
    staffName: string
    staffId: string
    paymentMethod: string
    timestamp: number
    status: "Completed" | "Pending" | "Canceled"
}


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

        await updateDoc(studentRef, {
            balance: increment(-total)
        })

        return { success: true, newBalance: currentBalance - total }

    } catch (error) {
        console.error("RFID Payment Error:", error)
        return { success: false, message: "Database connection error." }
    }
}

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

// ✅ saveTransaction now auto-generates transactionNumber
export const saveTransaction = async (transaction: Omit<Transaction, "id">) => {
    const snapshot = await getDocs(collection(db, "transactions"))
    const count = snapshot.size + 1
    const transactionNumber = `TXN-${String(count).padStart(5, "0")}`

    await addDoc(collection(db, "transactions"), {
        ...transaction,
        transactionNumber,
        timestamp: Date.now(),
        status: "Completed",
    })
}

export const subscribeToStudentTransactions = (
    studentNumber: string,
    callback: (transactions: Transaction[]) => void
) => {
    const q = query(
        collection(db, "transactions"),
        where("studentNumber", "==", studentNumber),  // ✅ renamed
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