"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Package, Loader, ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "./badge"
import { Input } from "./input"
import { Button } from "./button"
import { Card } from "./card"
import { subscribeToProducts, type Product } from "../../../configs/productService"

interface ProductGridProps {
    onAddToCart: (product: Product) => void
}


const CATEGORIES = ["All", "Beverages", "Bakery", "Snacks", "Dessert", "Lunch/Heavy", "Silog Meal", "Noodles", "Street Food", "Kakanin/Dessert", "Grill/Snacks", "School Supplies"]

export function ProductGrid({ onAddToCart }: ProductGridProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("All")
    const [showLeftArrow, setShowLeftArrow] = useState(false)
    const [showRightArrow, setShowRightArrow] = useState(true)
    const categoriesRef = useRef<HTMLDivElement>(null)

    // Subscribe to products from Firebase
    useEffect(() => {
        const unsubscribe = subscribeToProducts((data) => {
            setProducts(data)
            setLoading(false)
        })
        return unsubscribe
    }, [])

    // Check scroll position for arrow visibility
    const handleCategoryScroll = () => {
        if (categoriesRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = categoriesRef.current
            setShowLeftArrow(scrollLeft > 0)
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
        }
    }

    // Scroll categories left/right
    const scrollCategories = (direction: "left" | "right") => {
        if (categoriesRef.current) {
            const scrollAmount = 200
            const newScrollLeft =
                direction === "left"
                    ? categoriesRef.current.scrollLeft - scrollAmount
                    : categoriesRef.current.scrollLeft + scrollAmount

            categoriesRef.current.scrollTo({
                left: newScrollLeft,
                behavior: "smooth",
            })
        }
    }

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = selectedCategory === "All" || product.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    return (
        <div className="flex flex-1 flex-col overflow-hidden p-6">
            <div className="mb-4 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search products..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                        disabled={loading}
                    />
                </div>

                <div className="relative">
                    {showLeftArrow && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full"
                            onClick={() => scrollCategories("left")}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    )}

                    <div
                        ref={categoriesRef}
                        onScroll={handleCategoryScroll}
                        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
                    >
                        {CATEGORIES.map((category) => (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory(category)}
                                disabled={loading}
                                className="whitespace-nowrap"
                            >
                                {category}
                            </Button>
                        ))}
                    </div>

                    {showRightArrow && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full"
                            onClick={() => scrollCategories("right")}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {loading ? (
                    <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                        <Loader className="mb-3 h-8 w-8 animate-spin" />
                        <p>Loading products...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 pb-4 md:grid-cols-3 lg:grid-cols-4">
                        {filteredProducts.map((product) => (
                            <Card
                                key={product.id}
                                className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg active:scale-95"
                                onClick={() => onAddToCart(product)}
                            >
                                <div className="flex flex-col p-4">
                                    <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-secondary text-5xl">
                                        {product.imageUrl}
                                    </div>
                                    <Badge variant="secondary" className="mb-2 w-fit text-xs">
                                        {product.category}
                                    </Badge>
                                    <h3 className="mb-1 font-medium text-card-foreground">{product.name}</h3>
                                    <p className="text-lg font-semibold text-primary">₱{product.price.toFixed(2)}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {!loading && filteredProducts.length === 0 && (
                    <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                        <Package className="mb-3 h-12 w-12" />
                        <p>No products found</p>
                    </div>
                )}
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    )
}
