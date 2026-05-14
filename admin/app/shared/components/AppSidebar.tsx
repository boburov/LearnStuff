import Image from "next/image"
import logo from "@/public/logo.jpeg"
import { BookDashed, Home } from "lucide-react"

const routes = [
    {
        label: "bosh",
        icon: Home,
        paht: '/'
    },
    {
        label: "Dashboard",
        icon: BookDashed,
        paht: '/'
    },
]

const AppSidebar = () => {
    return (
        <header className="p-5 border-r-1 rounded-r-3xl max-w-72 min-h-screen border-gray-300 bg-[var(--main-color)]">
            <section className="flex items-center gap-2">
                <Image src={logo} alt="LearnStuff Logo" className="w-10 h-10 rounded-sm" />

                <section>
                    <h1 className="font-bold leading-3">LearnStuff</h1>
                    <span className="leading-3">Hello There.</span>
                </section>

            </section>

            {routes.map((route, index) => {
                const Icon = route.icon  // Katta harf bilan — muhim!
                return (
                    <section key={index} className="flex items-center gap-2 p-2">
                        <Icon size={20} />
                        <h1>{route.label}</h1>
                    </section>
                )
            })}
            
        </header>
    )
}

export default AppSidebar
