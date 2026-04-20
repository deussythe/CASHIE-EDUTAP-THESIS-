"use client"
import { useState, useEffect } from "react"
import type { Transaction } from "../../../configs/transactionService"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../../../configs/firebase"

interface Props {
    transactions: Transaction[]
    onClose: () => void
    onClearTransactions: () => void
    currentUserRole: string
}

export function TransactionHistory({ transactions, onClose, onClearTransactions, currentUserRole }: Props) {
    const [selected, setSelected] = useState<Transaction | null>(null)
    const [lastRefresh, setLastRefresh] = useState(new Date())

    useEffect(() => {
        const calculateTimeUntilMidnight = () => {
            const now = new Date()
            const tomorrow = new Date(now)
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(0, 0, 0, 0)
            return tomorrow.getTime() - now.getTime()
        }

        let timer: ReturnType<typeof setTimeout>

        const scheduleMidnightRefresh = () => {
            timer = setTimeout(() => {
                setSelected(null)
                setLastRefresh(new Date())
                onClearTransactions()
                scheduleMidnightRefresh()
            }, calculateTimeUntilMidnight())
        }

        scheduleMidnightRefresh()

        return () => clearTimeout(timer)
    }, [onClearTransactions])

    const formatDate = (ts: number) =>
        new Date(ts).toLocaleString("en-PH", {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
        })

    const formatPeso = (amount: number) => `₱${amount.toFixed(2)}`

    const handleExportCSV = () => {
        const headers = ["Transaction #", "Date", "Student No.", "Staff", "Payment Method", "Subtotal", "Tax", "Total", "Amount Paid", "Change"]
        const rows = transactions.map((txn) => [
            txn.transactionNumber ?? "—",
            formatDate(txn.timestamp),
            txn.studentNumber ?? "—",  // ✅ was txn.studentId
            txn.staffName,
            txn.paymentMethod.toUpperCase(),
            txn.subtotal.toFixed(2),
            txn.tax.toFixed(2),
            txn.total.toFixed(2),
            txn.amountPaid.toFixed(2),
            txn.change.toFixed(2),
        ])
        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `transactions-${Date.now()}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handlePrint = async (txn: Transaction) => {
        // ✅ Fetch canteen info
        const snap = await getDoc(doc(db, "settings", "canteen_info"))
        const schoolName = snap.exists() ? snap.data().schoolName ?? "" : ""
        const canteenName = snap.exists() ? snap.data().canteenName ?? "" : ""

        const win = window.open("", "_blank", "width=400,height=600")
        if (!win) return
        win.document.write(`
        <html><head><title>Receipt</title>
        <style>
            body { font-family: monospace; padding: 20px; font-size: 13px; }
            h2 { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .center { text-align: center; }
        </style></head><body>
        ${schoolName ? `<p class="center" style="font-weight:bold">${schoolName}</p>` : ""}
        ${canteenName ? `<p class="center">${canteenName}</p>` : ""}
            <h2>RECEIPT</h2>
            <p class="center">${formatDate(txn.timestamp)}</p>
            <p class="center">Transaction #: ${txn.transactionNumber ?? "—"}</p>
            <p class="center">Staff: ${txn.staffName}</p>
            ${txn.studentNumber ? `<p class="center">Student No: ${txn.studentNumber}</p>` : ""}
            <div class="divider"></div>
            ${txn.items.map((item) => `
                <div class="row">
                    <span>${item.name} × ${item.quantity}</span>
                    <span>${formatPeso(item.price * item.quantity)}</span>
                </div>
            `).join("")}
            <div class="divider"></div>
            <div class="row"><span>Subtotal</span><span>${formatPeso(txn.subtotal)}</span></div>
            <div class="row"><span>Tax (8%)</span><span>${formatPeso(txn.tax)}</span></div>
            <div class="row bold"><span>TOTAL</span><span>${formatPeso(txn.total)}</span></div>
            <div class="divider"></div>
            <div class="row"><span>Amount Paid</span><span>${formatPeso(txn.amountPaid)}</span></div>
            <div class="row"><span>Change</span><span>${formatPeso(txn.change)}</span></div>
            <div class="row"><span>Payment</span><span>${txn.paymentMethod.toUpperCase()}</span></div>
            <div class="divider"></div>
            <p class="center">Thank you!</p>
            </body></html>
        `)
        win.document.close()
        win.print()
    }

    return (
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h2 className="text-xl font-bold">Transaction History</h2>
                    <p className="text-sm text-muted-foreground">
                        {currentUserRole === "admin" ? "All staff transactions" : "Your transactions"}
                        {" · "}{transactions.length} record(s)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        🔄 Auto-refreshes daily at midnight • Last refresh: {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    {transactions.length > 0 && (
                        <button
                            onClick={handleExportCSV}
                            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted transition"
                        >
                            ⬇ Export CSV
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="rounded-lg border px-4 py-2 text-sm hover:bg-muted transition"
                    >
                        ← Back to POS
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {transactions.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        No transactions yet.
                    </div>
                ) : (
                    <div className="space-y-3 max-w-2xl mx-auto">
                        {transactions.map((txn) => (
                            <div
                                key={txn.id}
                                onClick={() => setSelected(txn)}
                                className="cursor-pointer rounded-xl border bg-card p-4 shadow-sm hover:bg-muted/50 transition"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-mono text-blue-600 mb-0.5">
                                            {txn.transactionNumber ?? "—"}
                                        </p>
                                        <p className="font-semibold">{formatDate(txn.timestamp)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {txn.items.length} item(s) ·{" "}
                                            <span className="uppercase font-medium">{txn.paymentMethod}</span>
                                        </p>
                                        <p className="text-sm text-muted-foreground">Staff: {txn.staffName}</p>
                                        {txn.studentNumber && (
                                            <p className="text-sm text-muted-foreground">Student No: {txn.studentNumber}</p>
                                        )}
                                    </div>
                                    <p className="text-xl font-bold text-primary">{formatPeso(txn.total)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Receipt Modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold">Receipt</h3>
                            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        </div>
                        <p className="text-xs font-mono text-blue-600 mb-1">
                            {selected.transactionNumber ?? "—"}
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(selected.timestamp)}</p>
                        <p className="text-sm text-gray-500">
                            Staff: <span className="font-medium text-gray-700">{selected.staffName}</span>
                        </p>
                        {selected.studentNumber && (
                            <p className="mb-4 text-sm text-gray-500">
                                Student No: <span className="font-medium text-gray-700">{selected.studentNumber}</span>
                            </p>
                        )}
                        <div className="mb-3 space-y-2 border-t border-b py-3">
                            {selected.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span>{item.name} <span className="text-gray-400">× {item.quantity}</span></span>
                                    <span>{formatPeso(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatPeso(selected.subtotal)}</span></div>
                            <div className="flex justify-between text-gray-500"><span>Tax (8%)</span><span>{formatPeso(selected.tax)}</span></div>
                            <div className="mt-2 flex justify-between text-base font-bold"><span>Total</span><span className="text-primary">{formatPeso(selected.total)}</span></div>
                            <div className="flex justify-between text-gray-500 pt-1 border-t mt-2"><span>Amount Paid</span><span>{formatPeso(selected.amountPaid)}</span></div>
                            <div className="flex justify-between text-gray-500"><span>Change</span><span>{formatPeso(selected.change)}</span></div>
                            <div className="flex justify-between text-gray-500"><span>Payment Method</span><span className="uppercase font-medium">{selected.paymentMethod}</span></div>
                        </div>
                        <button
                            onClick={() => handlePrint(selected)}
                            className="mt-5 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:opacity-90 transition"
                        >
                            🖨 Print Receipt
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}