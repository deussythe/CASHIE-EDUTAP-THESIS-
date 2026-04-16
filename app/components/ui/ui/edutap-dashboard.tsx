import { Button } from "./button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card"

export interface User {
    username: string
    role: string
}

interface EduTapDashboardProps {
    user: User | null
    onBack: () => void
    onLogout: () => void
}

export function EduTapDashboard({ user, onBack, onLogout }: EduTapDashboardProps) {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>EduTap Dashboard</CardTitle>
                    <CardDescription>Welcome back, {user?.username || "User"}!</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="rounded-lg bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-500">Role</p>
                            <p className="text-lg font-semibold capitalize">{user?.role || "Guest"}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-500">Status</p>
                            <p className="text-lg font-semibold text-green-600">Active</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={onBack}>
                        Back to POS
                    </Button>
                    <Button variant="destructive" onClick={onLogout}>
                        Logout
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
