import { db } from "./firebase"
import {
    collection, addDoc, onSnapshot,
    query, orderBy, where, doc, getDoc, updateDoc, increment
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
        const studentRef = doc(db, "students", studentId);
        const studentSnap = await getDoc(studentRef);

        if (!studentSnap.exists()) {
            return { success: false, message: "Student record not found in Firestore." };
        }

        const currentBalance = studentSnap.data().balance;

        if (currentBalance < total) {
            return { success: false, message: "Insufficient balance for this transaction." };
        }

        // Deduct the amount from student's account
        await updateDoc(studentRef, {
            balance: increment(-total)
        })

        return { success: true, newBalance: currentBalance - total };
    } catch (error) {
        console.error("RFID Payment Error:", error);
        return { success: false, message: "Database connection error." };
    }
};

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