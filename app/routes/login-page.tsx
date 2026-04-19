// ❌ Remove this line — it's Next.js syntax, not React Router
// "use client"

import { LoginForm } from "@/components/ui/ui/login-form"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { db, auth } from "@/configs/firebase"
import { recordTransaction } from "@/services/rtdb-service";
import { useState } from "react";
export async function loader() {
    return null
}


export default function LoginPage() {

    const handleLogin = async (email: string, password: string) => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        const userDoc = await getDoc(doc(db, "users", user.uid))

        // ✅ Debug: remove after fixing
        console.log("Firestore data:", userDoc.data())

        const role = userDoc.data()?.role

        if (!role) {
            console.error("No role found for this user!")
            return
        }

        localStorage.setItem("username", email)
        localStorage.setItem("role", role)

        if (role === "Staff" || role === "staff") {
            window.location.href = "/pos"
        } else {
            // Block non-staff users from logging in
            throw new Error("Access denied. Staff only.")
        }
    }

    return (
        <div>
            <LoginForm onLogin={handleLogin} />
        </div>
    )
}
