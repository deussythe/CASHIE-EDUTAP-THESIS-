import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";

// Initialize the Admin SDK
initializeApp();
const db = getFirestore();

export const autoLogTransaction = onDocumentCreated("sales/{saleId}", async (event) => {
    const data = event.data?.data();

    // If there's no data, stop here
    if (!data) return;

    // Extract the fields from the sale
    const { modeOfPayment, totalAmount, staffName, studentId } = data;

    try {
        const batch = db.batch();
        const historyRef = db.collection("transaction_history").doc();

        // 1. Automatically create the History Log
        batch.set(historyRef, {
            saleId: event.params.saleId,
            modeOfPayment: modeOfPayment, // "Cash" or "RFID"
            staffName: staffName,
            totalAmount: totalAmount,
            timestamp: FieldValue.serverTimestamp(), // Guaranteed server time
        });

        // 2. If it's RFID, automatically deduct from student balance
        if (modeOfPayment === "RFID" && studentId) {
            const studentRef = db.collection("students").doc(studentId);
            batch.update(studentRef, {
                balance: FieldValue.increment(-totalAmount)
            });
        }

        await batch.commit();
        console.log(`Successfully logged transaction: ${event.params.saleId}`);
    } catch (error) {
        console.error("Automation error:", error);
    }
});