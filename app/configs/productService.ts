import { db } from "./firebase"
import {
    collection, addDoc, onSnapshot,
    query, orderBy, updateDoc, deleteDoc, doc, Timestamp
} from "firebase/firestore"

export interface Product {
    id: string
    name: string
    price: number
    category: string
    imageUrl: string
    createdAt?: number
}

// Real-time listener for all products
export const subscribeToProducts = (
    callback: (products: Product[]) => void
) => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"))
    return onSnapshot(
        q,
        (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Product[]
            callback(data)
        },
        (error) => {
            console.error("Error subscribing to products:", error)
            callback([]) // Return empty array on error to prevent crash
        }
    )
}

// Add new product
export const addProduct = async (product: Omit<Product, "id" | "createdAt">) => {
    return await addDoc(collection(db, "products"), {
        ...product,
        createdAt: Date.now(),
    })
}

// Update existing product
export const updateProduct = async (id: string, product: Omit<Product, "id" | "createdAt">) => {
    const productRef = doc(db, "products", id)
    await updateDoc(productRef, {
        ...product,
    })
}

// Delete product
export const deleteProduct = async (id: string) => {
    await deleteDoc(doc(db, "products", id))
}
