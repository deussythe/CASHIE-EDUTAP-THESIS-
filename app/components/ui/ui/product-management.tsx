"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, X, Loader } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"
import { Card } from "./card"
import { subscribeToProducts, addProduct, updateProduct, deleteProduct } from "../../../configs/productService"
import type { Product } from "../../../configs/productService"

interface ProductManagementProps {
    onClose: () => void
}

const CATEGORIES = [
    "Beverages",
    "Bakery",
    "Snacks",
    "Dessert",
    "Lunch/Heavy",
    "Silog Meal",
    "Noodles",
    "Street Food",
    "Kakanin/Dessert",
    "Grill/Snacks",
    "School Supplies",
    "Local Juices/Shakes",
]

export function ProductManagement({ onClose }: ProductManagementProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        price: "",
        category: "",
        imageUrl: "",
    })

    // Subscribe to real-time product updates
    useEffect(() => {
        setLoading(true)
        const unsubscribe = subscribeToProducts((data) => {
            setProducts(data)
            setLoading(false)
        })
        return unsubscribe
    }, [])

    const handleAddClick = () => {
        setEditingId(null)
        setFormData({ name: "", price: "", category: "", imageUrl: "" })
        setShowForm(true)
    }

    const handleEditClick = (product: Product) => {
        setEditingId(product.id)
        setFormData({
            name: product.name,
            price: product.price.toString(),
            category: product.category,
            imageUrl: product.imageUrl,
        })
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this product?")) {
            try {
                setSaving(true)
                await deleteProduct(id)
                alert("Product deleted successfully!")
            } catch (error) {
                alert("Error deleting product: " + error)
            } finally {
                setSaving(false)
            }
        }
    }

    const handleSubmit = async () => {
        if (!formData.name || !formData.price || !formData.category || !formData.imageUrl) {
            alert("Please fill in all fields")
            return
        }

        try {
            setSaving(true)

            if (editingId) {
                // Edit existing product
                await updateProduct(editingId, {
                    name: formData.name,
                    price: parseFloat(formData.price),
                    category: formData.category,
                    imageUrl: formData.imageUrl,
                })
                alert("Product updated!")
            } else {
                // Add new product
                await addProduct({
                    name: formData.name,
                    price: parseFloat(formData.price),
                    category: formData.category,
                    imageUrl: formData.imageUrl,
                })
                alert("Product added!")
            }

            setShowForm(false)
            setFormData({ name: "", price: "", category: "", imageUrl: "" })
        } catch (error) {
            alert("Error saving product: " + error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">Product Management</h2>
                    <p className="text-sm text-muted-foreground">
                        {loading ? "Loading products..." : `Manage all products • ${products.length} product(s)`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleAddClick}
                        disabled={loading || saving}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                        Add Product
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        Back to POS
                    </Button>
                </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto">
                    {loading ? (
                        <div className="flex h-64 items-center justify-center text-center text-muted-foreground">
                            <div className="flex flex-col items-center">
                                <Loader className="h-8 w-8 animate-spin mb-2" />
                                <p>Loading products...</p>
                            </div>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex h-64 items-center justify-center text-center text-muted-foreground">
                            <div>
                                <p className="text-lg font-medium mb-2">No products yet</p>
                                <Button onClick={handleAddClick} className="mt-4">
                                    Add First Product
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.map((product) => (
                                <Card key={product.id} className="p-4 flex flex-col">
                                    <div className="text-4xl mb-3">{product.imageUrl}</div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                                        <div className="space-y-1 mb-4">
                                            <p className="text-sm text-muted-foreground">
                                                Category: <span className="font-medium text-foreground">{product.category}</span>
                                            </p>
                                            <p className="text-lg font-bold text-primary">₱{product.price.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-4 border-t">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 flex items-center justify-center gap-2"
                                            onClick={() => handleEditClick(product)}
                                            disabled={saving}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="flex-1 flex items-center justify-center gap-2"
                                            onClick={() => handleDelete(product.id)}
                                            disabled={saving}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Product Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold">
                                {editingId ? "Edit Product" : "Add New Product"}
                            </h3>
                            <button
                                onClick={() => setShowForm(false)}
                                disabled={saving}
                                className="text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Product Name *</label>
                                <Input
                                    placeholder="e.g., Rice Meal w/ Fried Egg"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    disabled={saving}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Price (₱) *</label>
                                <Input
                                    type="number"
                                    placeholder="e.g., 65.00"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    disabled={saving}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Category *</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    disabled={saving}
                                    className="w-full px-3 py-2 border border-input rounded-md bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Select a category...</option>
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Image URL or Emoji *</label>
                                <Input
                                    placeholder="e.g., 🍚 or https://cloudinary.com/..."
                                    value={formData.imageUrl}
                                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                    disabled={saving}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Use emoji (🍚) or Cloudinary image URL
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowForm(false)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                onClick={handleSubmit}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : (editingId ? "Update" : "Add")} Product
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
