"use client"

import { useState, useEffect } from "react"
import CreationForm from "./CreationForm"
import Dashboard from "./Dashboard"
import { warmupBackend } from "@/lib/apiService"

export default function Page() {
    const [currentView, setCurrentView] = useState("form") // "form" or "dashboard"

    useEffect(() => {
        // Warm up the backend API asynchronously on page mount
        warmupBackend()
    }, [])

    if (currentView === "dashboard") {
        return <Dashboard onViewForm={() => setCurrentView("form")} />
    }

    return <CreationForm onViewDashboard={() => setCurrentView("dashboard")} />
}