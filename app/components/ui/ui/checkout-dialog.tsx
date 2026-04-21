"use client"

import { useState, useEffect, useRef } from "react"
import { CreditCard, Banknote, CheckCircle2, X, KeyboardIcon, ShieldCheck } from "lucide-react"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { db, auth } from "../../../configs/firebase"
import { processRFIDPayment, saveTransaction } from "../../../configs/transactionService"

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
    studentNumber?: string
}

interface StudentInfo {
    name: string
    studentNumber: string
    photoUrl?: string
}

export function CheckoutDialog({ open, onClose, onComplete, total, items, onAddTransaction, studentNumber }: CheckoutDialogProps) {
    const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card")
    const [cashReceived, setCashReceived] = useState("")
    const [processing, setProcessing] = useState(false)
    const [success, setSuccess] = useState(false)
    const [waitingForCard, setWaitingForCard] = useState(false)
    const [cardError, setCardError] = useState("")
    const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
    const [transactionNumber, setTransactionNumber] = useState("")
    const [manualEntry, setManualEntry] = useState(false)
    const [manualStudentNumber, setManualStudentNumber] = useState("")
    const [manualError, setManualError] = useState("")
    const [staffName, setStaffName] = useState("")
    const [staffId, setStaffId] = useState("")
    const rfidInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const user = auth.currentUser
        if (!user) return
        setStaffId(user.uid)
        getDoc(doc(db, "users", user.uid)).then((snap) => {
            if (snap.exists()) setStaffName(snap.data().name || "")
        })
    }, [])

    const getCashAmount = () => Number.parseFloat(cashReceived || "0")
    const calculateChange = () => {
        if (paymentMethod !== "cash") return 0
        return Math.max(0, getCashAmount() - total)
    }
    const isSufficientCash = () => getCashAmount() >= total
    const change = calculateChange()

    useEffect(() => {
        if (waitingForCard && !manualEntry) {
            setTimeout(() => rfidInputRef.current?.focus(), 100)
        }
    }, [waitingForCard, manualEntry])

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
            staffName,
            staffId,
            studentNumber: "",
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

    const processCardPayment = async (rfidSerial: string, isManual = false, manualStudNum = "") => {
        setProcessing(true)
        setCardError("")
        setManualError("")

        try {
            let foundStudentId = ""
            let foundStudentNumber = ""
            let foundStudentName = ""
            let foundPhotoUrl = ""

            if (isManual) {
                const studentSnap = await getDocs(
                    query(collection(db, "students"), where("studentNumber", "==", manualStudNum))
                )

                if (studentSnap.empty) {
                    setManualError("Student not found. Please check the student number.")
                    setProcessing(false)
                    return
                }

                const studentDoc = studentSnap.docs[0]
                foundStudentId = studentDoc.id
                foundStudentNumber = studentDoc.data().studentNumber
                foundStudentName = studentDoc.data().name
                foundPhotoUrl = studentDoc.data().photoUrl || ""
            } else {
                const studentSnap = await getDocs(
                    query(collection(db, "students"), where("rfidSerial", "==", rfidSerial))
                )

                if (studentSnap.empty) {
                    setCardError("Student not found!")
                    setProcessing(false)
                    return
                }

                const studentDoc = studentSnap.docs[0]
                foundStudentId = studentDoc.id
                foundStudentNumber = studentDoc.data().studentNumber
                foundStudentName = studentDoc.data().name
                foundPhotoUrl = studentDoc.data().photoUrl || ""
            }

            const result = await processRFIDPayment(foundStudentId, total)

            if (!result.success) {
                if (isManual) {
                    setManualError(result.message || "Payment failed.")
                } else {
                    setCardError(result.message || "Payment failed.")
                }
                setProcessing(false)
                return
            }

            const txnNumber = await saveTransaction({
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
                paymentMethod: isManual ? "RFID-Manual" : "RFID",
                amountPaid: total,
                change: 0,
                staffName,
                staffId,
                studentNumber: foundStudentNumber,
                timestamp: Date.now(),
                status: "Completed",
            })

            setStudentInfo({
                name: foundStudentName,
                studentNumber: foundStudentNumber,
                photoUrl: foundPhotoUrl,
            })
            setTransactionNumber(txnNumber)
            setWaitingForCard(false)
            setManualEntry(false)
            setSuccess(true)

            setTimeout(() => {
                setProcessing(false)
                setSuccess(false)
                setStudentInfo(null)
                setTransactionNumber("")
                setCashReceived("")
                setManualStudentNumber("")
                setPaymentMethod("card")
                onComplete()
            }, 5000)

        } catch (err) {
            if (isManual) {
                setManualError("Something went wrong. Try again.")
            } else {
                setCardError("Something went wrong. Try again.")
            }
            setProcessing(false)
        }
    }

    const handleRFIDKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return
        const rfidSerial = e.currentTarget.value
        if (!rfidSerial) return
        e.currentTarget.value = ""
        await processCardPayment(rfidSerial)
    }

    const handleManualSubmit = async () => {
        if (!manualStudentNumber.trim()) {
            setManualError("Please enter a student number.")
            return
        }
        await processCardPayment("", true, manualStudentNumber.trim())
    }

    const handleClose = () => {
        if (!processing && !success) {
            setWaitingForCard(false)
            setManualEntry(false)
            setManualStudentNumber("")
            setManualError("")
            setCashReceived("")
            setPaymentMethod("card")
            setCardError("")
            onClose()
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl">

                {/* Close button */}
                {!success && (
                    <button
                        onClick={handleClose}
                        className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 disabled:pointer-events-none z-10"
                        disabled={processing || success}
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold">
                        {waitingForCard && !manualEntry ? "Tap Your Card"
                            : manualEntry ? "Manual Entry"
                            : success ? "Payment Successful"
                            : "Complete Payment"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {waitingForCard && !manualEntry
                            ? "Please tap your RFID card on the reader"
                            : manualEntry
                            ? "Enter the student number manually"
                            : success
                            ? "Verify the student photo below before handing over the order"
                            : "Select payment method and complete the transaction"}
                    </p>
                </div>

                <div className="p-6">

                    {/* RFID Waiting Screen */}
                    {waitingForCard && !manualEntry ? (
                        <div className="flex flex-col items-center justify-center py-6">
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
                                <p className="text-sm text-red-600 mb-4 text-center">{cardError}</p>
                            )}

                            <div className="rounded-lg border bg-gray-50 p-4 w-full mb-4">
                                <div className="flex justify-between">
                                    <span className="text-lg font-medium">Amount to Pay</span>
                                    <span className="text-2xl font-bold text-blue-600">₱{total.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => { setManualEntry(true); setCardError("") }}
                                disabled={processing}
                                className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-800 transition-colors mb-2"
                            >
                                <KeyboardIcon className="h-4 w-4" />
                                Card not working? Use manual entry
                            </button>

                            <button
                                onClick={() => setWaitingForCard(false)}
                                className="text-sm text-gray-400 hover:text-gray-600 underline"
                                disabled={processing}
                            >
                                Cancel
                            </button>
                        </div>

                    ) : manualEntry ? (
                        <div className="flex flex-col py-2">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mx-auto">
                                <KeyboardIcon className="h-8 w-8 text-red-800" />
                            </div>

                            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 mb-4 text-sm text-yellow-800 text-center">
                                ⚠️ Emergency manual entry — verify student verbally and by card sticker
                            </div>

                            <div className="space-y-2 mb-4">
                                <label className="text-sm font-medium text-gray-700">Student Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 2026-0003"
                                    value={manualStudentNumber}
                                    onChange={(e) => setManualStudentNumber(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                                    autoFocus
                                    disabled={processing}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-gray-100"
                                />
                            </div>

                            {manualError && (
                                <p className="text-sm text-red-600 mb-3 text-center">{manualError}</p>
                            )}

                            <div className="rounded-lg border bg-gray-50 p-4 mb-4">
                                <div className="flex justify-between">
                                    <span className="text-lg font-medium">Amount to Pay</span>
                                    <span className="text-2xl font-bold text-blue-600">₱{total.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleManualSubmit}
                                disabled={processing}
                                className="w-full rounded-lg bg-red-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60 disabled:cursor-not-allowed mb-2"
                            >
                                {processing ? "Processing..." : "Confirm Payment"}
                            </button>

                            <button
                                onClick={() => { setManualEntry(false); setManualStudentNumber(""); setManualError("") }}
                                disabled={processing}
                                className="text-sm text-gray-400 hover:text-gray-600 underline text-center"
                            >
                                Back to card tap
                            </button>
                        </div>

                    ) : success ? (
                        /* Success Screen with Photo Verification */
                        <div className="flex flex-col">
                            {studentInfo ? (
                                <>
                                    {/* Verify banner */}
                                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                                        <ShieldCheck className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                        <p className="text-xs font-medium text-amber-700">
                                            Check that the photo matches the student in front of you before handing over the order.
                                        </p>
                                    </div>

                                    {/* Photo centered + big */}
                                    <div className="flex flex-col items-center mb-4">
                                        {studentInfo.photoUrl ? (
                                            <img
                                                src={studentInfo.photoUrl}
                                                alt={studentInfo.name}
                                                className="w-48 h-60 object-cover rounded-xl border-4 border-green-400 shadow-md"
                                            />
                                        ) : (
                                            <div className="w-48 h-60 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-2">
                                                <span className="text-4xl">👤</span>
                                                <span className="text-sm text-gray-400 text-center px-2">No photo on file</span>
                                            </div>
                                        )}
                                        <p className="text-lg font-bold text-gray-900 mt-3">{studentInfo.name}</p>
                                        <p className="text-sm text-gray-500">{studentInfo.studentNumber}</p>
                                    </div>

                                    {/* Transaction summary */}
                                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-semibold text-green-700">Payment Successful</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-t border-green-200 pt-2">
                                            <span className="text-gray-500">Amount Paid</span>
                                            <span className="font-bold text-green-700">₱{total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Reference No.</span>
                                            <span className="font-bold text-gray-800">{transactionNumber}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6">
                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-green-700">Payment Successful!</h3>
                                    <p className="text-gray-500 mt-2">Transaction completed</p>
                                </div>
                            )}
                        </div>

                    ) : (
                        /* Payment Method Selection */
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
        </div>
    )
}

export default CheckoutDialog