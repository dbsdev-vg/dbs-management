'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) setError(error.message)
        else router.push('/')

        setLoading(false)
    }

    const handleForgotPassword = () => {
        // TODO: implement forgot password flow
    }

    return (
        <div className="min-h-screen flex flex-col justify-between bg-background px-4 py-8">
            <div />

            <Card className="w-full max-w-md mx-auto p-6 transition-all duration-300 hover:shadow-red-500/20 hover:shadow-xl border border-border">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                        <Logo size="md" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">DBS Management</h1>
                    <p className="text-muted-foreground text-sm">Controle financeiro inteligente</p>
                </div>

                <form onSubmit={handleSignIn} noValidate>
                    {/* Email */}
                    <div className="relative">
                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-10"
                        />
                        <FontAwesomeIcon
                            icon={faEnvelope}
                            className="absolute left-3 top-10 text-muted-foreground/90 text-sm"
                        />
                    </div>

                    {/* Password */}
                    <div className="relative mt-4">
                        <Input
                            label="Senha"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="pl-10"
                        />
                        <FontAwesomeIcon
                            icon={faLock}
                            className="absolute left-3 top-10 text-muted-foreground/90 text-sm"
                        />
                    </div>

                    {/* Forgot password */}
                    <div className="flex justify-end mt-2 mb-4">
                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-xs text-muted-foreground hover:text-expense transition-colors"
                        >
                            Esqueceu sua senha?
                        </button>
                    </div>

                    {/* Error message — reserved space prevents layout shift */}
                    <div className="mb-4 min-h-[40px]">
                        {error && (
                            <div className="p-3 bg-expense/15 border border-expense/40 text-expense/90 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    <Button type="submit" fullWidth loading={loading}>
                        Entrar
                    </Button>
                </form>

                <div className="mt-6 text-center text-xs text-muted-foreground/70">
                    Segurança e praticidade para seu negócio
                </div>
            </Card>

            <footer className="text-center text-muted-foreground/90 text-sm mt-8">
                Desenvolvido por DBS Studios
            </footer>
        </div>
    )
}