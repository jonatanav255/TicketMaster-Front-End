import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { JoinPage } from "./queue/JoinPage"
import { WaitingRoom } from "./queue/WaitingRoom"
import { AdmittedPage } from "./admitted/AdmittedPage"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route path="/queue/:eventId" element={<WaitingRoom />} />
        <Route path="/in/:eventId" element={<AdmittedPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
