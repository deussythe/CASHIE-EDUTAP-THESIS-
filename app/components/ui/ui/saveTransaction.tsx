import { saveTransaction } from "@/configs/transactionService";
import { useAuth } from "@/context/auth/auth-context"; // adjust path

// Inside your checkout handler:
const { user } = useAuth(); // get current logged-in staff

const handleConfirmPayment = async () => {
    try {
        await saveTransaction({
            staffId: user.uid,
            staffName: user.displayName ?? user.email ?? "Staff",
            items: cartItems.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                category: item.category,
            })),
            subtotal: subtotal,
            tax: taxAmount,
            total: total,
            paymentMethod: selectedPaymentMethod, // "cash" | "gcash" | "card"
            amountPaid: amountPaid,
            change: change,
            timestamp: Date.now(),
        });

        // then clear cart, close dialog, etc.
        clearCart();
    } catch (error) {
        console.error("Failed to save transaction:", error);
    }
};