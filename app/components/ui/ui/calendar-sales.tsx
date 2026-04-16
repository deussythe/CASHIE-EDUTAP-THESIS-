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
}

export function CalendarSales({ transactions, currentUserRole, currentUserName }: CalendarSalesProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedStaff, setSelectedStaff] = useState<string | null>(currentUserRole === "admin" ? null : currentUserName)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    // Filter transactions by staff if staff view
    const filteredTransactions = useMemo(() => {
        if (currentUserRole === "staff" || selectedStaff) {
            return transactions.filter((t) => t.staffName === selectedStaff)
        }
        return transactions
    }, [transactions, currentUserRole, selectedStaff])

    // Get unique staff names for dropdown
    const staffList = useMemo(() => {
        return [...new Set(transactions.map((t) => t.staffName))].sort()
    }, [transactions])

    // Group transactions by date
    const salesByDate = useMemo(() => {
        const data: { [key: string]: DaySalesData } = {}

        // Use all transactions to get staff on duty
        transactions.forEach((txn) => {
            const date = new Date(txn.timestamp).toISOString().split("T")[0]
            if (!data[date]) {
                data[date] = {
                    total: 0,
                    count: 0,
                    topItem: "",
                    average: 0,
                    date,
                    staffNames: [],
                }
            }
            // Add staff name if not already in list
            if (!data[date].staffNames.includes(txn.staffName)) {
                data[date].staffNames.push(txn.staffName)
            }
        })

        // Calculate metrics for filtered view
        filteredTransactions.forEach((txn) => {
            const date = new Date(txn.timestamp).toISOString().split("T")[0]
            if (data[date]) {
                data[date].total += txn.total
                data[date].count += 1
            }
        })

        // Calculate average and top item
        Object.keys(data).forEach((date) => {
            if (data[date].count > 0) {
                data[date].average = data[date].total / data[date].count
            }
            const dayTransactions = filteredTransactions.filter(
                (t) => new Date(t.timestamp).toISOString().split("T")[0] === date
            )
            const itemCounts: { [key: string]: number } = {}
            dayTransactions.forEach((t) => {
                t.items.forEach((item) => {
                    itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity
                })
            })
            const topItem = Object.entries(itemCounts).sort(([, a], [, b]) => b - a)[0]
            data[date].topItem = topItem ? topItem[0] : "—"
        })

        return data
    }, [transactions, filteredTransactions])

    // Generate calendar days
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    }

    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const monthName = currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" })

    const days = []
    for (let i = 0; i < firstDay; i++) {
        days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i)
    }

    const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1))
    const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1))

    // Check if date is today
    const isToday = (dateStr: string) => {
        const today = new Date().toISOString().split("T")[0]
        return dateStr === today
    }

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
                                <option key={staff} value={staff}>
                                    {staff}
                                </option>
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
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={handlePrevMonth}
                            className="rounded-lg border px-4 py-2 hover:bg-muted transition"
                        >
                            ← Previous
                        </button>
                        <h3 className="text-xl font-semibold">{monthName}</h3>
                        <button
                            onClick={handleNextMonth}
                            className="rounded-lg border px-4 py-2 hover:bg-muted transition"
                        >
                            Next →
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {/* Day headers */}
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="text-center font-semibold text-muted-foreground py-2">
                                {day}
                            </div>
                        ))}

                        {/* Calendar days */}
                        {days.map((day, idx) => {
                            const dateStr =
                                day &&
                                `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                            const dayData = dateStr && salesByDate[dateStr]
                            const dayOfWeek = new Date(`${dateStr}`).getDay()
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                            const hasSales = dayData && dayData.total > 0
                            const todayFlag = dateStr && isToday(dateStr)

                            // Color based on sales performance
                            let bgColor = "bg-muted/30"
                            let borderColor = "border-muted border-2"
                            if (day) {
                                if (isWeekend && !hasSales) {
                                    bgColor = "bg-blue-50"
                                    borderColor = "border-blue-200 border-2"
                                } else if (isWeekend && hasSales) {
                                    bgColor = "bg-blue-100"
                                    borderColor = "border-blue-300 border-2"
                                } else if (!isWeekend && !hasSales) {
                                    bgColor = "bg-gray-50"
                                    borderColor = "border-gray-200 border-2"
                                } else if (!isWeekend && hasSales) {
                                    // Green scale based on sales amount
                                    if (dayData.total > 5000) {
                                        bgColor = "bg-emerald-200"
                                        borderColor = "border-emerald-400 border-2"
                                    } else if (dayData.total > 2000) {
                                        bgColor = "bg-emerald-100"
                                        borderColor = "border-emerald-300 border-2"
                                    } else {
                                        bgColor = "bg-emerald-50"
                                        borderColor = "border-emerald-200 border-2"
                                    }
                                }
                                
                                // Today indicator - add gold/red border
                                if (todayFlag) {
                                    borderColor = "border-yellow-400 border-4"
                                }
                            }

                            return (
                                <div
                                    key={idx}
                                    onClick={() => day && dateStr && dayData && dayData.total > 0 && setSelectedDate(dateStr)}
                                    className={`rounded-lg border p-3 h-32 overflow-y-auto transition flex flex-col ${
                                        day ? `${bgColor} ${borderColor} hover:shadow-md ${dayData && dayData.total > 0 ? 'cursor-pointer' : ''}` : "bg-muted/30"
                                    }`}
                                >
                                    {day && (
                                        <>
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="font-semibold text-sm">{day}</p>
                                                <div className="flex gap-1 items-center">
                                                    {todayFlag && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold bg-yellow-300 text-yellow-900">
                                                            TODAY
                                                        </span>
                                                    )}
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                        isWeekend 
                                                            ? "bg-blue-200 text-blue-800" 
                                                            : "bg-gray-200 text-gray-800"
                                                    }`}>
                                                        {isWeekend ? "WE" : "WD"}
                                                    </span>
                                                </div>
                                            </div>
                                            {dayData && dayData.total > 0 ? (
                                                <div className="text-xs space-y-1 text-muted-foreground flex-1 overflow-hidden">
                                                    {/* Staff Names */}
                                                    <div className="mb-1 pb-1 border-b">
                                                        {dayData.staffNames.map((staff: string, idx: number) => (
                                                            <div key={idx} className="text-xs font-medium text-blue-700 truncate" title={staff}>
                                                                👤 {staff}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Sales Data */}
                                                    <div className="font-semibold text-primary">
                                                        ₱{dayData.total.toFixed(2)}
                                                    </div>
                                                    <div>{dayData.count} transaction(s)</div>
                                                    <div className="truncate text-xs" title={dayData.topItem}>
                                                         Top: {dayData.topItem}
                                                    </div>
                                                    <div className="text-xs">Avg: ₱{dayData.average.toFixed(2)}</div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-muted-foreground flex-1 flex flex-col justify-center">
                                                    {dayData && dayData.staffNames.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {dayData.staffNames.map((staff: string, idx: number) => (
                                                                <div key={idx} className="text-xs font-medium text-gray-600 truncate" title={staff}>
                                                                    👤 {staff}
                                                                </div>
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
                                <p className="text-xs font-medium text-muted-foreground">Weekdays (Monday-Friday):</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-gray-50 border border-gray-200"></div>
                                        <span className="text-xs">No sales</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-emerald-50 border border-emerald-200"></div>
                                        <span className="text-xs">Low sales (₱0-2000)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-emerald-100 border border-emerald-300"></div>
                                        <span className="text-xs">Medium sales (₱2000-5000)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-emerald-200 border border-emerald-400"></div>
                                        <span className="text-xs">High sales (₱5000+)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Weekends (Saturday-Sunday):</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-blue-50 border border-blue-200"></div>
                                        <span className="text-xs">Weekend (no sales)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-blue-100 border border-blue-300"></div>
                                        <span className="text-xs">Weekend (with sales)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-800 font-semibold">WD</span>
                                        <span className="text-xs">= Weekday</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-blue-200 text-blue-800 font-semibold">WE</span>
                                        <span className="text-xs">= Weekend</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Day Details Modal */}
                    {selectedDate && (() => {
                        const dayTransactions = transactions.filter((t) => new Date(t.timestamp).toISOString().split("T")[0] === selectedDate)
                        const filteredTransactions = dayTransactions.filter((t) => !selectedStaff || t.staffName === selectedStaff)
                        
                        // Calculate totals
                        const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0)
                        const staffNames = [...new Set(dayTransactions.map(t => t.staffName))]
                        
                        // Get top selling product
                        const itemCounts: { [key: string]: number } = {}
                        filteredTransactions.forEach((t) => {
                            t.items.forEach((item) => {
                                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity
                            })
                        })
                        const topProduct = Object.entries(itemCounts).sort(([, a], [, b]) => b - a)[0]
                        
                        return (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-2xl font-bold">
                                            {new Date(selectedDate).toLocaleDateString("en-US", { 
                                                weekday: "long", 
                                                year: "numeric", 
                                                month: "long", 
                                                day: "numeric" 
                                            })}
                                        </h3>
                                        <button 
                                            onClick={() => setSelectedDate(null)}
                                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                        >
                                            ×
                                        </button>
                                    </div>

                                    {/* Summary Cards */}
                                    <div className="space-y-4">
                                        {/* Total Sales */}
                                        <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 p-4">
                                            <p className="text-sm text-emerald-700 font-medium mb-1">Total Sales</p>
                                            <p className="text-4xl font-bold text-emerald-900">
                                                ₱{totalSales.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-emerald-600 mt-2">
                                                {filteredTransactions.length} transaction(s)
                                            </p>
                                        </div>

                                        {/* Top Selling Product */}
                                        <div className="rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 p-4">
                                            <p className="text-sm text-blue-700 font-medium mb-1">Top Selling Product</p>
                                            <p className="text-2xl font-bold text-blue-900">
                                                {topProduct ? topProduct[0] : "—"}
                                            </p>
                                            {topProduct && (
                                                <p className="text-xs text-blue-600 mt-2">
                                                    {topProduct[1]} unit(s) sold
                                                </p>
                                            )}
                                        </div>

                                        {/* Cashier Names */}
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
