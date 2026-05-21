import { InstanceProvider, useInstances } from './context/InstanceContext'
import InstanceSetup from './components/InstanceSetup'
import AppShell from './components/layout/AppShell'

function AppContent() {
    const { instances } = useInstances()
    return instances.length === 0 ? <InstanceSetup /> : <AppShell />
}

export default function App() {
    return (
        <InstanceProvider>
            <AppContent />
        </InstanceProvider>
    )
}
