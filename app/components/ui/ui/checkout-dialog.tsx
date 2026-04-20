"use client"

import { useState, useEffect, useRef } from "react"
import { CreditCard, Banknote, CheckCircle2, X } from "lucide-react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "../../../configs/firebase"
import { processRFIDPayment } from "../../../configs/transactionService"

interface CartItem {
    id: string
    name: string
    price: number
    quantity: number
    category: string
    image: string
}

interface CheckoutDialogProps {
    open: boolean
    onClose: () => void
    onComplete: () => void
    total: number
    items: CartItem[]
    onAddTransaction: (transaction: any) => void
    studentNumber?: string  // ✅ renamed from studentId
}

export function CheckoutDialog({ open, onClose, onComplete, total, items, onAddTransaction, studentNumber }: CheckoutDialogProps) {
    const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card")
    const [cashReceived, setCashReceived] = useState("")
    const [processing, setProcessing] = useState(false)
    const [success, setSuccess] = useState(false)
    const [waitingForCard, setWaitingForCard] = useState(false)
    const [cardError, setCardError] = useState("")
    const rfidInputRef = useRef<HTMLInputElement>(null)

    const getCashAmount = () => Number.parseFloat(cashReceived || "0")
    const calculateChange = () => {
        if (paymentMethod !== "cash") return 0
        return Math.max(0, getCashAmount() - total)
    }
    const isSufficientCash = () => getCashAmount() >= total
    const change = calculateChange()

    useEffect(() => {
        if (waitingForCard) {
            setTimeout(() => rfidInputRef.current?.focus(), 100)
        }
    }, [waitingForCard])

    const handleComplete = async () => {
        if (paymentMethod === "card") {
            setWaitingForCard(true)
            setCardError("")
            return
        }

        setProcessing(true)
        await new Promise((resolve) => setTimeout(resolve, 1500))

        onAddTransaction({
            items: items.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                category: item.category,
                image: item.image,
            })),
            subtotal: parseFloat((total / 1.08).toFixed(2)),
            tax: parseFloat((total - total / 1.08).toFixed(2)),
            total,
            paymentMethod: "cash",
            amountPaid: getCashAmount(),
            change,
            staffName: "",
            staffId: "",
            studentNumber: "",  // ✅ cash = anonymous, was studentId: studentId || ""
            timestamp: Date.now(),
            status: "Completed" as const,
        })

        setSuccess(true)
        setTimeout(() => {
            setProcessing(false)
            setSuccess(false)
            setCashReceived("")
            setPaymentMethod("card")
            onComplete()
        }, 2000)
    }

    const handleRFIDKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return
        const rfidSerial = e.currentTarget.value
        if (!rfidSerial) return

        const input = e.currentTarget
        setProcessing(true)
        setCardError("")

        try {
            const studentSnap = await getDocs(
                query(collection(db, "students"), where("rfidSerial", "==", rfidSerial))
            )

            if (studentSnap.empty) {
                setCardError("Student not found!")
                setProcessing(false)
                input.value = ""
                return
            }

            const studentDoc = studentSnap.docs[0]
            const foundStudentId = studentDoc.id
            const foundStudentNumber = studentDoc.data().studentNumber  // ✅ fetch studentNumber field

            const result = await processRFIDPayment(foundStudentId, total)

            if (!result.success) {
                setCardError(result.message || "Payment failed.")
                setProcessing(false)
                input.value = ""
                return
            }

            onAddTransaction({
                items: items.map((item) => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    category: item.category,
                    image: item.image,
                })),
                subtotal: parseFloat((total / 1.08).toFixed(2)),
                tax: parseFloat((total - total / 1.08).toFixed(2)),
                total,
                paymentMethod: "RFID",           // ✅ was "card"
                amountPaid: total,
                change: 0,
                staffName: "",
                staffId: "",
                studentNumber: foundStudentNumber,  // ✅ was studentNumber (from prop, now from Firebase)
                timestamp: Date.now(),
                status: "Completed" as const,
            })

            setWaitingForCard(false)
            setSuccess(true)
            setTimeout(() => {
                setProcessing(false)
                setSuccess(false)
                setCashReceived("")
                setPaymentMethod("card")
                onComplete()
            }, 2000)

        } catch (err) {
            setCardError("Something went wrong. Try again.")
            setProcessing(false)
        }

        input.value = ""
    }

    const handleClose = () => {
        if (!processing && !success) {
            setWaitingForCard(false)
            setCashReceived("")
            setPaymentMethod("card")
            onClose()
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 disabled:pointer-events-none"
                    disabled={processing || success}
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-semibold">
                        {waitingForCard ? "Tap Your Card" : "Complete Payment"}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {waitingForCard
                            ? "Please tap your RFID card on the reader"
                            : "Select payment method and complete the transaction"}
                    </p>
                </div>

                {waitingForCard ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <input
                            ref={rfidInputRef}
                            onKeyDown={handleRFIDKeyDown}
                            className="absolute opacity-0 pointer-events-none"
                            autoFocus
                        />
                        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 animate-pulse">
                            <CreditCard className="h-12 w-12 text-blue-600" />
                        </div>
                        <h3 className="mb-2 text-xl font-semibold">
                            {processing ? "Processing..." : "Waiting for Card"}
                        </h3>
                        <p className="text-center text-gray-500 mb-4">Tap your RFID card to complete payment</p>
                        {cardError && (
                            <p className="text-sm text-red-600 mb-4">{cardError}</p>
                        )}
                        <div className="rounded-lg border bg-gray-50 p-4 w-full">
                            <div className="flex justify-between">
                                <span className="text-lg font-medium">Amount to Pay</span>
                                <span className="text-2xl font-bold text-blue-600">₱{total.toFixed(2)}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setWaitingForCard(false)}
                            className="mt-4 text-sm text-gray-600 hover:text-gray-800 underline"
                        >
                            Cancel
                        </button>
                    </div>
                ) : success ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="mb-2 text-xl font-semibold">Payment Successful!</h3>
                        <p className="text-gray-500">Transaction completed</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <label className="mb-3 block text-sm font-medium">Payment Method</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    className={`flex h-20 flex-col items-center justify-center gap-2 rounded-lg border-2 transition-colors ${paymentMethod === "card" ? "border-black bg-black text-white" : "border-gray-300 bg-white hover:bg-gray-50"}`}
                                    onClick={() => setPaymentMethod("card")}
                                >
                                    <CreditCard className="h-6 w-6" />
                                    <span>Card</span>
                                </button>
                                <button
                                    className={`flex h-20 flex-col items-center justify-center gap-2 rounded-lg border-2 transition-colors ${paymentMethod === "cash" ? "border-black bg-black text-white" : "border-gray-300 bg-white hover:bg-gray-50"}`}
                                    onClick={() => setPaymentMethod("cash")}
                                >
                                    <Banknote className="h-6 w-6" />
                                    <span>Cash</span>
                                </button>
                            </div>
                        </div>

                        {paymentMethod === "cash" && (
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="cash-received" className="block text-sm font-medium mb-1.5">
                                        Cash Received
                                    </label>
                                    <input
                                        id="cash-received"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={cashReceived}
                                        onChange={(e) => setCashReceived(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                </div>
                                {cashReceived && (
                                    <div className={`rounded-lg border p-3 ${isSufficientCash() ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                                        {isSufficientCash() ? (
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-green-700">Change Due</span>
                                                <span className="text-xl font-bold text-green-700">₱{change.toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-red-700">Insufficient amount</span>
                                                <span className="text-sm font-medium text-red-700">Need ₱{(total - getCashAmount()).toFixed(2)} more</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="rounded-lg border bg-gray-50 p-4">
                            <div className="flex justify-between">
                                <span className="text-lg font-medium">Total Amount</span>
                                <span className="text-2xl font-bold text-blue-600">₱{total.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            className={`w-full rounded-lg px-4 py-3 text-lg font-semibold text-white transition-colors ${processing || (paymentMethod === "cash" && !isSufficientCash()) ? "cursor-not-allowed bg-gray-400" : "bg-black hover:bg-gray-800"}`}
                            onClick={handleComplete}
                            disabled={processing || (paymentMethod === "cash" && !isSufficientCash())}
                        >
                            {processing ? "Processing..." : "Complete Payment"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CheckoutDialog