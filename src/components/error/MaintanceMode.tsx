import React from 'react'
import MaitanceImage from "@/assets/under_maintenance.svg"
import Image from 'next/image'
import { useTheme } from "next-themes"
import { useTintedSvg } from "@/utils/useTintedSvg"

// The illustration bakes the old brand green and a fixed dark/white palette,
// so it is re-tinted from tokens at runtime.
const TINT = {
    "#55AE7B": "--brand-foreground-default",
    "#263238": "--foreground-primary",
    "#121418": "--foreground-primary",
    "#FFFFFF": "--surface-default",
}

export interface MaintanceModeProps {
    message?: string;
}

const MaintanceMode = ({ message }: MaintanceModeProps) => {
    const { theme } = useTheme()
    const image = useTintedSvg(MaitanceImage, TINT, theme)

    return (
        <section className="h-screen w-screen flex items-center justify-center">
            <div className='flex flex-col items-center justify-center gap-2 text-center md:w-1/3 w-full'>
                <Image src={image!} alt='Under maintenance illustration' height={400} width={400} unoptimized className='h-full w-full' />
                <h2 className='text-3xl font-bold text-[var(--foreground-primary)]'>{message}</h2>
            </div>
        </section>
    )
}

export default MaintanceMode
