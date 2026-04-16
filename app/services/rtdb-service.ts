import { rtdb } from "@/configs/firebase";
import { ref, push, set } from "firebase/database";

export const recordTransaction = async (studentId: string, amount: number) => {
    const tapsRef = ref(rtdb, "taps");
    const newTapRef = push(tapsRef);
    return await set(newTapRef, {
        studentId,
        amount,
        timestamp: new Date().toLocaleString(),
    });
};