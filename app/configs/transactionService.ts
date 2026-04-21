import { db } from "./firebase"
import {
    collection, addDoc, onSnapshot,
    query, orderBy, where, doc, getDoc,
    updateDoc, increment, getDocs, runTransaction
} from "firebase/firestore"

export interface Transaction {
    id?: string
    transactionNumber?: string
    studentNumber?: string
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
                    where("studentNumber", "==", studentData.studentNumber),
                    where("timestamp", ">=", startTimestamp)
                )
            )

            const todaySpent = txnSnap.docs.reduce((sum, d) => sum + (d.data().total || 0), 0)

            if (todaySpent + total > dailyLimit) {
                await addDoc(collection(db, "notifications"), {
                    guardianId: studentData.guardianId,
                    studentName: studentData.name,
                    studentNumber: studentData.studentNumber,
                    type: "limit_exceeded",
                    message: `${studentData.name} tried to purchase ₱${total.toFixed(2)} but has reached the daily limit of ₱${dailyLimit}. Spent today: ₱${todaySpent.toFixed(2)}`,
                    attemptedAmount: total,
                    dailyLimit,
                    todaySpent,
                    read: false,
                    timestamp: Date.now(),
                })

                return {
                    success: false,
                    message: `Daily spending limit of ₱${dailyLimit} reached. Spent today: ₱${todaySpent.toFixed(2)}`
                }
            }
        }

        await updateDoc(studentRef, {
            balance: increment(-total)
        })

        const newBalance = currentBalance - total
        return { success: true, newBalance }

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

// ✅ Uses atomic Firestore transaction to avoid race condition + returns transactionNumber
export const saveTransaction = async (transaction: Omit<Transaction, "id">) => {
    const counterRef = doc(db, "counters", "transactions")

    const transactionNumber = await runTransaction(db, async (t) => {
        const counterSnap = await t.get(counterRef)
        const currentCount = counterSnap.exists() ? (counterSnap.data().count ?? 0) : 0
        const newCount = currentCount + 1
        t.set(counterRef, { count: newCount })
        return `TXN-${String(newCount).padStart(5, "0")}`
    })

    await addDoc(collection(db, "transactions"), {
        ...transaction,
        transactionNumber,
        timestamp: Date.now(),
        status: "Completed",
    })

    return transactionNumber // ✅ return so UI can display it
}

export const subscribeToStudentTransactions = (
    studentNumber: string,
    callback: (transactions: Transaction[]) => void
) => {
    const q = query(
        collection(db, "transactions"),
        where("studentNumber", "==", studentNumber),
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