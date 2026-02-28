'use client'

import { ToastProvider } from '@/components/ui/toast'
import { ModalProvider } from '@/components/ui/modal'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ToastProvider>
            <ModalProvider>
                {children}
            </ModalProvider>
        </ToastProvider>
    )
}
