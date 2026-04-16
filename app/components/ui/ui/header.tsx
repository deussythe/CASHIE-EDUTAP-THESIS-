"use client"

import React, { useState } from "react"
import { ShoppingCart, History, BarChart3, Package, LogOut, User, Clock } from "lucide-react"

interface HeaderProps {
    user: { username: string; role: string } | null
    onLogout: () => void
    currentView: "pos" | "history" | "calendar" | "products"
    onViewChange: (view: "pos" | "history" | "calendar" | "products") => void
    onShowUserPage?: () => void
}

const handleLogout = () => {
    localStorage.removeItem("username")
    localStorage.removeItem("role")
    window.location.href = "/"
}

export function Header({ user, onLogout, currentView, onViewChange, onShowUserPage }: HeaderProps) {
    const currentTime = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    })

    const ViewButton = ({ view, label, icon: Icon }: { view: "pos" | "history" | "calendar" | "products"; label: string; icon: any }) => (
        <button
            onClick={() => onViewChange(view)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                currentView === view
                    ? "bg-white text-red-900"
                    : "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20"
            }`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    )

    return (
        <header className="bg-gradient-to-r from-red-950 to-red-900 border-b border-red-900 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                        <ShoppingCart className="h-5 w-5 text-red-900" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-white">EDUTAP</h1>
                        <p className="text-sm text-red-100">St. Clare College of Caloocan</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {user && (
                        <button
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-white hover:bg-red-800 transition ${
                                onShowUserPage ? "cursor-pointer" : "cursor-default hover:bg-transparent"
                            }`}
                            onClick={onShowUserPage}
                        >
                            <User className="h-4 w-4 text-red-100" />
                            <span className="font-medium">{user.username}</span>
                            <span className="text-xs text-red-100 capitalize">({user.role})</span>
                        </button>
                    )}
                    <div className="flex items-center gap-2 text-sm text-red-100">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono">{currentTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ViewButton view="pos" label="POS" icon={ShoppingCart} />
                        <ViewButton view="history" label="History" icon={History} />
                        <ViewButton view="calendar" label="Calendar" icon={BarChart3} />
                        <ViewButton view="products" label="Products" icon={Package} />
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-lg bg-white border border-white px-4 py-2 text-sm font-semibold text-red-900 transition hover:bg-red-50"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </header>
    )
}

// Demo Component
export default function App() {
    const [currentView, setCurrentView] = useState<"pos" | "history" | "calendar" | "products">("pos")

    const handleLogoutDemo = () => {
        console.log('Logging out...')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header 
                user={{ username: "John Doe", role: "cashier" }}
                onLogout={handleLogoutDemo}
                currentView={currentView}
                onViewChange={setCurrentView}
            />
            <div className="p-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-2">POS Dashboard</h2>
                    <p className="text-gray-600">Current view: {currentView}</p>
                </div>
            </div>
        </div>
    )
}