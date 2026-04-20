"use client"

import { useState, useMemo } from "react"
import type { Transaction } from "../../../configs/transactionService"

interface CalendarSalesProps {
    transactions: Transaction[]
    currentUserRole: string
    currentUserName: string
}

interface DaySalesData {
    total: number
    count: number
    topItem: string
    average: number
    date: string
    staffNames: string[]
    peakHour: string | null
    paymentBreakdown: { [key: string]: number }
    totalItemsSold: number
}

export function CalendarSales({ transactions, currentUserRole, currentUserName }: CalendarSalesProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedStaff, setSelectedStaff] = useState<string | null>(currentUserRole === "admin" ? null : currentUserName)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    const filteredTransactions = useMemo(() => {
        if (currentUserRole === "staff" || selectedStaff) {
            return transactions.filter((t) => t.staffName === selectedStaff)
        }
        return transactions
    }, [transactions, currentUserRole, selectedStaff])

    const staffList = useMemo(() => {
        return [...new Set(transactions.map((t) => t.staffName))].sort()
    }, [transactions])

    const salesByDate = useMemo(() => {
        const data: { [key: string]: DaySalesData } = {}

        // Seed all dates that have any transaction (for staffNames tracking)
        transactions.forEach((txn) => {
            const date = new Date(txn.timestamp).toISOString().split("T")[0]
            if (!data[date]) {
                data[date] = {
                    total: 0, count: 0, topItem: "", average: 0, date,
                    staffNames: [], peakHour: null, paymentBreakdown: {}, totalItemsSold: 0,
                }
            }
            if (!data[date].staffNames.includes(txn.staffName)) {
                data[date].staffNames.push(txn.staffName)
            }
        })

        // Aggregate filtered transactions
        filteredTransactions.forEach((txn) => {
            const date = new Date(txn.timestamp).toISOString().split("T")[0]
            if (!data[date]) {
                data[date] = {
                    total: 0, count: 0, topItem: "", average: 0, date,
                    staffNames: [], peakHour: null, paymentBreakdown: {}, totalItemsSold: 0,
                }
            }
            data[date].total += txn.total
            data[date].count += 1

            // Payment breakdown
            const method = txn.paymentMethod?.toUpperCase() ?? "UNKNOWN"
            data[date].paymentBreakdown[method] = (data[date].paymentBreakdown[method] || 0) + 1

            // Total items sold
            txn.items.forEach((item) => {
                data[date].totalItemsSold += item.quantity
            })
        })

        Object.keys(data).forEach((date) => {
            const dayTransactions = filteredTransactions.filter(
                (t) => new Date(t.timestamp).toISOString().split("T")[0] === date
            )

            if (data[date].count > 0) {
                data[date].average = data[date].total / data[date].count
            }

            // Top item
            const itemCounts: { [key: string]: number } = {}
            dayTransactions.forEach((t) => {
                t.items.forEach((item) => {
                    itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity
                })
            })
            const topItem = Object.entries(itemCounts).sort(([, a], [, b]) => b - a)[0]
            data[date].topItem = topItem ? topItem[0] : "—"

            // Peak hour
            const hourCounts: { [label: string]: number } = {}
            dayTransactions.forEach((t) => {
                const hour = new Date(t.timestamp).getHours()
                const label = `${hour % 12 || 12}:00 ${hour >= 12 ? "PM" : "AM"}`
                hourCounts[label] = (hourCounts[label] || 0) + 1
            })
            const peakEntry = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]
            data[date].peakHour = peakEntry ? peakEntry[0] : null
        })

        return data
    }, [transactions, filteredTransactions])

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const monthName = currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" })

    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)

    const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1))
    const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1))
    const isToday = (dateStr: string) => dateStr === new Date().toISOString().split("T")[0]

    const handleExportDay = (filtered: Transaction[], dateStr: string) => {
        // Use a format with no commas so dates never split across columns
        const formatDate = (ts: number) => {
            const d = new Date(ts)
            const yyyy = d.getFullYear()
            const mm = String(d.getMonth() + 1).padStart(2, "0")
            const dd = String(d.getDate()).padStart(2, "0")
            const hh = d.getHours()
            const min = String(d.getMinutes()).padStart(2, "0")
            const ampm = hh >= 12 ? "PM" : "AM"
            const hour12 = String(hh % 12 || 12).padStart(2, "0")
            return `${yyyy}-${mm}-${dd} ${hour12}:${min} ${ampm}`
        }
        // Wrap every field in double-quotes; escape any internal quotes by doubling them
        const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`

        const headers = ["Transaction #", "Date", "Student No.", "Staff", "Payment Method", "Subtotal", "Tax", "Total", "Amount Paid", "Change"]
        const rows = filtered.map((txn) => [
            txn.transactionNumber ?? "—",
            formatDate(txn.timestamp),
            txn.studentNumber ?? "—",
            txn.staffName,
            txn.paymentMethod.toUpperCase(),
            txn.subtotal.toFixed(2),
            txn.tax.toFixed(2),
            txn.total.toFixed(2),
            txn.amountPaid.toFixed(2),
            txn.change.toFixed(2),
        ])
        const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `transactions-${dateStr}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Payment method pill colors
    const paymentPillStyle: { [key: string]: string } = {
        RFID: "bg-violet-100 text-violet-800",
        CASH: "bg-green-100 text-green-800",
        UNKNOWN: "bg-gray-100 text-gray-600",
    }
    const getPaymentStyle = (method: string) =>
        paymentPillStyle[method] ?? "bg-gray-100 text-gray-600"

    return (
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
            {/* Header */}
            <div className="border-b px-6 py-4">
                <h2 className="text-xl font-bold mb-4">Sales Calendar</h2>
                {currentUserRole === "admin" && (
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground">Filter by Staff:</label>
                        <select
                            value={selectedStaff || "all"}
                            onChange={(e) => setSelectedStaff(e.target.value === "all" ? null : e.target.value)}
                            className="rounded-lg border px-3 py-2 text-sm bg-card"
                        >
                            <option value="all">All Staff</option>
                            {staffList.map((staff) => (
                                <option key={staff} value={staff}>{staff}</option>
                            ))}
                        </select>
                    </div>
                )}
                {currentUserRole === "staff" && (
                    <p className="text-sm text-muted-foreground">Your sales for {currentUserName}</p>
                )}
            </div>

            {/* Calendar Container */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={handlePrevMonth} className="rounded-lg border px-4 py-2 hover:bg-muted transition">← Previous</button>
                        <h3 className="text-xl font-semibold">{monthName}</h3>
                        <button onClick={handleNextMonth} className="rounded-lg border px-4 py-2 hover:bg-muted transition">Next →</button>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="text-center font-semibold text-muted-foreground py-2">{day}</div>
                        ))}

                        {days.map((day, idx) => {
                            const dateStr = day
                                ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                                : null
                            const dayData = dateStr ? salesByDate[dateStr] : null
                            const dayOfWeek = dateStr ? new Date(dateStr).getDay() : -1
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                            const hasSales = dayData && dayData.total > 0
                            const todayFlag = dateStr ? isToday(dateStr) : false

                            let bgColor = "bg-muted/30"
                            let borderColor = "border-muted border-2"
                            if (day) {
                                if (isWeekend && !hasSales) { bgColor = "bg-blue-50"; borderColor = "border-blue-200 border-2" }
                                else if (isWeekend && hasSales) { bgColor = "bg-blue-100"; borderColor = "border-blue-300 border-2" }
                                else if (!isWeekend && !hasSales) { bgColor = "bg-gray-50"; borderColor = "border-gray-200 border-2" }
                                else if (!isWeekend && hasSales) {
                                    if (dayData!.total > 5000) { bgColor = "bg-emerald-200"; borderColor = "border-emerald-400 border-2" }
                                    else if (dayData!.total > 2000) { bgColor = "bg-emerald-100"; borderColor = "border-emerald-300 border-2" }
                                    else { bgColor = "bg-emerald-50"; borderColor = "border-emerald-200 border-2" }
                                }
                                if (todayFlag) borderColor = "border-yellow-400 border-4"
                            }

                            return (
                                <div
                                    key={idx}
                                    onClick={() => day && dateStr && dayData && dayData.total > 0 && setSelectedDate(dateStr)}
                                    className={`rounded-lg border p-2 h-40 overflow-y-auto transition flex flex-col ${day
                                            ? `${bgColor} ${borderColor} hover:shadow-md ${dayData && dayData.total > 0 ? "cursor-pointer" : ""}`
                                            : "bg-muted/30"
                                        }`}
                                >
                                    {day && (
                                        <>
                                            {/* Day number + badges */}
                                            <div className="flex items-center justify-between gap-1 mb-1">
                                                <p className="font-semibold text-sm">{day}</p>
                                                <div className="flex gap-1 items-center flex-wrap justify-end">
                                                    {todayFlag && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold bg-yellow-300 text-yellow-900">TODAY</span>
                                                    )}
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isWeekend ? "bg-blue-200 text-blue-800" : "bg-gray-200 text-gray-800"}`}>
                                                        {isWeekend ? "WE" : "WD"}
                                                    </span>
                                                </div>
                                            </div>

                                            {hasSales && dayData ? (
                                                <div className="text-xs space-y-0.5 text-muted-foreground flex-1 overflow-hidden">
                                                    {/* Staff names */}
                                                    <div className="pb-1 border-b mb-1">
                                                        {dayData.staffNames.map((staff, i) => (
                                                            <div key={i} className="text-xs font-medium text-blue-700 truncate" title={staff}>👤 {staff}</div>
                                                        ))}
                                                    </div>

                                                    {/* Total sales */}
                                                    <div className="font-semibold text-primary">₱{dayData.total.toFixed(2)}</div>

                                                    {/* Transactions + items */}
                                                    <div className="flex gap-2">
                                                        <span>{dayData.count} txn{dayData.count !== 1 ? "s" : ""}</span>
                                                        <span className="text-gray-400">·</span>
                                                        <span>{dayData.totalItemsSold} item{dayData.totalItemsSold !== 1 ? "s" : ""}</span>
                                                    </div>

                                                    {/* Avg per transaction */}
                                                    <div className="text-xs text-muted-foreground">Avg: ₱{dayData.average.toFixed(2)}</div>

                                                    {/* Peak hour */}
                                                    {dayData.peakHour && (
                                                        <div className="text-xs text-indigo-600 font-medium">⏰ {dayData.peakHour}</div>
                                                    )}

                                                    {/* Payment breakdown pills */}
                                                    {Object.keys(dayData.paymentBreakdown).length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {Object.entries(dayData.paymentBreakdown).map(([method, count]) => (
                                                                <span
                                                                    key={method}
                                                                    className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${getPaymentStyle(method)}`}
                                                                    title={`${method}: ${count} transaction(s)`}
                                                                >
                                                                    {method} {count}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-muted-foreground flex-1 flex flex-col justify-start mt-1">
                                                    {dayData && dayData.staffNames.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {dayData.staffNames.map((staff, i) => (
                                                                <div key={i} className="text-xs font-medium text-gray-600 truncate" title={staff}>👤 {staff}</div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span>No duty</span>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 p-4 rounded-lg bg-muted/30 border">
                        <p className="text-sm font-semibold mb-3">Legend:</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Weekdays (Monday–Friday):</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-gray-50 border border-gray-200"></div><span className="text-xs">No sales</span></div>
                                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-emerald-50 border border-emerald-200"></div><span className="text-xs">Low sales (₱0–2000)</span></div>
                                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-emerald-100 border border-emerald-300"></div><span className="text-xs">Medium sales (₱2000–5000)</span></div>
                                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-emerald-200 border border-emerald-400"></div><span className="text-xs">High sales (₱5000+)</span></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Cell info (on sales days):</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2"><span className="text-xs">₱ amount</span><span className="text-xs text-muted-foreground">= Total sales</span></div>
                                    <div className="flex items-center gap-2"><span className="text-xs">N txns · N items</span><span className="text-xs text-muted-foreground">= Counts</span></div>
                                    <div className="flex items-center gap-2"><span className="text-xs">⏰ time</span><span className="text-xs text-muted-foreground">= Peak hour</span></div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-800 font-semibold">RFID 3</span>
                                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">CASH 2</span>
                                        <span className="text-xs text-muted-foreground">= Payment split</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Day Details Modal */}
                    {selectedDate && (() => {
                        const dayTransactions = transactions.filter(
                            (t) => new Date(t.timestamp).toISOString().split("T")[0] === selectedDate
                        )
                        const filtered = dayTransactions.filter((t) => !selectedStaff || t.staffName === selectedStaff)

                        const totalSales = filtered.reduce((sum, t) => sum + t.total, 0)
                        const avgTransaction = filtered.length > 0 ? totalSales / filtered.length : 0

                        const hourCounts: { [hour: string]: number } = {}
                        filtered.forEach((t) => {
                            const hour = new Date(t.timestamp).getHours()
                            const label = `${hour % 12 || 12}:00 ${hour >= 12 ? "PM" : "AM"}`
                            hourCounts[label] = (hourCounts[label] || 0) + 1
                        })
                        const mostActiveHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]

                        const totalItemsSold = filtered.reduce(
                            (sum, t) => sum + t.items.reduce((s, item) => s + item.quantity, 0), 0
                        )

                        const paymentBreakdown = filtered.reduce((acc, t) => {
                            const method = t.paymentMethod?.toUpperCase() ?? "UNKNOWN"
                            acc[method] = (acc[method] || 0) + 1
                            return acc
                        }, {} as { [key: string]: number })

                        const staffNames = [...new Set(dayTransactions.map((t) => t.staffName))]

                        const itemCounts: { [key: string]: number } = {}
                        filtered.forEach((t) => {
                            t.items.forEach((item) => {
                                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity
                            })
                        })
                        const topProduct = Object.entries(itemCounts).sort(([, a], [, b]) => b - a)[0]

                        return (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold">
                                            {new Date(selectedDate).toLocaleDateString("en-US", {
                                                weekday: "long", year: "numeric", month: "long", day: "numeric",
                                            })}
                                        </h3>
                                        <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
                                    </div>

                                    <button
                                        onClick={() => handleExportDay(filtered, selectedDate)}
                                        className="w-full mb-4 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 transition text-left"
                                    >
                                        ⬇ Export Transactions for This Day
                                    </button>

                                    <div className="space-y-4">
                                        {/* Total Sales */}
                                        <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 p-4">
                                            <p className="text-sm text-emerald-700 font-medium mb-1">Total Sales</p>
                                            <p className="text-4xl font-bold text-emerald-900">₱{totalSales.toFixed(2)}</p>
                                            <p className="text-xs text-emerald-600 mt-2">{filtered.length} transaction(s)</p>
                                        </div>

                                        {/* Avg + Total Items */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 p-4">
                                                <p className="text-sm text-orange-700 font-medium mb-1">Avg per Transaction</p>
                                                <p className="text-2xl font-bold text-orange-900">₱{avgTransaction.toFixed(2)}</p>
                                            </div>
                                            <div className="rounded-lg bg-gradient-to-r from-pink-50 to-pink-100 border border-pink-200 p-4">
                                                <p className="text-sm text-pink-700 font-medium mb-1">Total Items Sold</p>
                                                <p className="text-2xl font-bold text-pink-900">{totalItemsSold}</p>
                                                <p className="text-xs text-pink-600 mt-1">units</p>
                                            </div>
                                        </div>

                                        {/* Most Active Hour */}
                                        <div className="rounded-lg bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 p-4">
                                            <p className="text-sm text-indigo-700 font-medium mb-1">Most Active Hour</p>
                                            <p className="text-2xl font-bold text-indigo-900">
                                                {mostActiveHour ? mostActiveHour[0] : "—"}
                                            </p>
                                            {mostActiveHour && (
                                                <p className="text-xs text-indigo-600 mt-1">{mostActiveHour[1]} transaction(s)</p>
                                            )}
                                        </div>

                                        {/* Top Selling Product */}
                                        <div className="rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 p-4">
                                            <p className="text-sm text-blue-700 font-medium mb-1">Top Selling Product</p>
                                            <p className="text-2xl font-bold text-blue-900">{topProduct ? topProduct[0] : "—"}</p>
                                            {topProduct && <p className="text-xs text-blue-600 mt-2">{topProduct[1]} unit(s) sold</p>}
                                        </div>

                                        {/* Payment Method Breakdown */}
                                        <div className="rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 p-4">
                                            <p className="text-sm text-yellow-700 font-medium mb-2">Payment Method Breakdown</p>
                                            <div className="space-y-1">
                                                {Object.entries(paymentBreakdown).map(([method, count]) => (
                                                    <div key={method} className="flex justify-between text-sm text-yellow-900">
                                                        <span className="font-medium">{method}</span>
                                                        <span>{count} transaction(s)</span>
                                                    </div>
                                                ))}
                                                {Object.keys(paymentBreakdown).length === 0 && (
                                                    <p className="text-xs text-yellow-600">No data</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Cashier(s) on Duty */}
                                        <div className="rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 p-4">
                                            <p className="text-sm text-purple-700 font-medium mb-2">Cashier(s) on Duty</p>
                                            <div className="space-y-2">
                                                {staffNames.map((staff, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-sm text-purple-900">
                                                        <span className="text-lg">👤</span>
                                                        <span className="font-medium">{staff}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}
                </div>
            </div>
        </div>
    )
}