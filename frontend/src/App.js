import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Dashboard from "@/pages/Dashboard";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                </Routes>
            </BrowserRouter>
            <Toaster
                theme="dark"
                position="top-right"
                toastOptions={{
                    style: {
                        background: "#0A0A0A",
                        border: "1px solid #2F3336",
                        borderRadius: 0,
                        color: "#E0E6ED",
                        fontFamily: "JetBrains Mono, monospace",
                    },
                }}
            />
        </div>
    );
}

export default App;
